-- Sprint 2.3 - Final Security Hardening for Projects
-- Sets a secure search_path for all SECURITY DEFINER functions.

-- 1. public.set_project_created_by()
CREATE OR REPLACE FUNCTION public.set_project_created_by()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    NEW.created_by = auth.uid();
    RETURN NEW;
END;
$$;

-- 2. public.prevent_project_creator_change()
CREATE OR REPLACE FUNCTION public.prevent_project_creator_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
        RAISE EXCEPTION 'Project creator cannot be changed.';
    END IF;
    RETURN NEW;
END;
$$;

-- 3. public.prevent_project_workspace_change()
CREATE OR REPLACE FUNCTION public.prevent_project_workspace_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NEW.workspace_id IS DISTINCT FROM OLD.workspace_id THEN
        RAISE EXCEPTION 'Project workspace cannot be changed.';
    END IF;
    RETURN NEW;
END;
$$;

-- 4. public.ensure_project_client_workspace_match()
CREATE OR REPLACE FUNCTION public.ensure_project_client_workspace_match()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    target_client_workspace_id UUID;
BEGIN
    IF NEW.client_id IS NOT NULL THEN
        SELECT workspace_id INTO target_client_workspace_id FROM public.clients WHERE id = NEW.client_id;
        
        IF target_client_workspace_id IS NULL THEN
            RAISE EXCEPTION 'Referenced client does not exist.';
        END IF;

        IF target_client_workspace_id != NEW.workspace_id THEN
            RAISE EXCEPTION 'Client belongs to a different workspace.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;
