'use server'

import { createClient as createSupabase } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'

export async function getInvitationDetails(token: string) {
  const supabase = createSupabase()
  
  // Call the SECURITY DEFINER function to securely fetch invite details
  const { data, error } = await supabase.rpc('get_invitation_details', { invite_token: token })
  
  if (error) {
    console.error("Error fetching invitation details:", error)
    return null
  }
  
  if (!data || data.length === 0) {
    return null
  }
  
  return data[0]
}

export async function acceptInvitation(token: string) {
  try {
    const supabase = createSupabase()
    
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return { success: false, error: "You must be logged in to accept an invitation." }
    }
    
    // Call the SECURITY DEFINER function to securely accept and join
    const { data: workspaceId, error } = await supabase.rpc('accept_invitation', { invite_token: token })
    
    if (error) {
      console.error("RPC Error:", error)
      return { success: false, error: error.message || "Failed to accept invitation." }
    }
    
    // Set the cookie so they are automatically switched to the new workspace
    cookies().set('clientflow_workspace_id', workspaceId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    })
    
    revalidatePath('/dashboard')
    
    return { success: true, workspaceId }
  } catch (error) {
    console.error("Error accepting invitation:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to accept invitation." }
  }
}
