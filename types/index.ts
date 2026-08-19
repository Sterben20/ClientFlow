export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
}

export interface Client {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  status: 'lead' | 'prospect' | 'active' | 'inactive';
  source: string | null;
  notes: string | null;
  workspace_id: string;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  client_id: string;
  name: string;
  description: string | null;
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  progress: number;
  start_date: string | null;
  due_date: string | null;
  budget: number | null;
  workspace_id: string;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  clients?: {
    id: string;
    name: string;
    company?: string | null;
  };
  profiles?: {
    id: string;
    full_name: string | null;
    email: string;
  };
}

export interface Deal {
  id: string;
  client_id: string;
  owner_id: string | null;
  name: string;
  value: number;
  stage: 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
  expected_close_date: string | null;
  workspace_id: string;
  created_at: string;
  updated_at: string;
  clients?: {
    name: string;
    company?: string | null;
    email?: string | null;
  };
  profiles?: {
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  project_id: string | null;
  client_id: string | null;
  workspace_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  projects?: {
    id: string;
    name: string;
  };
  clients?: {
    id: string;
    name: string;
    company?: string | null;
  };
  profiles?: {
    id: string;
    full_name: string | null;
    email: string;
  };
}

export interface WorkspaceMember {
  id: string;
  role: string;
  profile_id: string;
  created_at: string;
  profiles: {
    email: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export interface WorkspaceInvitation {
  id: string;
  email: string;
  role: string;
  expires_at: string;
  token: string;
}

export type ClientOption = Pick<Client, 'id' | 'name' | 'company'>;
export type ProjectOption = Pick<Project, 'id' | 'name' | 'client_id'>;

export interface Activity {
  id: string;
  workspace_id: string;
  actor_id: string | null;
  entity_type: 'client' | 'project' | 'task' | 'note' | 'member' | 'deal';
  entity_id: string;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
  profiles?: {
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  } | null;
}
