-- Migration: Sprint 2.5 Fix - Client Created Metadata
-- Safely replaces handle_client_activity to include NEW.name on client.created

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
