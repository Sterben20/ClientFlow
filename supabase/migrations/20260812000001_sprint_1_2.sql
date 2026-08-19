-- Migration: Final Multi-Tenant Security Fixes (Sprint 1.2)
-- 1. Prevent Admin -> Owner Membership Insert/Update
-- 2. Harden SECURITY DEFINER functions (search_path, permissions)
-- 3. Invitation Security (email-bound case-insensitive)

-- 1. ROLE ESCALATION PROTECTION (MEMBERSHIPS)
-- Modifying prevent_role_escalation to also handle INSERT.
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
    -- Admin cannot insert owner
    IF NEW.role = 'owner' AND (current_user_role IS NULL OR current_user_role != 'owner') THEN
      RAISE EXCEPTION 'Role escalation: Only owners can invite members as owner.';
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Prevent changing someone to owner if current user is not an owner
    IF NEW.role = 'owner' AND OLD.role != 'owner' AND (current_user_role IS NULL OR current_user_role != 'owner') THEN
      RAISE EXCEPTION 'Role escalation: Only owners can promote members to owner.';
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

DROP TRIGGER IF EXISTS tr_prevent_role_escalation ON public.memberships;
CREATE TRIGGER tr_prevent_role_escalation
  BEFORE INSERT OR UPDATE OR DELETE ON public.memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_escalation();


-- 1b. ROLE ESCALATION PROTECTION (INVITATIONS)
-- Prevent an admin from inserting/updating an invitation to 'owner'
CREATE OR REPLACE FUNCTION public.prevent_invitation_role_escalation()
RETURNS TRIGGER AS $$
DECLARE
  current_user_role public.membership_role;
BEGIN
  -- Get the current user's role in this workspace
  SELECT role INTO current_user_role
  FROM public.memberships
  WHERE workspace_id = NEW.workspace_id
    AND profile_id = auth.uid();

  IF NEW.role = 'owner' AND (current_user_role IS NULL OR current_user_role != 'owner') THEN
    RAISE EXCEPTION 'Role escalation: Only owners can invite members as owner.';
  END IF;

  -- Normalize email to lowercase
  NEW.email := LOWER(NEW.email);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

DROP TRIGGER IF EXISTS tr_prevent_invitation_role_escalation ON public.workspace_invitations;
CREATE TRIGGER tr_prevent_invitation_role_escalation
  BEFORE INSERT OR UPDATE ON public.workspace_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_invitation_role_escalation();


-- 2. HARDEN SECURITY DEFINER FUNCTIONS

-- get_invitation_details
CREATE OR REPLACE FUNCTION public.get_invitation_details(invite_token UUID)
RETURNS TABLE (
    id UUID,
    workspace_id UUID,
    workspace_name TEXT,
    email TEXT,
    role public.membership_role,
    expires_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT i.id, i.workspace_id, w.name, i.email, i.role, i.expires_at
    FROM public.workspace_invitations i
    JOIN public.workspaces w ON w.id = i.workspace_id
    WHERE i.token = invite_token AND i.expires_at > NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE EXECUTE ON FUNCTION public.get_invitation_details(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_invitation_details(UUID) TO authenticated, anon;


-- accept_invitation
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

REVOKE EXECUTE ON FUNCTION public.accept_invitation(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_invitation(UUID) TO authenticated;
