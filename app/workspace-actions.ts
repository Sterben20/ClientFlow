'use server'

import { cookies } from 'next/headers'
import { WORKSPACE_COOKIE_NAME } from '@/lib/workspace'

import { createClient } from '@/lib/supabase/server'

export async function switchWorkspace(workspaceId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error("Unauthorized")
  }

  // Verify the user actually has access to this workspace ID
  const { data: membership } = await supabase
    .from('memberships')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('profile_id', user.id)
    .single()

  if (!membership) {
    throw new Error("Forbidden: You do not have access to this workspace")
  }

  cookies().set({
    name: WORKSPACE_COOKIE_NAME,
    value: workspaceId,
    httpOnly: true,
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  })
}
