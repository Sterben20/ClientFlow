'use server'

import { createClient } from '@/lib/supabase/server'

export async function resetPassword(formData: FormData) {
  const supabase = createClient()
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string
  
  if (!password || !confirmPassword) {
    return { error: 'Both fields are required.' }
  }

  if (password !== confirmPassword) {
    return { error: 'Passwords do not match.' }
  }

  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters long.' }
  }

  // Use the established recovery session to update the password.
  // This operation inherently fails if no valid authenticated session exists.
  const { error } = await supabase.auth.updateUser({
    password: password
  })

  if (error) {
    console.error('Password reset error:', error.message)
    return { error: 'Unable to reset your password. Your link may be invalid or expired. Please request a new reset link.' }
  }

  // After a successful password reset, sign out the temporary recovery session.
  await supabase.auth.signOut()

  return { success: true }
}
