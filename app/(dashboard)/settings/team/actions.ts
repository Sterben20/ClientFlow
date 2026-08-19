'use server'

import { createClient as createSupabase } from '@/lib/supabase/server'
import { requireWorkspaceAccess } from '@/lib/workspace'
import { revalidatePath } from 'next/cache'
import type { WorkspaceRole } from '@/lib/workspace'
import type { WorkspaceMember, WorkspaceInvitation } from '@/types'

export async function getWorkspaceMembers() {
  const { workspaceId } = await requireWorkspaceAccess()
  const supabase = createSupabase()

  const { data, error } = await supabase
    .from('memberships')
    .select(`
      id,
      role,
      profile_id,
      created_at,
      profiles (
        email,
        full_name,
        avatar_url
      )
    `)
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error("Error fetching workspace members:", error)
    return []
  }

  return data as unknown as WorkspaceMember[]
}

export async function getPendingInvitations() {
  const { workspaceId, role } = await requireWorkspaceAccess()
  if (role === 'member') return [] // Only admins/owners can see invitations

  const supabase = createSupabase()
  const { data, error } = await supabase
    .from('workspace_invitations')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error("Error fetching invitations:", error)
    return []
  }

  return data as unknown as WorkspaceInvitation[]
}

export async function createInvitation(email: string, role: WorkspaceRole) {
  try {
    const { workspaceId, role: currentRole, user } = await requireWorkspaceAccess()
    
    if (currentRole === 'member') {
      return { success: false, error: "Only admins and owners can invite members." }
    }

    if (role === 'owner') {
      return { success: false, error: "Owners can only be granted to existing workspace members." }
    }

    if (!email || !email.includes('@')) {
      return { success: false, error: "Valid email is required." }
    }

    const supabase = createSupabase()

    // Create the invitation
    const normalizedEmail = email.toLowerCase()

    const { data: invite, error } = await supabase
      .from('workspace_invitations')
      .insert({
        workspace_id: workspaceId,
        email: normalizedEmail,
        role: role,
        invited_by: user.id
      })
      .select('token')
      .single()

    if (error) {
      if (error.code === '23505') { // Unique violation
        return { success: false, error: "An invitation for this email already exists in this workspace." }
      }
      throw error
    }

    revalidatePath('/settings/team')
    return { success: true, token: invite.token }
  } catch (error) {
    console.error("Error creating invitation:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to create invitation." }
  }
}

export async function revokeInvitation(id: string) {
  try {
    const { workspaceId, role } = await requireWorkspaceAccess()
    
    if (role === 'member') {
      return { success: false, error: "Unauthorized" }
    }

    const supabase = createSupabase()
    const { error } = await supabase
      .from('workspace_invitations')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId)

    if (error) throw error

    revalidatePath('/settings/team')
    return { success: true }
  } catch (error) {
    console.error("Error revoking invitation:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to revoke invitation." }
  }
}

export async function removeMember(profileId: string) {
  try {
    const { workspaceId, role, user } = await requireWorkspaceAccess()
    
    if (role === 'member') {
      return { success: false, error: "Unauthorized" }
    }

    if (profileId === user.id) {
      return { success: false, error: "You cannot remove yourself. Use leave workspace instead." }
    }

    const supabase = createSupabase()
    
    // Safety check: Cannot remove the last owner
    const { data: owners } = await supabase
      .from('memberships')
      .select('profile_id')
      .eq('workspace_id', workspaceId)
      .eq('role', 'owner')
      
    if (owners && owners.length === 1 && owners[0].profile_id === profileId) {
      return { success: false, error: "Cannot remove the last owner of the workspace." }
    }

    const { error } = await supabase
      .from('memberships')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('profile_id', profileId)

    if (error) throw error

    revalidatePath('/settings/team')
    return { success: true }
  } catch (error) {
    console.error("Error removing member:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to remove member." }
  }
}

export async function updateMemberRole(profileId: string, newRole: WorkspaceRole) {
  try {
    // 1. Runtime validation of newRole
    if (newRole !== 'member' && newRole !== 'admin' && newRole !== 'owner') {
      return { success: false, error: "This role change is not allowed." }
    }

    // 2. Fetch authenticated context
    const { workspaceId, role: currentRole, user } = await requireWorkspaceAccess()
    
    // 3. Server Authorization checks
    if (currentRole !== 'owner') {
      return { success: false, error: "You don't have permission to change member roles." }
    }

    if (profileId === user.id) {
      return { success: false, error: "You cannot change your own role." }
    }

    const supabase = createSupabase()

    // 4. Fetch target membership first to ensure it belongs to the workspace
    const { data: targetMembership, error: targetError } = await supabase
      .from('memberships')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('profile_id', profileId)
      .single()

    if (targetError || !targetMembership) {
      return { success: false, error: "Member not found in this workspace." }
    }

    // 5. User-friendly last owner check (Database Trigger acts as final defense)
    if (targetMembership.role === 'owner' && newRole !== 'owner') {
      const { data: owners } = await supabase
        .from('memberships')
        .select('profile_id')
        .eq('workspace_id', workspaceId)
        .eq('role', 'owner')
      
      if (owners && owners.length <= 1) {
        return { success: false, error: "The workspace must have at least one owner." }
      }
    }

    // 6. Update Database
    const { error } = await supabase
      .from('memberships')
      .update({ role: newRole as WorkspaceRole })
      .eq('workspace_id', workspaceId)
      .eq('profile_id', profileId)

    if (error) {
      throw error
    }

    revalidatePath('/settings/team')
    return { success: true }
  } catch (error: unknown) {
    console.error("Error updating member role:", error)
    if (error instanceof Error) {
      if (error.message.includes('Cannot remove or demote the last owner')) {
        return { success: false, error: "The workspace must have at least one owner." }
      }
      return { success: false, error: "Failed to update member role. Please try again." }
    }
    return { success: false, error: "Failed to update member role. Please try again." }
  }
}
