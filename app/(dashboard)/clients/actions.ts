'use server'

import { createClient as createSupabase } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireWorkspaceAccess } from '@/lib/workspace'
import { validatePhone } from '@/lib/validations'

export type ClientStatus = 'lead' | 'prospect' | 'active' | 'inactive';

export interface ClientData {
  id?: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  status: ClientStatus;
  source: string | null;
  notes: string | null;
}

export async function getClients() {
  const { workspaceId } = await requireWorkspaceAccess()
  const supabase = createSupabase()
  
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error("Error fetching clients:", error)
    return []
  }

  return data
}

export async function createClient(data: ClientData) {
  try {
    const { workspaceId, user } = await requireWorkspaceAccess()
    const supabase = createSupabase()
    
    let validatedPhone = null;
    try {
      validatedPhone = validatePhone(data.phone);
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Invalid phone number." }
    }
    
    // Explicitly strip created_by and workspace_id from payload
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { workspace_id: _ws, created_by: _cb, ...safeData } = data as unknown as Record<string, unknown>

    const { error } = await supabase
      .from('clients')
      .insert({
        ...safeData,
        phone: validatedPhone,
        workspace_id: workspaceId,
        created_by: user.id, // Explicitly set created_by to the authenticated user
      })

    if (error) throw error

    revalidatePath('/clients')
    return { success: true }
  } catch (error) {
    console.error("Error creating client:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to create client." }
  }
}

export async function updateClient(id: string, data: ClientData) {
  try {
    const { workspaceId, role, user } = await requireWorkspaceAccess()
    const supabase = createSupabase()
    
    if (role === 'member') {
      const { data: client } = await supabase
        .from('clients')
        .select('created_by')
        .eq('id', id)
        .eq('workspace_id', workspaceId)
        .single()
        
      if (!client || client.created_by !== user.id) {
        return { success: false, error: "You don't have permission to modify this client." }
      }
    }
    
    // Remove workspace_id and created_by from payload if they exist
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { workspace_id: _ws, created_by: _cb, ...updatePayload } = data as unknown as Record<string, unknown>

    if ('phone' in updatePayload && typeof updatePayload.phone === 'string') {
      try {
        updatePayload.phone = validatePhone(updatePayload.phone);
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "Invalid phone number." }
      }
    }

    const { error } = await supabase
      .from('clients')
      .update(updatePayload)
      .eq('id', id)
      .eq('workspace_id', workspaceId)

    if (error) throw error

    revalidatePath('/clients')
    return { success: true }
  } catch (error) {
    console.error("Error updating client:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to update client." }
  }
}

export async function deleteClient(id: string) {
  try {
    const { workspaceId, role } = await requireWorkspaceAccess()
    if (role === 'member') {
      return { success: false, error: "Members cannot delete clients." }
    }
    
    const supabase = createSupabase()
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId)

    if (error) throw error

    revalidatePath('/clients')
    return { success: true }
  } catch (error) {
    console.error("Error deleting client:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete client." }
  }
}

// ==========================================
// CLIENT NOTES
// ==========================================

export interface ClientNoteData {
  id: string
  client_id: string
  author_id: string
  content: string
  created_at: string
  updated_at: string
  profiles?: {
    full_name: string | null
    email: string
  }
}

export async function createClientNote(clientId: string, content: string) {
  try {
    const { workspaceId, user } = await requireWorkspaceAccess()
    const supabase = createSupabase()

    const trimmedContent = content.trim()
    if (trimmedContent.length === 0 || trimmedContent.length > 10000) {
      return { success: false, error: "Note content must be between 1 and 10,000 characters." }
    }

    // Explicitly verify the client belongs to the current workspace before proceeding
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .eq('id', clientId)
      .eq('workspace_id', workspaceId)
      .single()

    if (clientError || !client) {
      return { success: false, error: "Client not found or unauthorized." }
    }

    const { error } = await supabase
      .from('client_notes')
      .insert({
        workspace_id: workspaceId,
        client_id: clientId,
        author_id: user.id,
        content: trimmedContent,
      })

    if (error) throw error

    revalidatePath(`/clients/${clientId}`)
    return { success: true }
  } catch (error) {
    console.error("Error creating note:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to create note." }
  }
}

export async function updateClientNote(noteId: string, content: string) {
  try {
    const { workspaceId, role, user } = await requireWorkspaceAccess()
    const supabase = createSupabase()

    const trimmedContent = content.trim()
    if (trimmedContent.length === 0 || trimmedContent.length > 10000) {
      return { success: false, error: "Note content must be between 1 and 10,000 characters." }
    }

    // Verify note exists in current workspace and get its details
    const { data: note, error: noteError } = await supabase
      .from('client_notes')
      .select('author_id, client_id')
      .eq('id', noteId)
      .eq('workspace_id', workspaceId)
      .single()

    if (noteError || !note) {
      return { success: false, error: "Note not found or unauthorized." }
    }

    if (role === 'member' && note.author_id !== user.id) {
      return { success: false, error: "Members can only edit their own notes." }
    }

    const { error } = await supabase
      .from('client_notes')
      .update({ content: trimmedContent })
      .eq('id', noteId)
      .eq('workspace_id', workspaceId)

    if (error) throw error

    revalidatePath(`/clients/${note.client_id}`)
    return { success: true }
  } catch (error) {
    console.error("Error updating note:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to update note." }
  }
}

export async function deleteClientNote(noteId: string) {
  try {
    const { workspaceId, role, user } = await requireWorkspaceAccess()
    const supabase = createSupabase()

    // Verify note exists in current workspace and get its details
    const { data: note, error: noteError } = await supabase
      .from('client_notes')
      .select('author_id, client_id')
      .eq('id', noteId)
      .eq('workspace_id', workspaceId)
      .single()

    if (noteError || !note) {
      return { success: false, error: "Note not found or unauthorized." }
    }

    if (role === 'member' && note.author_id !== user.id) {
      return { success: false, error: "Members can only delete their own notes." }
    }

    const { error } = await supabase
      .from('client_notes')
      .delete()
      .eq('id', noteId)
      .eq('workspace_id', workspaceId)

    if (error) throw error

    revalidatePath(`/clients/${note.client_id}`)
    return { success: true }
  } catch (error) {
    console.error("Error deleting note:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete note." }
  }
}
