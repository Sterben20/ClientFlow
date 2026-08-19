-- Migration: Sprint 2.5 Additive - Parent IDs for Deleted Events
-- Updates trigger functions to save parent relationships in metadata on DELETE

-- 1. PROJECTS TRIGGER
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
-- Revoke execute (already done in previous migration, but good to be safe)
REVOKE EXECUTE ON FUNCTION public.handle_project_activity() FROM PUBLIC;

-- 2. TASKS TRIGGER
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

-- 3. CLIENT NOTES TRIGGER
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
        VALUES (v_workspace_id, v_actor_id, 'note', OLD.id, 'note.deleted', jsonb_build_object('content_preview', v_content_preview, 'client_id', OLD.client_id));
    END IF;

    RETURN NULL;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.handle_client_note_activity() FROM PUBLIC;
