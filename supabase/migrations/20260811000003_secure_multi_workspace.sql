-- Migration: Secure Multi-Workspace Cross-References
-- This migration strengthens RLS to ensure related records (e.g. tasks -> projects)
-- ALWAYS belong to the same workspace, preventing cross-workspace data leakage.

-- 1. Drop existing permissive INSERT and UPDATE policies
DROP POLICY IF EXISTS "Members can insert clients" ON clients;
DROP POLICY IF EXISTS "Members can update clients" ON clients;

DROP POLICY IF EXISTS "Members can insert projects" ON projects;
DROP POLICY IF EXISTS "Members can update projects" ON projects;

DROP POLICY IF EXISTS "Members can insert deals" ON deals;
DROP POLICY IF EXISTS "Members can update deals" ON deals;

DROP POLICY IF EXISTS "Members can insert tasks" ON tasks;
DROP POLICY IF EXISTS "Members can update tasks" ON tasks;

DROP POLICY IF EXISTS "Members can insert notes" ON notes;
DROP POLICY IF EXISTS "Members can update notes" ON notes;


-- 2. Create strict Policies with Cross-Workspace Validation

-- Clients
CREATE POLICY "Members can insert clients" ON clients FOR INSERT WITH CHECK (
  has_workspace_access(workspace_id)
);
CREATE POLICY "Members can update clients" ON clients FOR UPDATE USING (
  has_workspace_access(workspace_id)
) WITH CHECK (
  has_workspace_access(workspace_id)
);

-- Projects (Must check client_id)
CREATE POLICY "Members can insert projects" ON projects FOR INSERT WITH CHECK (
  has_workspace_access(workspace_id) AND
  (client_id IS NULL OR EXISTS (SELECT 1 FROM clients WHERE id = client_id AND workspace_id = projects.workspace_id))
);
CREATE POLICY "Members can update projects" ON projects FOR UPDATE USING (
  has_workspace_access(workspace_id)
) WITH CHECK (
  has_workspace_access(workspace_id) AND
  (client_id IS NULL OR EXISTS (SELECT 1 FROM clients WHERE id = client_id AND workspace_id = projects.workspace_id))
);

-- Deals (Must check client_id)
CREATE POLICY "Members can insert deals" ON deals FOR INSERT WITH CHECK (
  has_workspace_access(workspace_id) AND
  (client_id IS NULL OR EXISTS (SELECT 1 FROM clients WHERE id = client_id AND workspace_id = deals.workspace_id))
);
CREATE POLICY "Members can update deals" ON deals FOR UPDATE USING (
  has_workspace_access(workspace_id)
) WITH CHECK (
  has_workspace_access(workspace_id) AND
  (client_id IS NULL OR EXISTS (SELECT 1 FROM clients WHERE id = client_id AND workspace_id = deals.workspace_id))
);

-- Tasks (Must check client_id and project_id)
CREATE POLICY "Members can insert tasks" ON tasks FOR INSERT WITH CHECK (
  has_workspace_access(workspace_id) AND
  (client_id IS NULL OR EXISTS (SELECT 1 FROM clients WHERE id = client_id AND workspace_id = tasks.workspace_id)) AND
  (project_id IS NULL OR EXISTS (SELECT 1 FROM projects WHERE id = project_id AND workspace_id = tasks.workspace_id))
);
CREATE POLICY "Members can update tasks" ON tasks FOR UPDATE USING (
  has_workspace_access(workspace_id)
) WITH CHECK (
  has_workspace_access(workspace_id) AND
  (client_id IS NULL OR EXISTS (SELECT 1 FROM clients WHERE id = client_id AND workspace_id = tasks.workspace_id)) AND
  (project_id IS NULL OR EXISTS (SELECT 1 FROM projects WHERE id = project_id AND workspace_id = tasks.workspace_id))
);

-- Notes (Must check client_id, project_id, and deal_id)
CREATE POLICY "Members can insert notes" ON notes FOR INSERT WITH CHECK (
  has_workspace_access(workspace_id) AND
  (client_id IS NULL OR EXISTS (SELECT 1 FROM clients WHERE id = client_id AND workspace_id = notes.workspace_id)) AND
  (project_id IS NULL OR EXISTS (SELECT 1 FROM projects WHERE id = project_id AND workspace_id = notes.workspace_id)) AND
  (deal_id IS NULL OR EXISTS (SELECT 1 FROM deals WHERE id = deal_id AND workspace_id = notes.workspace_id))
);
CREATE POLICY "Members can update notes" ON notes FOR UPDATE USING (
  has_workspace_access(workspace_id)
) WITH CHECK (
  has_workspace_access(workspace_id) AND
  (client_id IS NULL OR EXISTS (SELECT 1 FROM clients WHERE id = client_id AND workspace_id = notes.workspace_id)) AND
  (project_id IS NULL OR EXISTS (SELECT 1 FROM projects WHERE id = project_id AND workspace_id = notes.workspace_id)) AND
  (deal_id IS NULL OR EXISTS (SELECT 1 FROM deals WHERE id = deal_id AND workspace_id = notes.workspace_id))
);
