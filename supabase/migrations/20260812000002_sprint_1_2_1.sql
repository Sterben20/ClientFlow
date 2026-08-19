-- Migration: Final Membership Security Fixes (Sprint 1.2.1)
-- 1. Eliminate owner invitations.
-- 2. Restrict owner role to promotion of existing members by existing owners.
-- 3. Fail-closed trusted provisioning path for handle_new_user().

-- 1. Redefine handle_new_user to securely flag the trusted provisioning context
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  new_workspace_id UUID;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  
  -- Create personal workspace for the user
  INSERT INTO public.workspaces (name)
  VALUES (COALESCE(new.raw_user_meta_data->>'full_name', 'My') || ' Workspace')
  RETURNING id INTO new_workspace_id;
  
  -- SET TRUSTED PROVISIONING FLAG
  -- This is a transaction-local setting that cannot be forged by PostgREST
  -- because it is executed via a database trigger that runs outside the API context.
  PERFORM set_config('app.trusted_provisioning', 'true', true);
  
  -- Assign user as owner of their new workspace
  INSERT INTO public.memberships (workspace_id, profile_id, role)
  VALUES (new_workspace_id, new.id, 'owner');
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Update Membership Escalation Trigger
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER AS $$
DECLARE
  current_user_role public.membership_role;
  owner_count INT;
BEGIN
  -- Get the current user's role in this workspace
  SELECT role INTO current_user_role
  FROM public.memberships
  WHERE workspace_id = COALESCE(NEW.workspace_id, OLD.workspace_id)
    AND profile_id = auth.uid();

  -- Prevent members from creating/updating memberships entirely (safety net)
  IF current_user_role = 'member' THEN
    RAISE EXCEPTION 'Members cannot modify memberships.';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.role = 'owner' THEN
      -- STRICT FAIL-CLOSED TRUSTED PROVISIONING CHECK
      -- 1. API requests (authenticated/anon) ALWAYS fail.
      -- 2. Internal contexts without the explicit trusted flag ALWAYS fail.
      -- 3. Only handle_new_user() internal execution can pass.
      IF auth.role() IS NOT NULL OR current_setting('app.trusted_provisioning', true) IS DISTINCT FROM 'true' THEN
        RAISE EXCEPTION 'Cannot insert owner directly. Owners must be promoted from existing members.';
      END IF;
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Prevent changing someone to owner if current user is not an owner
    IF NEW.role = 'owner' AND OLD.role != 'owner' THEN
      IF current_user_role IS NULL OR current_user_role != 'owner' THEN
        RAISE EXCEPTION 'Role escalation: Only owners can promote members to owner.';
      END IF;
      -- Cannot self-promote
      IF NEW.profile_id = auth.uid() THEN
        RAISE EXCEPTION 'Role escalation: You cannot promote yourself to owner.';
      END IF;
    END IF;
  END IF;

  IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.role = 'owner' AND NEW.role != 'owner') THEN
    -- Check if we are removing an owner
    IF OLD.role = 'owner' THEN
      SELECT COUNT(*) INTO owner_count
      FROM public.memberships
      WHERE workspace_id = OLD.workspace_id AND role = 'owner';

      IF owner_count <= 1 THEN
        RAISE EXCEPTION 'Cannot remove or demote the last owner of a workspace.';
      END IF;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';


-- 3. Update Invitation Role Escalation Trigger
CREATE OR REPLACE FUNCTION public.prevent_invitation_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
  -- Unconditionally reject owner invitations at the database level
  IF NEW.role = 'owner' THEN
    RAISE EXCEPTION 'Role escalation: Owners can only be granted to existing workspace members.';
  END IF;

  -- Normalize email to lowercase
  NEW.email := LOWER(NEW.email);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';


-- 4. Update accept_invitation function
CREATE OR REPLACE FUNCTION public.accept_invitation(invite_token UUID)
RETURNS UUID AS $$
DECLARE
    v_invite RECORD;
    v_user_id UUID;
    v_user_email TEXT;
    v_workspace_id UUID;
BEGIN
    v_user_id := auth.uid();
    -- Extract email from JWT for secure validation
    v_user_email := auth.jwt()->>'email';
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Find the valid invitation
    SELECT * INTO v_invite
    FROM public.workspace_invitations
    WHERE token = invite_token AND expires_at > NOW();

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid or expired invitation';
    END IF;
    
    -- Absolute safeguard against legacy owner invitations
    IF v_invite.role = 'owner' THEN
        RAISE EXCEPTION 'Owner invitations are no longer allowed.';
    END IF;

    -- Enforce Email-Bound Invitation
    IF LOWER(v_invite.email) != LOWER(v_user_email) THEN
        RAISE EXCEPTION 'You can only accept invitations sent to your email address.';
    END IF;

    v_workspace_id := v_invite.workspace_id;

    -- Check if user is already a member
    IF EXISTS (SELECT 1 FROM public.memberships WHERE workspace_id = v_workspace_id AND profile_id = v_user_id) THEN
        -- Delete invitation since they are already in
        DELETE FROM public.workspace_invitations WHERE id = v_invite.id;
        RETURN v_workspace_id;
    END IF;

    -- Insert into memberships
    INSERT INTO public.memberships (workspace_id, profile_id, role)
    VALUES (v_workspace_id, v_user_id, v_invite.role);

    -- Delete the used invitation
    DELETE FROM public.workspace_invitations WHERE id = v_invite.id;

    RETURN v_workspace_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
