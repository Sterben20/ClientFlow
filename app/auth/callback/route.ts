import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin, pathname } = new URL(request.url)
  const code = searchParams.get('code')
  let next = searchParams.get('next') ?? '/'

  console.log("=== CALLBACK DIAGNOSTICS ===")
  console.log("Pathname:", pathname)
  console.log("Code exists:", !!code)
  console.log("Next parameter:", next)

  // Ensure next is a relative path to prevent open redirect vulnerabilities
  if (!next.startsWith('/') || next.startsWith('//')) {
    next = '/'
  }

  if (code) {
    const cookieStore = cookies()
    // Explicitly create the response object FIRST so we can attach cookies to it
    const response = NextResponse.redirect(`${origin}${next}`)
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              // Set on the request cookies so subsequent calls see it
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
              // Explicitly set on the response we are returning to ensure preservation
              cookiesToSet.forEach(({ name, value, options }) =>
                response.cookies.set(name, value, options)
              )
            } catch (error) {
              console.error("Cookie set error in callback:", error)
            }
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      console.log("exchangeCodeForSession: SUCCESS")
      return response
    } else {
      console.log("exchangeCodeForSession ERROR:")
      console.log("- message:", error.message)
      console.log("- status:", error.status)
      console.log("- code:", error.code ?? 'N/A')
      console.log("- name:", error.name)
      
      return NextResponse.redirect(`${origin}/login?error=Exchange Failed: ${encodeURIComponent(error.message)}`)
    }
  } else {
    console.log("exchangeCodeForSession: SKIPPED (no code found in URL)")
    return NextResponse.redirect(`${origin}/login?error=No recovery code found in link`)
  }
}
