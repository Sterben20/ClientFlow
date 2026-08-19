-- Migration: Security Hardening (Sprint 1.1)
-- 1. Role Escalation Protection
-- 2. project_members Security
-- 3. activities.actor_id Security
-- 4. Immutable workspace_id

-- 1. ROLE ESCALATION PROTECTION
-- Prevent an admin from updating a membership to 'owner', or removing the last 'owner'.
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

  IF TG_OP = 'UPDATE' THEN
    -- Prevent changing someone to owner if current user is not an owner
    IF NEW.role = 'owner' AND OLD.role != 'owner' AND current_user_role != 'owner' THEN
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_prevent_role_escalation ON public.memberships;
CREATE TRIGGER tr_prevent_role_escalation
  BEFORE UPDATE OR DELETE ON public.memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_escalation();


-- 2. PROJECT_MEMBERS SECURITY
-- Ensure profile_id being inserted actually belongs to the workspace of the project
DROP POLICY IF EXISTS "Members can insert project_members" ON public.project_members;
CREATE POLICY "Members can insert project_members" ON public.project_members FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.memberships m ON p.workspace_id = m.workspace_id
    WHERE p.id = project_members.project_id 
      AND m.profile_id = project_members.profile_id
      AND has_workspace_access(p.workspace_id)
  )
);

DROP POLICY IF EXISTS "Members can update project_members" ON public.project_members;
CREATE POLICY "Members can update project_members" ON public.project_members FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.memberships m ON p.workspace_id = m.workspace_id
    WHERE p.id = project_members.project_id 
      AND m.profile_id = project_members.profile_id
      AND has_workspace_access(p.workspace_id)
  )
);


-- 3. ACTIVITIES.ACTOR_ID SECURITY
-- Ensure actor_id is the authenticated user
ALTER TABLE public.activities DROP CONSTRAINT IF EXISTS activities_actor_id_check;
ALTER TABLE public.activities ADD CONSTRAINT activities_actor_id_check CHECK (actor_id = auth.uid());


-- 4. IMMUTABLE WORKSPACE_ID
-- Prevent workspace_id from being changed on UPDATE
CREATE OR REPLACE FUNCTION public.prevent_workspace_id_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.workspace_id != OLD.workspace_id THEN
    RAISE EXCEPTION 'workspace_id is immutable and cannot be changed.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_immutable_workspace_id_clients ON public.clients;
CREATE TRIGGER tr_immutable_workspace_id_clients BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.prevent_workspace_id_update();

DROP TRIGGER IF EXISTS tr_immutable_workspace_id_projects ON public.projects;
CREATE TRIGGER tr_immutable_workspace_id_projects BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.prevent_workspace_id_update();

DROP TRIGGER IF EXISTS tr_immutable_workspace_id_deals ON public.deals;
CREATE TRIGGER tr_immutable_workspace_id_deals BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION public.prevent_workspace_id_update();

DROP TRIGGER IF EXISTS tr_immutable_workspace_id_tasks ON public.tasks;
CREATE TRIGGER tr_immutable_workspace_id_tasks BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.prevent_workspace_id_update();

DROP TRIGGER IF EXISTS tr_immutable_workspace_id_notes ON public.notes;
CREATE TRIGGER tr_immutable_workspace_id_notes BEFORE UPDATE ON public.notes FOR EACH ROW EXECUTE FUNCTION public.prevent_workspace_id_update();

DROP TRIGGER IF EXISTS tr_immutable_workspace_id_activities ON public.activities;
CREATE TRIGGER tr_immutable_workspace_id_activities BEFORE UPDATE ON public.activities FOR EACH ROW EXECUTE FUNCTION public.prevent_workspace_id_update();
