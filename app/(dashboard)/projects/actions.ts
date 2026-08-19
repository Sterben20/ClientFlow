'use server'

import { createClient as createSupabase } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireWorkspaceAccess } from '@/lib/workspace'

export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';

export interface ProjectData {
  id?: string;
  client_id?: string | null;
  name: string;
  description?: string | null;
  status: ProjectStatus;
  priority: 'low' | 'medium' | 'high';
  progress: number;
  start_date?: string | null;
  due_date?: string | null;
  budget?: number | null;
}

export async function getProjects() {
  const { workspaceId } = await requireWorkspaceAccess()
  const supabase = createSupabase()
  
  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      clients (
        name,
        company
      )
    `)
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error("Error fetching projects:", error)
    return []
  }

  return data
}

export async function getClientsForSelect() {
  const { workspaceId } = await requireWorkspaceAccess()
  const supabase = createSupabase()
  
  const { data, error } = await supabase
    .from('clients')
    .select('id, name, company')
    .eq('workspace_id', workspaceId)
    .order('name', { ascending: true })

  if (error) {
    console.error("Error fetching clients for select:", error)
    return []
  }

  return data
}

export async function createProject(data: ProjectData) {
  try {
    const { workspaceId } = await requireWorkspaceAccess()
    const supabase = createSupabase()
    
    // Business rule: progress 100 -> completed
    if (data.progress === 100) {
      data.status = 'completed';
    }
    
    // Explicitly ignore/strip created_by and workspace_id from payload if present
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { workspace_id: _ws, created_by: _cb, id: _id, ...safeData } = data as unknown as Record<string, unknown>;
    
    // Layer 1 Client Validation: If client_id is provided, verify it belongs to this workspace
    if (safeData.client_id) {
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('id')
        .eq('id', safeData.client_id)
        .eq('workspace_id', workspaceId)
        .single()
        
      if (clientError || !clientData) {
        return { success: false, error: "Invalid client or client does not belong to this workspace." }
      }
    }
    
    const { error } = await supabase
      .from('projects')
      .insert({
        ...safeData,
        workspace_id: workspaceId,
        // created_by is strictly handled by the database trigger
      })

    if (error) {
      console.error("Database error creating project:", error)
      return { success: false, error: "Failed to create project." }
    }

    revalidatePath('/projects')
    return { success: true }
  } catch (error) {
    console.error("Unexpected error creating project:", error)
    return { success: false, error: "An unexpected error occurred." }
  }
}

export async function updateProject(id: string, data: ProjectData) {
  try {
    const { workspaceId, role, user } = await requireWorkspaceAccess()
    const supabase = createSupabase()
    
    if (role === 'member') {
      const { data: project } = await supabase
        .from('projects')
        .select('created_by')
        .eq('id', id)
        .eq('workspace_id', workspaceId)
        .single()
        
      if (!project || project.created_by !== user.id) {
        return { success: false, error: "You don't have permission to modify this project." }
      }
    }
    
    // Business rule: progress 100 -> completed
    if (data.progress === 100) {
      data.status = 'completed';
    }

    // Explicitly ignore/strip created_by and workspace_id from payload
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { workspace_id: _ws, created_by: _cb, id: _id, ...safeData } = data as unknown as Record<string, unknown>;

    // Layer 1 Client Validation: If client_id is provided, verify it belongs to this workspace
    if (safeData.client_id) {
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('id')
        .eq('id', safeData.client_id)
        .eq('workspace_id', workspaceId)
        .single()
        
      if (clientError || !clientData) {
        return { success: false, error: "Invalid client or client does not belong to this workspace." }
      }
    }

    const { error } = await supabase
      .from('projects')
      .update(safeData)
      .eq('id', id)
      .eq('workspace_id', workspaceId)

    if (error) {
      console.error("Database error updating project:", error)
      return { success: false, error: "Failed to update project." }
    }

    revalidatePath('/projects')
    revalidatePath(`/projects/${id}`)
    return { success: true }
  } catch (error) {
    console.error("Unexpected error updating project:", error)
    return { success: false, error: "An unexpected error occurred." }
  }
}

export async function deleteProject(id: string) {
  try {
    const { workspaceId, role } = await requireWorkspaceAccess()
    if (role === 'member') {
      return { success: false, error: "Members cannot delete projects." }
    }
    
    const supabase = createSupabase()
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId)

    if (error) {
      console.error("Database error deleting project:", error)
      return { success: false, error: "Failed to delete project." }
    }

    revalidatePath('/projects')
    return { success: true }
  } catch (error) {
    console.error("Unexpected error deleting project:", error)
    return { success: false, error: "An unexpected error occurred." }
  }
}
