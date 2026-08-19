-- Migration: Sprint 2.5 Fix - Project Created Metadata
-- Safely replaces handle_project_activity to include NEW.name on project.created and project.status_changed

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
        VALUES (NEW.workspace_id, v_actor_id, 'project', NEW.id, 'project.created', jsonb_build_object('name', NEW.name));
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            INSERT INTO public.activities (workspace_id, actor_id, entity_type, entity_id, action, metadata)
            VALUES (NEW.workspace_id, v_actor_id, 'project', NEW.id, 'project.status_changed', jsonb_build_object('name', NEW.name, 'previous_status', OLD.status, 'new_status', NEW.status));
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO public.activities (workspace_id, actor_id, entity_type, entity_id, action, metadata)
        VALUES (OLD.workspace_id, v_actor_id, 'project', OLD.id, 'project.deleted', jsonb_build_object('name', OLD.name, 'client_id', OLD.client_id));
    END IF;

    RETURN NULL;
END;
$$;
