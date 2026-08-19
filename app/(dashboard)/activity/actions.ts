'use server'

import { createClient as createSupabase } from '@/lib/supabase/server'
import { requireWorkspaceAccess } from '@/lib/workspace'

export type ActivityFilter = 'all' | 'clients' | 'projects' | 'tasks' | 'notes' | 'team';

export async function getClientTimeline(clientId: string, page: number = 1, filter: ActivityFilter = 'all') {
  const { workspaceId } = await requireWorkspaceAccess()
  const supabase = createSupabase()

  // 1. Resolve the current client in the active workspace
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .eq('workspace_id', workspaceId)
    .single()

  if (clientError || !client) {
    throw new Error('Client not found')
  }

  // 2. Find Projects belonging to the client
  const { data: projects } = await supabase
    .from('projects')
    .select('id')
    .eq('client_id', clientId)
    .eq('workspace_id', workspaceId)

  const projectIds = (projects || []).map(p => p.id)
  
  // 3. Find Tasks belonging to those projects or directly to the client
  let tasksQuery = supabase
    .from('tasks')
    .select('id')
    .eq('workspace_id', workspaceId)

  if (projectIds.length > 0) {
    tasksQuery = tasksQuery.or(`client_id.eq.${clientId},project_id.in.(${projectIds.join(',')})`)
  } else {
    tasksQuery = tasksQuery.eq('client_id', clientId)
  }

  const { data: tasks } = await tasksQuery
  const taskIds = (tasks || []).map(t => t.id)

  // 4. Query all note IDs for client
  const { data: notes } = await supabase
    .from('client_notes')
    .select('id')
    .eq('client_id', clientId)

  const noteIds = (notes || []).map(n => n.id)

  const entityIds = [clientId, ...projectIds, ...taskIds, ...noteIds]

  const limit = 20
  const offset = (page - 1) * limit

  const typeFilter = filter === 'team' ? 'member' : filter === 'notes' ? 'note' : filter.slice(0, -1)

  // 1. Fetch normal activities
  let normalQuery = supabase
    .from('activities')
    .select(`*, profiles(full_name, email, avatar_url)`)
    .eq('workspace_id', workspaceId)
    .in('entity_id', entityIds)

  if (filter !== 'all') {
    normalQuery = normalQuery.eq('entity_type', typeFilter)
  }

  const { data: normalActivities, error: nErr } = await normalQuery
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(0, offset + limit - 1)

  // 2. Fetch deleted activities via metadata contains
  let deletedQuery = supabase
    .from('activities')
    .select(`*, profiles(full_name, email, avatar_url)`)
    .eq('workspace_id', workspaceId)
    .contains('metadata', { client_id: clientId })
    .in('action', ['client.deleted', 'project.deleted', 'task.deleted', 'note.deleted'])

  if (filter !== 'all') {
    deletedQuery = deletedQuery.eq('entity_type', typeFilter)
  }

  const { data: deletedActivities, error: dErr } = await deletedQuery
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(0, offset + limit - 1)

  if (nErr || dErr) {
    console.error("Error fetching client timeline:", nErr || dErr)
    throw new Error('Unable to load activity right now.')
  }

  // 3. Merge, sort, deduplicate, and slice
  const merged = [...(normalActivities || []), ...(deletedActivities || [])]
  const unique = Array.from(new Map(merged.map(item => [item.id, item])).values())
  unique.sort((a, b) => {
    const timeDiff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    if (timeDiff !== 0) return timeDiff
    return b.id.localeCompare(a.id)
  })

  return unique.slice(offset, offset + limit)
}

export async function getProjectTimeline(projectId: string, page: number = 1, filter: ActivityFilter = 'all') {
  const { workspaceId } = await requireWorkspaceAccess()
  const supabase = createSupabase()

  // 1. Resolve project in active workspace
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('workspace_id', workspaceId)
    .single()

  if (projectError || !project) {
    throw new Error('Project not found')
  }

  // 2. Query all task IDs for project
  const { data: tasks } = await supabase
    .from('tasks')
    .select('id')
    .eq('project_id', projectId)
    .eq('workspace_id', workspaceId)

  const taskIds = (tasks || []).map(t => t.id)
  
  const entityIds = [projectId, ...taskIds]

  const limit = 20
  const offset = (page - 1) * limit

  const typeFilter = filter === 'team' ? 'member' : filter === 'notes' ? 'note' : filter.slice(0, -1)

  // 1. Fetch normal activities
  let normalQuery = supabase
    .from('activities')
    .select(`*, profiles(full_name, email, avatar_url)`)
    .eq('workspace_id', workspaceId)
    .in('entity_id', entityIds)

  if (filter !== 'all') {
    normalQuery = normalQuery.eq('entity_type', typeFilter)
  }

  const { data: normalActivities, error: nErr } = await normalQuery
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(0, offset + limit - 1)

  // 2. Fetch deleted activities via metadata contains
  let deletedQuery = supabase
    .from('activities')
    .select(`*, profiles(full_name, email, avatar_url)`)
    .eq('workspace_id', workspaceId)
    .contains('metadata', { project_id: projectId })
    .in('action', ['task.deleted']) // only task deletion is relevant to project timeline directly

  if (filter !== 'all') {
    deletedQuery = deletedQuery.eq('entity_type', typeFilter)
  }

  const { data: deletedActivities, error: dErr } = await deletedQuery
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(0, offset + limit - 1)

  if (nErr || dErr) {
    console.error("Error fetching project timeline:", nErr || dErr)
    throw new Error('Unable to load activity right now.')
  }

  // 3. Merge, sort, deduplicate, and slice
  const merged = [...(normalActivities || []), ...(deletedActivities || [])]
  const unique = Array.from(new Map(merged.map(item => [item.id, item])).values())
  unique.sort((a, b) => {
    const timeDiff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    if (timeDiff !== 0) return timeDiff
    return b.id.localeCompare(a.id)
  })

  return unique.slice(offset, offset + limit)
}
