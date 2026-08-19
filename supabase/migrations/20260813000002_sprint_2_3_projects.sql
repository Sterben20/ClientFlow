-- Sprint 2.3 - Projects Migration

-- 1. Add Columns
ALTER TABLE public.projects 
  ADD COLUMN IF NOT EXISTS progress INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. Constraints
ALTER TABLE public.projects
  ADD CONSTRAINT projects_progress_check CHECK (progress >= 0 AND progress <= 100),
  ADD CONSTRAINT projects_dates_check CHECK (start_date IS NULL OR due_date IS NULL OR start_date <= due_date),
  ADD CONSTRAINT projects_budget_check CHECK (budget IS NULL OR budget >= 0);

-- 3. Workspace-Scoped Indexes
CREATE INDEX IF NOT EXISTS idx_projects_workspace_client ON public.projects(workspace_id, client_id);
CREATE INDEX IF NOT EXISTS idx_projects_workspace_status ON public.projects(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_projects_workspace_priority ON public.projects(workspace_id, priority);

-- 4. Triggers (Layer 2 Security)

-- 4a. Identity Enforcement (Insert)
CREATE OR REPLACE FUNCTION public.set_project_created_by()
RETURNS trigger AS $$
BEGIN
    NEW.created_by = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_project_insert_set_creator
    BEFORE INSERT ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION public.set_project_created_by();

-- 4b. Creator Immutability (Fail Closed)
CREATE OR REPLACE FUNCTION public.prevent_project_creator_change()
RETURNS trigger AS $$
BEGIN
    IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
        RAISE EXCEPTION 'Project creator cannot be changed.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER prevent_project_creator_change
    BEFORE UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_project_creator_change();

-- 4c. Workspace Immutability (Fail Closed)
CREATE OR REPLACE FUNCTION public.prevent_project_workspace_change()
RETURNS trigger AS $$
BEGIN
    IF NEW.workspace_id IS DISTINCT FROM OLD.workspace_id THEN
        RAISE EXCEPTION 'Project workspace cannot be changed.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER prevent_project_workspace_change
    BEFORE UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_project_workspace_change();

-- 4d. Client Workspace Match
CREATE OR REPLACE FUNCTION public.ensure_project_client_workspace_match()
RETURNS trigger AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER ensure_project_client_workspace_match
    BEFORE INSERT OR UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION public.ensure_project_client_workspace_match();

-- 5. RLS Policies Hardening
-- Drop the existing loose insert policy
DROP POLICY IF EXISTS "Members can insert projects" ON public.projects;

-- Create strict insert policy (must have workspace access and created_by must equal auth.uid)
CREATE POLICY "Members can insert projects" 
    ON public.projects 
    FOR INSERT 
    WITH CHECK (
        public.has_workspace_access(workspace_id) AND 
        created_by = auth.uid()
    );
