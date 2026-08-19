-- Sprint 2.3 - Final Database Hardening
-- 1. Fix created_by foreign key delete behavior to RESTRICT (fails closed on profile deletion).
-- 2. Revoke execute privileges on trigger functions from PUBLIC.

-- Step 1: Change foreign key ON DELETE behavior to RESTRICT
ALTER TABLE public.projects 
  DROP CONSTRAINT IF EXISTS projects_created_by_fkey;

ALTER TABLE public.projects 
  ADD CONSTRAINT projects_created_by_fkey 
  FOREIGN KEY (created_by) 
  REFERENCES public.profiles(id) 
  ON DELETE RESTRICT;

-- Step 2: Revoke EXECUTE from PUBLIC for all trigger functions
REVOKE EXECUTE ON FUNCTION public.set_project_created_by() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.prevent_project_creator_change() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.prevent_project_workspace_change() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.ensure_project_client_workspace_match() FROM PUBLIC;
