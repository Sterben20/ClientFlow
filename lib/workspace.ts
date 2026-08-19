import { createClient as createSupabase } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import type { User } from '@supabase/supabase-js'

export const WORKSPACE_COOKIE_NAME = 'clientflow_workspace_id'

export type WorkspaceRole = 'owner' | 'admin' | 'member'

export interface WorkspaceAccess {
  workspaceId: string
  role: WorkspaceRole
  user: User
}

/**
 * Retrieves the current active workspace for the authenticated user.
 * Ensures the user has a valid membership to the workspace defined in cookies.
 */
export async function getCurrentWorkspace(): Promise<WorkspaceAccess | null> {
  const supabase = createSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  const cookieStore = cookies()
  const activeWorkspaceId = cookieStore.get(WORKSPACE_COOKIE_NAME)?.value

  if (!activeWorkspaceId) {
    return null
  }

  // Strictly verify membership to the requested workspace
  const { data: membership, error } = await supabase
    .from('memberships')
    .select('workspace_id, role')
    .eq('profile_id', user.id)
    .eq('workspace_id', activeWorkspaceId)
    .maybeSingle()
    
  if (error || !membership) {
    return null
  }

  return {
    workspaceId: membership.workspace_id,
    role: membership.role as WorkspaceRole,
    user
  }
}

/**
 * Ensures the user is logged in and has access to a valid workspace.
 * Throws an error if unauthorized.
 */
export async function requireWorkspaceAccess(): Promise<WorkspaceAccess> {
  const access = await getCurrentWorkspace()
  
  if (!access) {
    throw new Error("Unauthorized: You don't have access to this workspace or are not logged in.")
  }

  return access
}

/**
 * Ensures the user has a specific minimum role.
 */
export async function requireWorkspaceRole(allowedRoles: WorkspaceRole[]): Promise<WorkspaceAccess> {
  const access = await requireWorkspaceAccess()
  
  if (!allowedRoles.includes(access.role)) {
    throw new Error("Forbidden: You do not have the required permissions in this workspace.")
  }

  return access
}
