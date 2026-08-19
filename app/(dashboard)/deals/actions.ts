'use server'

import { createClient as createSupabase } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireWorkspaceAccess } from '@/lib/workspace'

export type DealStage = 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';

export interface DealData {
  id?: string;
  client_id: string;
  owner_id?: string | null;
  name: string;
  value: number;
  expected_close_date: string | null;
  stage: DealStage;
}

export async function getDeals() {
  const { workspaceId } = await requireWorkspaceAccess()
  const supabase = createSupabase()
  
  const { data, error } = await supabase
    .from('deals')
    .select(`
      *,
      clients (
        name,
        company,
        email
      ),
      profiles (
        full_name,
        email,
        avatar_url
      )
    `)
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error("Error fetching deals:", error)
    return []
  }

  return data
}

export async function getClientsForDeals() {
  const { workspaceId } = await requireWorkspaceAccess()
  const supabase = createSupabase()
  
  const { data, error } = await supabase
    .from('clients')
    .select('id, name, company')
    .eq('workspace_id', workspaceId)
    .order('name', { ascending: true })

  if (error) {
    console.error("Error fetching clients for deals:", error)
    return []
  }

  return data
}

import type { Profile } from '@/types'

export async function getWorkspaceMembers(): Promise<Profile[]> {
  const { workspaceId } = await requireWorkspaceAccess()
  const supabase = createSupabase()
  
  const { data, error } = await supabase
    .from('memberships')
    .select(`
      profiles (
        id,
        full_name,
        email,
        avatar_url
      )
    `)
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error("Error fetching workspace members:", error)
    return []
  }

  // Supabase returns related objects which could be inferred as arrays in some types.
  // We extract and flatten the profiles.
  return data.flatMap(m => {
    if (Array.isArray(m.profiles)) return m.profiles;
    if (m.profiles) return [m.profiles];
    return [];
  })
}

export async function createDeal(data: DealData) {
  try {
    const { workspaceId, user, role } = await requireWorkspaceAccess()
    const supabase = createSupabase()
    
    // Member authorization check
    let finalOwnerId = data.owner_id || user.id
    if (role === 'member') {
      finalOwnerId = user.id
    }
    
    const { error } = await supabase
      .from('deals')
      .insert({
        ...data,
        workspace_id: workspaceId,
        owner_id: finalOwnerId
      })

    if (error) throw error

    revalidatePath('/deals')
    return { success: true }
  } catch (error) {
    console.error("Error creating deal:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to create deal." }
  }
}

export async function updateDeal(id: string, data: DealData) {
  try {
    const { workspaceId, user, role } = await requireWorkspaceAccess()
    const supabase = createSupabase()
    
    if (role === 'member') {
      const { data: deal } = await supabase
        .from('deals')
        .select('owner_id')
        .eq('id', id)
        .eq('workspace_id', workspaceId)
        .single()
        
      if (!deal || deal.owner_id !== user.id) {
        return { success: false, error: "You don't have permission to modify this deal." }
      }
      
      if (data.owner_id && data.owner_id !== user.id) {
        return { success: false, error: "You don't have permission to modify this deal." }
      }
      data.owner_id = user.id
    }
    
    // Remove workspace_id from payload if it exists
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { workspace_id: _, ...updatePayload } = data as Partial<DealData> & { workspace_id?: string }

    const { error } = await supabase
      .from('deals')
      .update(updatePayload)
      .eq('id', id)
      .eq('workspace_id', workspaceId)

    if (error) throw error

    revalidatePath('/deals')
    return { success: true }
  } catch (error) {
    console.error("Error updating deal:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to update deal." }
  }
}

export async function updateDealStage(id: string, stage: DealStage) {
  try {
    const { workspaceId, user, role } = await requireWorkspaceAccess()
    const supabase = createSupabase()
    
    if (role === 'member') {
      const { data: deal } = await supabase
        .from('deals')
        .select('owner_id')
        .eq('id', id)
        .eq('workspace_id', workspaceId)
        .single()
        
      if (!deal || deal.owner_id !== user.id) {
        return { success: false, error: "You don't have permission to modify this deal." }
      }
    }
    
    const { error } = await supabase
      .from('deals')
      .update({ stage })
      .eq('id', id)
      .eq('workspace_id', workspaceId)

    if (error) throw error

    revalidatePath('/deals')
    return { success: true }
  } catch (error) {
    console.error("Error updating deal stage:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to update deal stage." }
  }
}

export async function deleteDeal(id: string) {
  try {
    const { workspaceId, role } = await requireWorkspaceAccess()
    if (role === 'member') {
      return { success: false, error: "Members cannot delete deals." }
    }
    
    const supabase = createSupabase()
    const { error } = await supabase
      .from('deals')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId)

    if (error) throw error

    revalidatePath('/deals')
    return { success: true }
  } catch (error) {
    console.error("Error deleting deal:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete deal." }
  }
}
