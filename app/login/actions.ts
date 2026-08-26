'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/** Validates a redirect path to prevent open-redirect vulnerabilities. */
function safeRedirect(path: string | null, fallback = '/'): string {
  if (!path || !path.startsWith('/') || path.startsWith('//')) {
    return fallback
  }
  return path
}

export async function login(formData: FormData) {
  const supabase = createClient()

  // type-casting here for convenience
  // in practice, you should validate your inputs
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect(safeRedirect(formData.get('redirect') as string, '/'))
}

export async function signup(formData: FormData) {
  const supabase = createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    options: {
      data: {
        full_name: formData.get('fullName') as string,
      }
    }
  }

  const { data: result, error } = await supabase.auth.signUp(data)

  if (error) {
    console.error("Signup error:", error)
    return { error: error.message }
  }

  // The DB trigger `handle_new_user` creates a workspace and membership synchronously.
  // Fetch that workspace to set it explicitly as active.
  if (result.user) {
    const { data: membership } = await supabase
      .from('memberships')
      .select('workspace_id')
      .eq('profile_id', result.user.id)
      .single()
      
    if (membership) {
      const { cookies } = await import('next/headers')
      const { WORKSPACE_COOKIE_NAME } = await import('@/lib/workspace')
      cookies().set({
        name: WORKSPACE_COOKIE_NAME,
        value: membership.workspace_id,
        httpOnly: true,
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      })
    }
  }

  revalidatePath('/', 'layout')
  redirect(safeRedirect(formData.get('redirect') as string, '/dashboard'))
}

export async function logout() {
  const supabase = createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
