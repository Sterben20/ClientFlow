'use server'

import { createClient as createSupabase } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireWorkspaceAccess } from '@/lib/workspace'
import { taskSchema, TaskFormValues } from '@/lib/validations'
import { z } from 'zod'

export async function getTasks() {
  const { workspaceId } = await requireWorkspaceAccess()
  const supabase = createSupabase()
  
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      projects (
        name,
        client_id
      ),
      clients (
        name,
        company
      ),
      profiles (
        id,
        full_name,
        email
      )
    `)
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error("Error fetching tasks:", error)
    return []
  }

  return data
}

export async function getOptionsForTasks() {
  const { workspaceId } = await requireWorkspaceAccess()
  const supabase = createSupabase()
  
  const [clientsResponse, projectsResponse] = await Promise.all([
    supabase
      .from('clients')
      .select('id, name, company')
      .eq('workspace_id', workspaceId)
      .order('name', { ascending: true }),
    supabase
      .from('projects')
      .select('id, name, client_id')
      .eq('workspace_id', workspaceId)
      .order('name', { ascending: true })
  ])

  return {
    clients: clientsResponse.data || [],
    projects: projectsResponse.data || []
  }
}

export async function createTask(data: TaskFormValues) {
  try {
    const { workspaceId } = await requireWorkspaceAccess()
    const supabase = createSupabase()
    
    // Validate with Zod
    const validatedData = taskSchema.parse(data)
    
    // Explicitly ignore/strip workspace_id, created_by, and completed_at from payload
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { workspace_id: _ws, created_by: _cb, completed_at: _ca, id: _id, ...safeData } = validatedData as Record<string, unknown>;
    
    if (safeData.project_id) {
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('id, client_id')
        .eq('id', safeData.project_id)
        .eq('workspace_id', workspaceId)
        .single()
        
      if (projectError || !projectData) {
        return { success: false, error: "Invalid project or project does not belong to this workspace." }
      }
      
      if (projectData.client_id && safeData.client_id && safeData.client_id !== projectData.client_id) {
        return { success: false, error: "Task client must match the project's client." }
      }
    }
    
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
    
    // Treat empty string due_date as null
    if (safeData.due_date === "") {
      safeData.due_date = null;
    }
    
    const { error } = await supabase
      .from('tasks')
      .insert({
        ...safeData,
        workspace_id: workspaceId
        // created_by and completed_at are strictly handled by the database triggers
      })

    if (error) {
      console.error("Database error creating task:", error)
      return { success: false, error: "Failed to create task." }
    }

    revalidatePath('/tasks')
    return { success: true }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0]?.message || "Validation failed" }
    }
    console.error("Unexpected error creating task:", error)
    return { success: false, error: "An unexpected error occurred." }
  }
}

export async function updateTask(id: string, data: TaskFormValues) {
  try {
    const { workspaceId, role, user } = await requireWorkspaceAccess()
    const supabase = createSupabase()
    
    if (role === 'member') {
      const { data: task } = await supabase
        .from('tasks')
        .select('created_by')
        .eq('id', id)
        .eq('workspace_id', workspaceId)
        .single()
        
      if (!task || task.created_by !== user.id) {
        return { success: false, error: "You don't have permission to modify this task." }
      }
    }
    
    // Validate with Zod
    const validatedData = taskSchema.parse(data)

    // Explicitly ignore/strip workspace_id, created_by, completed_at
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { workspace_id: _ws, created_by: _cb, completed_at: _ca, id: _id, ...safeData } = validatedData as Record<string, unknown>;

    if (safeData.project_id) {
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('id, client_id')
        .eq('id', safeData.project_id)
        .eq('workspace_id', workspaceId)
        .single()
        
      if (projectError || !projectData) {
        return { success: false, error: "Invalid project or project does not belong to this workspace." }
      }
      
      if (projectData.client_id && safeData.client_id && safeData.client_id !== projectData.client_id) {
        return { success: false, error: "Task client must match the project's client." }
      }
    }
    
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

    // Treat empty string due_date as null
    if (safeData.due_date === "") {
      safeData.due_date = null;
    }

    const { error } = await supabase
      .from('tasks')
      .update(safeData)
      .eq('id', id)
      .eq('workspace_id', workspaceId)

    if (error) {
      console.error("Database error updating task:", error)
      return { success: false, error: "Failed to update task." }
    }

    revalidatePath('/tasks')
    revalidatePath(`/tasks/${id}`)
    return { success: true }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0]?.message || "Validation failed" }
    }
    console.error("Unexpected error updating task:", error)
    return { success: false, error: "An unexpected error occurred." }
  }
}

export async function updateTaskStatus(id: string, status: 'todo' | 'in_progress' | 'completed' | 'cancelled') {
  try {
    const { workspaceId, role, user } = await requireWorkspaceAccess()
    const supabase = createSupabase()
    
    if (role === 'member') {
      const { data: task } = await supabase
        .from('tasks')
        .select('created_by')
        .eq('id', id)
        .eq('workspace_id', workspaceId)
        .single()
        
      if (!task || task.created_by !== user.id) {
        return { success: false, error: "You don't have permission to modify this task status." }
      }
    }
    
    const { error } = await supabase
      .from('tasks')
      .update({ status })
      .eq('id', id)
      .eq('workspace_id', workspaceId)

    if (error) throw error

    revalidatePath('/tasks')
    revalidatePath(`/tasks/${id}`)
    return { success: true }
  } catch (error) {
    console.error("Error updating task status:", error)
    return { success: false, error: "Failed to update task status." }
  }
}

export async function deleteTask(id: string) {
  try {
    const { workspaceId, role } = await requireWorkspaceAccess()
    if (role === 'member') {
      return { success: false, error: "You don't have permission to delete tasks." }
    }
    
    const supabase = createSupabase()
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId)

    if (error) {
      console.error("Database error deleting task:", error)
      return { success: false, error: "Failed to delete task." }
    }

    revalidatePath('/tasks')
    return { success: true }
  } catch (error) {
    console.error("Unexpected error deleting task:", error)
    return { success: false, error: "An unexpected error occurred." }
  }
}
