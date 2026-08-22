-- Migration to harden Row Level Security (RLS) for core entities
-- Ensures members can only update records they own, while Owners/Admins maintain full access.

-- ============================================================================
-- 1. CLIENTS
-- ============================================================================
DROP POLICY IF EXISTS "Members can update clients" ON clients;

CREATE POLICY "Members can update own clients" 
ON clients 
FOR UPDATE 
USING (
  public.has_workspace_access(workspace_id) AND created_by = auth.uid()
)
WITH CHECK (
  public.has_workspace_access(workspace_id) AND created_by = auth.uid()
);

CREATE POLICY "Admins and Owners can update clients" 
ON clients 
FOR UPDATE 
USING (
  public.has_workspace_admin_access(workspace_id)
)
WITH CHECK (
  public.has_workspace_admin_access(workspace_id)
);

-- ============================================================================
-- 2. PROJECTS
-- ============================================================================
DROP POLICY IF EXISTS "Members can update projects" ON projects;

CREATE POLICY "Members can update own projects" 
ON projects 
FOR UPDATE 
USING (
  public.has_workspace_access(workspace_id) AND created_by = auth.uid()
)
WITH CHECK (
  public.has_workspace_access(workspace_id) AND created_by = auth.uid()
);

CREATE POLICY "Admins and Owners can update projects" 
ON projects 
FOR UPDATE 
USING (
  public.has_workspace_admin_access(workspace_id)
)
WITH CHECK (
  public.has_workspace_admin_access(workspace_id)
);

-- ============================================================================
-- 3. TASKS
-- ============================================================================
DROP POLICY IF EXISTS "Members can update tasks" ON tasks;

CREATE POLICY "Members can update own tasks" 
ON tasks 
FOR UPDATE 
USING (
  public.has_workspace_access(workspace_id) AND created_by = auth.uid()
)
WITH CHECK (
  public.has_workspace_access(workspace_id) AND created_by = auth.uid()
);

CREATE POLICY "Admins and Owners can update tasks" 
ON tasks 
FOR UPDATE 
USING (
  public.has_workspace_admin_access(workspace_id)
)
WITH CHECK (
  public.has_workspace_admin_access(workspace_id)
);

-- ============================================================================
-- 4. DEALS
-- ============================================================================
DROP POLICY IF EXISTS "Members can update deals" ON deals;

CREATE POLICY "Members can update own deals" 
ON deals 
FOR UPDATE 
USING (
  public.has_workspace_access(workspace_id) AND owner_id = auth.uid()
)
WITH CHECK (
  public.has_workspace_access(workspace_id) AND owner_id = auth.uid()
);

CREATE POLICY "Admins and Owners can update deals" 
ON deals 
FOR UPDATE 
USING (
  public.has_workspace_admin_access(workspace_id)
)
WITH CHECK (
  public.has_workspace_admin_access(workspace_id)
);
