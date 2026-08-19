'use server'

import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

export async function forgotPassword(formData: FormData) {
  const supabase = createClient()
  const email = formData.get('email') as string
  
  if (!email) {
    return { error: 'Email is required' }
  }

  // Get origin for the redirect callback
  const headerList = headers()
  const host = headerList.get('host') || 'localhost:3000'
  const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https'
  const origin = `${protocol}://${host}`

  // Call Supabase to send the recovery email.
  // The 'next' parameter will securely pass the final destination /reset-password
  // to our own /auth/callback route, which will exchange the code first.
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  })

  if (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.log("=== FORGOT PASSWORD ERROR ===")
      console.log("- Message:", error.message)
      console.log("- Status:", error.status)
      console.log("- Name:", error.name)
    }
    // Still return the generic message below to avoid exposing account existence
  }

  // Generic message
  return { 
    success: 'If an account exists for that email, we sent a password reset link.' 
  }
}
