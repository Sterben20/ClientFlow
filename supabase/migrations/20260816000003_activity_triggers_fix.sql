-- Migration: Sprint 2.5 Fix - Ensure Triggers and Functions Exist
-- Re-creates functions and re-attaches all activity triggers in case they were missed during the initial schema run

-- 1. DROP EXISTING TRIGGERS
DROP TRIGGER IF EXISTS on_client_activity ON public.clients;
DROP TRIGGER IF EXISTS on_project_activity ON public.projects;
DROP TRIGGER IF EXISTS on_task_activity ON public.tasks;
DROP TRIGGER IF EXISTS on_client_note_activity ON public.client_notes;
DROP TRIGGER IF EXISTS on_membership_activity ON public.memberships;

-- 2. CREATE FUNCTIONS
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

-- B. PROJECTS TRIGGER (with metadata parent)
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
        VALUES (OLD.workspace_id, v_actor_id, 'project', OLD.id, 'project.deleted', jsonb_build_object('name', OLD.name, 'client_id', OLD.client_id));
    END IF;

    RETURN NULL;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.handle_project_activity() FROM PUBLIC;

-- C. TASKS TRIGGER (with metadata parents)
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
        VALUES (OLD.workspace_id, v_actor_id, 'task', OLD.id, 'task.deleted', jsonb_build_object('title', OLD.title, 'project_id', OLD.project_id, 'client_id', OLD.client_id));
    END IF;

    RETURN NULL;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.handle_task_activity() FROM PUBLIC;

-- D. CLIENT NOTES TRIGGER (with metadata parent)
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
        SELECT workspace_id INTO v_workspace_id FROM public.clients WHERE id = NEW.client_id;
        INSERT INTO public.activities (workspace_id, actor_id, entity_type, entity_id, action)
        VALUES (v_workspace_id, v_actor_id, 'note', NEW.id, 'note.created');
    ELSIF TG_OP = 'DELETE' THEN
        SELECT workspace_id INTO v_workspace_id FROM public.clients WHERE id = OLD.client_id;
        v_content_preview := substring(OLD.content from 1 for 100);
        INSERT INTO public.activities (workspace_id, actor_id, entity_type, entity_id, action, metadata)
        VALUES (v_workspace_id, v_actor_id, 'note', OLD.id, 'note.deleted', jsonb_build_object('content_preview', v_content_preview, 'client_id', OLD.client_id));
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
    IF v_actor_id IS NULL THEN
        IF current_setting('app.trusted_provisioning', true) = 'true' THEN
            RETURN NULL;
        ELSE
            RAISE EXCEPTION 'Actor ID cannot be null for membership activity outside of trusted provisioning';
        END IF;
    END IF;

    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.activities (workspace_id, actor_id, entity_type, entity_id, action)
        VALUES (NEW.workspace_id, v_actor_id, 'member', NEW.profile_id, 'member.added');
    ELSIF TG_OP = 'DELETE' THEN
        SELECT full_name INTO v_member_name FROM public.profiles WHERE id = OLD.profile_id;
        INSERT INTO public.activities (workspace_id, actor_id, entity_type, entity_id, action, metadata)
        VALUES (OLD.workspace_id, v_actor_id, 'member', OLD.profile_id, 'member.removed', jsonb_build_object('name', COALESCE(v_member_name, 'Unknown User')));
    END IF;

    RETURN NULL;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.handle_membership_activity() FROM PUBLIC;

-- 3. ATTACH TRIGGERS
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
