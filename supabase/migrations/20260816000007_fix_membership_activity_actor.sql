-- Migration: Sprint 2.5 Fix Membership Activity Actor
-- Ensures that when a member accepts an invitation, the inviter (actor) is correctly attributed in the timeline.

-- 1. Update accept_invitation to pass the inviter context
CREATE OR REPLACE FUNCTION accept_invitation(invite_token UUID)
RETURNS UUID AS $$
DECLARE
    v_invite RECORD;
    v_user_id UUID;
    v_workspace_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Find the valid invitation
    SELECT * INTO v_invite
    FROM workspace_invitations
    WHERE token = invite_token AND expires_at > NOW();

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid or expired invitation';
    END IF;

    v_workspace_id := v_invite.workspace_id;

    -- Check if user is already a member
    IF EXISTS (SELECT 1 FROM memberships WHERE workspace_id = v_workspace_id AND profile_id = v_user_id) THEN
        -- Delete invitation since they are already in
        DELETE FROM workspace_invitations WHERE id = v_invite.id;
        RETURN v_workspace_id;
    END IF;

    -- Set the inviter as the actor for the trigger
    IF v_invite.invited_by IS NOT NULL THEN
        PERFORM set_config('app.current_actor', v_invite.invited_by::text, true);
    END IF;

    -- Insert into memberships
    INSERT INTO memberships (workspace_id, profile_id, role)
    VALUES (v_workspace_id, v_user_id, v_invite.role);

    -- Clear the config
    IF v_invite.invited_by IS NOT NULL THEN
        PERFORM set_config('app.current_actor', '', true);
    END IF;

    -- Delete the used invitation
    DELETE FROM workspace_invitations WHERE id = v_invite.id;

    RETURN v_workspace_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update handle_membership_activity to use the override if present
CREATE OR REPLACE FUNCTION public.handle_membership_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_override_actor TEXT;
    v_member_name TEXT;
    v_member_email TEXT;
BEGIN
    -- Check for override actor from accept_invitation
    BEGIN
        v_override_actor := current_setting('app.current_actor', true);
    EXCEPTION WHEN OTHERS THEN
        v_override_actor := NULL;
    END;

    IF v_override_actor IS NOT NULL AND v_override_actor != '' THEN
        v_actor_id := v_override_actor::UUID;
    END IF;

    IF v_actor_id IS NULL THEN
        IF current_setting('app.trusted_provisioning', true) = 'true' THEN
            RETURN NULL;
        ELSE
            RAISE EXCEPTION 'Actor ID cannot be null for membership activity outside of trusted provisioning';
        END IF;
    END IF;

    IF TG_OP = 'INSERT' THEN
        SELECT full_name, email INTO v_member_name, v_member_email FROM public.profiles WHERE id = NEW.profile_id;
        INSERT INTO public.activities (workspace_id, actor_id, entity_type, entity_id, action, metadata)
        VALUES (NEW.workspace_id, v_actor_id, 'member', NEW.profile_id, 'member.added', jsonb_build_object('member_id', NEW.profile_id, 'member_name', COALESCE(v_member_name, 'Unknown User'), 'member_email', v_member_email));
    ELSIF TG_OP = 'DELETE' THEN
        SELECT full_name, email INTO v_member_name, v_member_email FROM public.profiles WHERE id = OLD.profile_id;
        INSERT INTO public.activities (workspace_id, actor_id, entity_type, entity_id, action, metadata)
        VALUES (OLD.workspace_id, v_actor_id, 'member', OLD.profile_id, 'member.removed', jsonb_build_object('member_id', OLD.profile_id, 'member_name', COALESCE(v_member_name, 'Unknown User'), 'member_email', v_member_email));
    END IF;

    RETURN NULL;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.handle_membership_activity() FROM PUBLIC;
