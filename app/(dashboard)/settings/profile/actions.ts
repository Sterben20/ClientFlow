"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function updateProfile(formData: FormData) {
  const supabase = createClient()
  const fullName = formData.get("fullName")?.toString().trim()

  if (!fullName) {
    return { error: "Full name is required." }
  }

  // Securely get the authenticated user ID
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "Unauthorized." }
  }

  // Update profile
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ full_name: fullName })
    .eq("id", user.id)

  if (updateError) {
    return { error: updateError.message }
  }

  revalidatePath("/settings/profile")
  revalidatePath("/", "layout")
  return { success: true }
}
