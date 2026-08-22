import { createClient } from "@/lib/supabase/server"
import { requireWorkspaceAccess } from "@/lib/workspace"
import { ProfileSettingsClient } from "@/components/settings/profile-settings-client"

export default async function SettingsPage() {
  const supabase = createClient()
  const { user, role } = await requireWorkspaceAccess()

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .single()

  return (
    <div className="p-4 lg:p-6">
      <h2 className="text-3xl font-bold tracking-tight mb-6">Settings</h2>
      
      <ProfileSettingsClient 
        profile={{
          full_name: profile?.full_name || null,
          email: profile?.email || user.email || null,
        }}
        role={role}
      />
    </div>
  );
}
