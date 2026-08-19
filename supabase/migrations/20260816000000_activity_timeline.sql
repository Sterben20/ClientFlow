-- Migration: Sprint 2.5 Activity Timeline & CRM History
-- 1. Create activities table
-- 2. Define RLS policies
-- 3. Create security definer trigger functions
-- 4. Attach triggers to business tables

-- 1. CREATE ACTIVITIES TABLE
CREATE TABLE IF NOT EXISTS public.activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('client', 'project', 'task', 'note', 'member')),
    entity_id UUID NOT NULL,
    action TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS activities_workspace_created_at_idx ON public.activities(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS activities_workspace_entity_created_at_idx ON public.activities(workspace_id, entity_type, entity_id, created_at DESC);

-- 2. RLS POLICIES
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view activities in their workspace"
ON public.activities FOR SELECT
TO authenticated
USING (public.has_workspace_access(workspace_id));

-- INSERT, UPDATE, DELETE are denied for authenticated users by default (no policies)
-- The only way to insert is through the SECURITY DEFINER triggers

-- 3. TRIGGER FUNCTIONS

-- A. CLIENTS TRIGGER
CREATE OR REPLACE FUNCTION public.handle_client_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_actor_id UUID := auth.uid();
BEGIN
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Actor ID cannot be null for client activity';
    END IF;

    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.activities (workspace_id, actor_id, entity_type, entity_id, action)
        VALUES (NEW.workspace_id, v_actor_id, 'client', NEW.id, 'client.created');
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO public.activities (workspace_id, actor_id, entity_type, entity_id, action, metadata)
        VALUES (OLD.workspace_id, v_actor_id, 'client', OLD.id, 'client.deleted', jsonb_build_object('name', OLD.name));
    END IF;

    RETURN NULL;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.handle_client_activity() FROM PUBLIC;

-- B. PROJECTS TRIGGER
CREATE OR REPLACE FUNCTION public.handle_project_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_actor_id UUID := auth.uid();
BEGIN
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Actor ID cannot be null for project activity';
    END IF;

    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.activities (workspace_id, actor_id, entity_type, entity_id, action)
        VALUES (NEW.workspace_id, v_actor_id, 'project', NEW.id, 'project.created');
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            INSERT INTO public.activities (workspace_id, actor_id, entity_type, entity_id, action, metadata)
            VALUES (NEW.workspace_id, v_actor_id, 'project', NEW.id, 'project.status_changed', jsonb_build_object('previous_status', OLD.status, 'new_status', NEW.status));
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO public.activities (workspace_id, actor_id, entity_type, entity_id, action, metadata)
        VALUES (OLD.workspace_id, v_actor_id, 'project', OLD.id, 'project.deleted', jsonb_build_object('name', OLD.name));
    END IF;

    RETURN NULL;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.handle_project_activity() FROM PUBLIC;

-- C. TASKS TRIGGER
CREATE OR REPLACE FUNCTION public.handle_task_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_actor_id UUID := auth.uid();
BEGIN
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Actor ID cannot be null for task activity';
    END IF;

    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.activities (workspace_id, actor_id, entity_type, entity_id, action)
        VALUES (NEW.workspace_id, v_actor_id, 'task', NEW.id, 'task.created');
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            INSERT INTO public.activities (workspace_id, actor_id, entity_type, entity_id, action, metadata)
            VALUES (NEW.workspace_id, v_actor_id, 'task', NEW.id, 'task.status_changed', jsonb_build_object('previous_status', OLD.status, 'new_status', NEW.status));
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO public.activities (workspace_id, actor_id, entity_type, entity_id, action, metadata)
        VALUES (OLD.workspace_id, v_actor_id, 'task', OLD.id, 'task.deleted', jsonb_build_object('title', OLD.title));
    END IF;

    RETURN NULL;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.handle_task_activity() FROM PUBLIC;

-- D. CLIENT NOTES TRIGGER
CREATE OR REPLACE FUNCTION public.handle_client_note_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_workspace_id UUID;
    v_content_preview TEXT;
BEGIN
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Actor ID cannot be null for client note activity';
    END IF;

    IF TG_OP = 'INSERT' THEN
        -- Need to get the workspace_id from the client
        SELECT workspace_id INTO v_workspace_id FROM public.clients WHERE id = NEW.client_id;
        INSERT INTO public.activities (workspace_id, actor_id, entity_type, entity_id, action)
        VALUES (v_workspace_id, v_actor_id, 'note', NEW.id, 'note.created');
    ELSIF TG_OP = 'DELETE' THEN
        -- Need to get the workspace_id from the client
        SELECT workspace_id INTO v_workspace_id FROM public.clients WHERE id = OLD.client_id;
        
        -- Create a content preview for the timeline
        v_content_preview := substring(OLD.content from 1 for 100);
        
        INSERT INTO public.activities (workspace_id, actor_id, entity_type, entity_id, action, metadata)
        VALUES (v_workspace_id, v_actor_id, 'note', OLD.id, 'note.deleted', jsonb_build_object('content_preview', v_content_preview));
    END IF;

    RETURN NULL;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.handle_client_note_activity() FROM PUBLIC;

-- E. MEMBERSHIPS TRIGGER
CREATE OR REPLACE FUNCTION public.handle_membership_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_member_name TEXT;
BEGIN
    -- Actor NULL Policy & Provisioning
    IF v_actor_id IS NULL THEN
        IF current_setting('app.trusted_provisioning', true) = 'true' THEN
            -- Skip silently if this is trusted system provisioning (e.g. handle_new_user)
            RETURN NULL;
        ELSE
            -- Fail closed otherwise
            RAISE EXCEPTION 'Actor ID cannot be null for membership activity outside of trusted provisioning';
        END IF;
    END IF;

    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.activities (workspace_id, actor_id, entity_type, entity_id, action)
        VALUES (NEW.workspace_id, v_actor_id, 'member', NEW.profile_id, 'member.added');
    ELSIF TG_OP = 'DELETE' THEN
        -- Get member's name for metadata
        SELECT full_name INTO v_member_name FROM public.profiles WHERE id = OLD.profile_id;
        
        INSERT INTO public.activities (workspace_id, actor_id, entity_type, entity_id, action, metadata)
        VALUES (OLD.workspace_id, v_actor_id, 'member', OLD.profile_id, 'member.removed', jsonb_build_object('name', COALESCE(v_member_name, 'Unknown User')));
    END IF;

    RETURN NULL;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.handle_membership_activity() FROM PUBLIC;

-- 4. ATTACH TRIGGERS

CREATE TRIGGER on_client_activity
    AFTER INSERT OR DELETE ON public.clients
    FOR EACH ROW EXECUTE FUNCTION public.handle_client_activity();

CREATE TRIGGER on_project_activity
    AFTER INSERT OR UPDATE OF status OR DELETE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION public.handle_project_activity();

CREATE TRIGGER on_task_activity
    AFTER INSERT OR UPDATE OF status OR DELETE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION public.handle_task_activity();

CREATE TRIGGER on_client_note_activity
    AFTER INSERT OR DELETE ON public.client_notes
    FOR EACH ROW EXECUTE FUNCTION public.handle_client_note_activity();

CREATE TRIGGER on_membership_activity
    AFTER INSERT OR DELETE ON public.memberships
    FOR EACH ROW EXECUTE FUNCTION public.handle_membership_activity();
