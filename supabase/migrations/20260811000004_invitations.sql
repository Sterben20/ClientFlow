-- Migration: Add Workspace Invitations

CREATE TABLE workspace_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role membership_role NOT NULL DEFAULT 'member',
    token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
    UNIQUE(workspace_id, email)
);

ALTER TABLE workspace_invitations ENABLE ROW LEVEL SECURITY;

-- 1. Admins and Owners can view all invitations for their workspace
CREATE POLICY "Admins can view invitations" 
  ON workspace_invitations FOR SELECT 
  USING (has_workspace_admin_access(workspace_id));

-- 2. Admins and Owners can create invitations
CREATE POLICY "Admins can insert invitations" 
  ON workspace_invitations FOR INSERT 
  WITH CHECK (has_workspace_admin_access(workspace_id));

-- 3. Admins and Owners can delete invitations
CREATE POLICY "Admins can delete invitations" 
  ON workspace_invitations FOR DELETE 
  USING (has_workspace_admin_access(workspace_id));

-- Function to get invitation details securely without exposing the whole table
CREATE OR REPLACE FUNCTION get_invitation_details(invite_token UUID)
RETURNS TABLE (
    id UUID,
    workspace_id UUID,
    workspace_name TEXT,
    email TEXT,
    role membership_role,
    expires_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT i.id, i.workspace_id, w.name, i.email, i.role, i.expires_at
    FROM workspace_invitations i
    JOIN workspaces w ON w.id = i.workspace_id
    WHERE i.token = invite_token AND i.expires_at > NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to accept an invitation securely bypassing RLS
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

    -- Insert into memberships
    INSERT INTO memberships (workspace_id, profile_id, role)
    VALUES (v_workspace_id, v_user_id, v_invite.role);

    -- Delete the used invitation
    DELETE FROM workspace_invitations WHERE id = v_invite.id;

    RETURN v_workspace_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
