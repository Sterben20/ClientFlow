-- Sprint 2.4 - Task Management
-- Safe additive migration to modify tasks table

-- 1. Alter due_date safely to DATE
ALTER TABLE public.tasks ALTER COLUMN due_date TYPE DATE USING due_date::DATE;

-- 2. Add completed_at and created_by columns safely
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT;

-- Drop assignee_id if it exists
DO $$ 
BEGIN
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='assignee_id') THEN
    ALTER TABLE public.tasks DROP COLUMN assignee_id;
  END IF;
END $$;

-- Enforce created_by NOT NULL
-- (If there are existing tasks with created_by = NULL, this will intentionally fail, 
--  prompting manual cleanup of test data before running the migration)
ALTER TABLE public.tasks ALTER COLUMN created_by SET NOT NULL;

-- 3. Modify Foreign Key constraints to ON DELETE SET NULL
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_project_id_fkey;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;

ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_client_id_fkey;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;

-- 4. Alter status and priority to TEXT with CHECK constraints
-- First drop existing defaults so we can change the type
ALTER TABLE public.tasks ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.tasks ALTER COLUMN status TYPE TEXT USING status::TEXT;
ALTER TABLE public.tasks ALTER COLUMN status SET DEFAULT 'todo';

-- Drop the old constraint if it exists to make it idempotent
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_status_check CHECK (status IN ('todo', 'in_progress', 'completed', 'cancelled'));

ALTER TABLE public.tasks ALTER COLUMN priority DROP DEFAULT;
ALTER TABLE public.tasks ALTER COLUMN priority TYPE TEXT USING priority::TEXT;
ALTER TABLE public.tasks ALTER COLUMN priority SET DEFAULT 'medium';

ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_priority_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_priority_check CHECK (priority IN ('low', 'medium', 'high'));

-- 5. Add string length constraints for title and description
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_title_length;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_title_length CHECK (char_length(trim(title)) > 0 AND char_length(title) <= 255);

ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_description_length;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_description_length CHECK (description IS NULL OR char_length(description) <= 5000);

-- 6. Add Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_id ON public.tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_status ON public.tasks(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_priority ON public.tasks(workspace_id, priority);
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_project_id ON public.tasks(workspace_id, project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_client_id ON public.tasks(workspace_id, client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_due_date ON public.tasks(workspace_id, due_date);

-- 7. Triggers for created_by
CREATE OR REPLACE FUNCTION public.set_task_created_by()
RETURNS TRIGGER
SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.created_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

REVOKE EXECUTE ON FUNCTION public.set_task_created_by() FROM PUBLIC;

DROP TRIGGER IF EXISTS tr_set_task_created_by ON public.tasks;
CREATE TRIGGER tr_set_task_created_by
BEFORE INSERT ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.set_task_created_by();

CREATE OR REPLACE FUNCTION public.prevent_task_created_by_update()
RETURNS TRIGGER
SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'created_by is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

REVOKE EXECUTE ON FUNCTION public.prevent_task_created_by_update() FROM PUBLIC;

DROP TRIGGER IF EXISTS tr_prevent_task_created_by_update ON public.tasks;
CREATE TRIGGER tr_prevent_task_created_by_update
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.prevent_task_created_by_update();

-- 8. Trigger for completed_at auto-populate
CREATE OR REPLACE FUNCTION public.set_task_completed_at()
RETURNS TRIGGER
SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status = 'completed' THEN
    NEW.completed_at = now();
  ELSE
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

REVOKE EXECUTE ON FUNCTION public.set_task_completed_at() FROM PUBLIC;

DROP TRIGGER IF EXISTS tr_set_task_completed_at ON public.tasks;
CREATE TRIGGER tr_set_task_completed_at
BEFORE INSERT OR UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.set_task_completed_at();

-- 9. Trigger for enforcing Workspace boundaries of cross-relationships
CREATE OR REPLACE FUNCTION public.enforce_task_workspace_relationships()
RETURNS TRIGGER
SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_project_workspace_id UUID;
  v_project_client_id UUID;
  v_client_workspace_id UUID;
BEGIN
  -- Validate Project Relationship
  IF NEW.project_id IS NOT NULL THEN
    SELECT workspace_id, client_id INTO v_project_workspace_id, v_project_client_id 
    FROM public.projects WHERE id = NEW.project_id;
    
    IF v_project_workspace_id IS NULL THEN
      RAISE EXCEPTION 'Project not found.';
    END IF;
    
    IF v_project_workspace_id != NEW.workspace_id THEN
      RAISE EXCEPTION 'Task workspace does not match Project workspace.';
    END IF;
    
    -- If project has a client, task client MUST match project client
    IF v_project_client_id IS NOT NULL AND NEW.client_id IS NOT NULL AND NEW.client_id != v_project_client_id THEN
      RAISE EXCEPTION 'Task client does not match Project client.';
    END IF;
  END IF;

  -- Validate Client Relationship
  IF NEW.client_id IS NOT NULL THEN
    SELECT workspace_id INTO v_client_workspace_id 
    FROM public.clients WHERE id = NEW.client_id;
    
    IF v_client_workspace_id IS NULL THEN
      RAISE EXCEPTION 'Client not found.';
    END IF;
    
    IF v_client_workspace_id != NEW.workspace_id THEN
      RAISE EXCEPTION 'Task workspace does not match Client workspace.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

REVOKE EXECUTE ON FUNCTION public.enforce_task_workspace_relationships() FROM PUBLIC;

DROP TRIGGER IF EXISTS tr_enforce_task_workspace_relationships ON public.tasks;
CREATE TRIGGER tr_enforce_task_workspace_relationships
BEFORE INSERT OR UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.enforce_task_workspace_relationships();

-- 10. Update RLS Policies
DROP POLICY IF EXISTS "Members can view tasks" ON tasks;
DROP POLICY IF EXISTS "Members can insert tasks" ON tasks;
DROP POLICY IF EXISTS "Members can update tasks" ON tasks;
DROP POLICY IF EXISTS "Admins and Owners can delete tasks" ON tasks;

CREATE POLICY "Members can view tasks" ON tasks
FOR SELECT USING (has_workspace_access(workspace_id));

CREATE POLICY "Members can insert tasks" ON tasks
FOR INSERT WITH CHECK (has_workspace_access(workspace_id) AND created_by = auth.uid());

CREATE POLICY "Members can update tasks" ON tasks
FOR UPDATE USING (has_workspace_access(workspace_id));

CREATE POLICY "Admins and Owners can delete tasks" ON tasks
FOR DELETE USING (has_workspace_admin_access(workspace_id));
