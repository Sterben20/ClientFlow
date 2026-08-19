-- Phase 4: Row Level Security (RLS) Policies

-- 1. Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- 2. Helper Functions
-- Function to check if a user is a member of a workspace
CREATE OR REPLACE FUNCTION public.has_workspace_access(ws_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.memberships 
    WHERE workspace_id = ws_id 
    AND profile_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a user is an admin or owner of a workspace
CREATE OR REPLACE FUNCTION public.has_workspace_admin_access(ws_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.memberships 
    WHERE workspace_id = ws_id 
    AND profile_id = auth.uid()
    AND role IN ('admin', 'owner')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Profiles Policies
-- Users can read their own profile
CREATE POLICY "Users can view own profile" 
  ON profiles FOR SELECT 
  USING (auth.uid() = id);

-- Users can read profiles of people in their workspaces
CREATE POLICY "Users can view workspace members profiles" 
  ON profiles FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM memberships m1
      JOIN memberships m2 ON m1.workspace_id = m2.workspace_id
      WHERE m1.profile_id = auth.uid() AND m2.profile_id = profiles.id
    )
  );

-- Users can update their own profile
CREATE POLICY "Users can update own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);

-- 4. Workspaces Policies
-- Users can view workspaces they are members of
CREATE POLICY "Users can view their workspaces" 
  ON workspaces FOR SELECT 
  USING (has_workspace_access(id));

-- Only owners and admins can update the workspace
CREATE POLICY "Admins and Owners can update workspaces" 
  ON workspaces FOR UPDATE 
  USING (has_workspace_admin_access(id));

-- 5. Memberships Policies
-- Users can view all memberships in their workspaces
CREATE POLICY "Users can view memberships of their workspaces" 
  ON memberships FOR SELECT 
  USING (has_workspace_access(workspace_id));

-- Only admins and owners can insert/update/delete memberships
CREATE POLICY "Admins and Owners can insert memberships" 
  ON memberships FOR INSERT 
  WITH CHECK (has_workspace_admin_access(workspace_id));

CREATE POLICY "Admins and Owners can update memberships" 
  ON memberships FOR UPDATE 
  USING (has_workspace_admin_access(workspace_id));

CREATE POLICY "Admins and Owners can delete memberships" 
  ON memberships FOR DELETE 
  USING (has_workspace_admin_access(workspace_id));

-- 6. Core Entities (Clients, Projects, Deals, Tasks, Notes, Activities)
-- SELECT (View): All members can view data in their workspace
CREATE POLICY "Members can view clients" ON clients FOR SELECT USING (has_workspace_access(workspace_id));
CREATE POLICY "Members can view projects" ON projects FOR SELECT USING (has_workspace_access(workspace_id));
CREATE POLICY "Members can view project_members" ON project_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = project_members.project_id AND has_workspace_access(projects.workspace_id))
);
CREATE POLICY "Members can view deals" ON deals FOR SELECT USING (has_workspace_access(workspace_id));
CREATE POLICY "Members can view tasks" ON tasks FOR SELECT USING (has_workspace_access(workspace_id));
CREATE POLICY "Members can view notes" ON notes FOR SELECT USING (has_workspace_access(workspace_id));
CREATE POLICY "Members can view activities" ON activities FOR SELECT USING (has_workspace_access(workspace_id));

-- INSERT & UPDATE (Edit): All members can create/edit data in their workspace
-- Clients
CREATE POLICY "Members can insert clients" ON clients FOR INSERT WITH CHECK (has_workspace_access(workspace_id));
CREATE POLICY "Members can update clients" ON clients FOR UPDATE USING (has_workspace_access(workspace_id));
-- Projects
CREATE POLICY "Members can insert projects" ON projects FOR INSERT WITH CHECK (has_workspace_access(workspace_id));
CREATE POLICY "Members can update projects" ON projects FOR UPDATE USING (has_workspace_access(workspace_id));
-- Project Members
CREATE POLICY "Members can insert project_members" ON project_members FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = project_members.project_id AND has_workspace_access(projects.workspace_id))
);
CREATE POLICY "Members can update project_members" ON project_members FOR UPDATE USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = project_members.project_id AND has_workspace_access(projects.workspace_id))
);
-- Deals
CREATE POLICY "Members can insert deals" ON deals FOR INSERT WITH CHECK (has_workspace_access(workspace_id));
CREATE POLICY "Members can update deals" ON deals FOR UPDATE USING (has_workspace_access(workspace_id));
-- Tasks
CREATE POLICY "Members can insert tasks" ON tasks FOR INSERT WITH CHECK (has_workspace_access(workspace_id));
CREATE POLICY "Members can update tasks" ON tasks FOR UPDATE USING (has_workspace_access(workspace_id));
-- Notes
CREATE POLICY "Members can insert notes" ON notes FOR INSERT WITH CHECK (has_workspace_access(workspace_id));
CREATE POLICY "Members can update notes" ON notes FOR UPDATE USING (has_workspace_access(workspace_id));
-- Activities
CREATE POLICY "Members can insert activities" ON activities FOR INSERT WITH CHECK (has_workspace_access(workspace_id));
CREATE POLICY "Members can update activities" ON activities FOR UPDATE USING (has_workspace_access(workspace_id));

-- DELETE (Remove): ONLY Admins and Owners can delete data
CREATE POLICY "Admins and Owners can delete clients" ON clients FOR DELETE USING (has_workspace_admin_access(workspace_id));
CREATE POLICY "Admins and Owners can delete projects" ON projects FOR DELETE USING (has_workspace_admin_access(workspace_id));
CREATE POLICY "Admins and Owners can delete project_members" ON project_members FOR DELETE USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = project_members.project_id AND has_workspace_admin_access(projects.workspace_id))
);
CREATE POLICY "Admins and Owners can delete deals" ON deals FOR DELETE USING (has_workspace_admin_access(workspace_id));
CREATE POLICY "Admins and Owners can delete tasks" ON tasks FOR DELETE USING (has_workspace_admin_access(workspace_id));
CREATE POLICY "Admins and Owners can delete notes" ON notes FOR DELETE USING (has_workspace_admin_access(workspace_id));
CREATE POLICY "Admins and Owners can delete activities" ON activities FOR DELETE USING (has_workspace_admin_access(workspace_id));
