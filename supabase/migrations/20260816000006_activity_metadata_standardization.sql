-- Migration: Sprint 2.5 Activity System Hardening
-- Standardizes all trigger functions to strictly follow the canonical metadata contract.

-- 1. DROP EXISTING TRIGGERS
DROP TRIGGER IF EXISTS on_client_activity ON public.clients;
DROP TRIGGER IF EXISTS on_project_activity ON public.projects;
DROP TRIGGER IF EXISTS on_task_activity ON public.tasks;
DROP TRIGGER IF EXISTS on_client_note_activity ON public.client_notes;
DROP TRIGGER IF EXISTS on_membership_activity ON public.memberships;

-- 2. CREATE FUNCTIONS

-- A. CLIENTS
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
        INSERT INTO public.activities (workspace_id, actor_id, entity_type, entity_id, action, metadata)
        VALUES (NEW.workspace_id, v_actor_id, 'client', NEW.id, 'client.created', jsonb_build_object('name', NEW.name));
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO public.activities (workspace_id, actor_id, entity_type, entity_id, action, metadata)
        VALUES (OLD.workspace_id, v_actor_id, 'client', OLD.id, 'client.deleted', jsonb_build_object('name', OLD.name));
    END IF;

    RETURN NULL;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.handle_client_activity() FROM PUBLIC;

-- B. PROJECTS
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
        INSERT INTO public.activities (workspace_id, actor_id, entity_type, entity_id, action, metadata)
        VALUES (NEW.workspace_id, v_actor_id, 'project', NEW.id, 'project.created', jsonb_build_object('name', NEW.name, 'client_id', NEW.client_id));
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            INSERT INTO public.activities (workspace_id, actor_id, entity_type, entity_id, action, metadata)
            VALUES (NEW.workspace_id, v_actor_id, 'project', NEW.id, 'project.status_changed', jsonb_build_object('name', NEW.name, 'client_id', NEW.client_id, 'previous_status', OLD.status, 'new_status', NEW.status));
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO public.activities (workspace_id, actor_id, entity_type, entity_id, action, metadata)
        VALUES (OLD.workspace_id, v_actor_id, 'project', OLD.id, 'project.deleted', jsonb_build_object('name', OLD.name, 'client_id', OLD.client_id));
    END IF;

    RETURN NULL;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.handle_project_activity() FROM PUBLIC;

-- C. TASKS
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
        INSERT INTO public.activities (workspace_id, actor_id, entity_type, entity_id, action, metadata)
        VALUES (NEW.workspace_id, v_actor_id, 'task', NEW.id, 'task.created', jsonb_build_object('title', NEW.title, 'project_id', NEW.project_id, 'client_id', NEW.client_id));
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            INSERT INTO public.activities (workspace_id, actor_id, entity_type, entity_id, action, metadata)
            VALUES (NEW.workspace_id, v_actor_id, 'task', NEW.id, 'task.status_changed', jsonb_build_object('title', NEW.title, 'project_id', NEW.project_id, 'client_id', NEW.client_id, 'previous_status', OLD.status, 'new_status', NEW.status));
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO public.activities (workspace_id, actor_id, entity_type, entity_id, action, metadata)
        VALUES (OLD.workspace_id, v_actor_id, 'task', OLD.id, 'task.deleted', jsonb_build_object('title', OLD.title, 'project_id', OLD.project_id, 'client_id', OLD.client_id));
    END IF;

    RETURN NULL;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.handle_task_activity() FROM PUBLIC;

-- D. CLIENT NOTES
CREATE OR REPLACE FUNCTION public.handle_client_note_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_content_preview TEXT;
BEGIN
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Actor ID cannot be null for client note activity';
    END IF;

    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.activities (workspace_id, actor_id, entity_type, entity_id, action, metadata)
        VALUES (NEW.workspace_id, v_actor_id, 'note', NEW.id, 'note.created', jsonb_build_object('client_id', NEW.client_id));
    ELSIF TG_OP = 'DELETE' THEN
        v_content_preview := substring(OLD.content from 1 for 100);
        INSERT INTO public.activities (workspace_id, actor_id, entity_type, entity_id, action, metadata)
        VALUES (OLD.workspace_id, v_actor_id, 'note', OLD.id, 'note.deleted', jsonb_build_object('client_id', OLD.client_id, 'content_preview', v_content_preview));
    END IF;

    RETURN NULL;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.handle_client_note_activity() FROM PUBLIC;

-- E. MEMBERSHIPS
CREATE OR REPLACE FUNCTION public.handle_membership_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_member_name TEXT;
    v_member_email TEXT;
BEGIN
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

-- 4. TEMPORARY DIAGNOSTIC RPC
CREATE OR REPLACE FUNCTION public.get_activity_triggers()
RETURNS TABLE(table_name text, trigger_name text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
    SELECT pg_class.relname::text, pg_trigger.tgname::text
    FROM pg_trigger 
    JOIN pg_class ON pg_trigger.tgrelid = pg_class.oid 
    WHERE pg_class.relname IN ('clients', 'projects', 'tasks', 'client_notes', 'memberships')
        AND pg_trigger.tgname IN ('on_client_activity', 'on_project_activity', 'on_task_activity', 'on_client_note_activity', 'on_membership_activity');
$$;
REVOKE EXECUTE ON FUNCTION public.get_activity_triggers() FROM PUBLIC;