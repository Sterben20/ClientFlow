import Link from "next/link";
import { logout } from "@/app/login/actions";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  FolderKanban,
  CheckSquare,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient as createSupabase } from "@/lib/supabase/server"
import { getCurrentWorkspace } from "@/lib/workspace"
import { WorkspaceSwitcher } from "@/components/workspace-switcher"
import { ThemeToggle } from "@/components/theme-toggle"

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Clients", href: "/clients", icon: Users },
  { name: "Projects", href: "/projects", icon: Briefcase },
  { name: "Deals", href: "/deals", icon: FolderKanban },
  { name: "Tasks", href: "/tasks", icon: CheckSquare },
  { name: "Settings", href: "/settings", icon: Settings },
];

export async function Sidebar({ className }: { className?: string }) {
  const supabase = createSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  
  let workspaces: { id: string; name: string; role: string }[] = []
  let activeWorkspaceId = ""
  let profile: { full_name: string | null; email: string | null } | null = null

  if (user) {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single()
    
    if (profileData) profile = profileData

    const { data: userWorkspaces } = await supabase
      .from('memberships')
      .select(`
        role,
        workspace_id,
        workspaces (
          id,
          name
        )
      `)
      .eq('profile_id', user.id)

    if (userWorkspaces) {
      workspaces = (userWorkspaces as unknown as { workspace_id: string; role: string; workspaces: { id: string; name: string } }[]).map((m) => ({
        id: m.workspaces.id,
        name: m.workspaces.name,
        role: m.role
      }))
    }

    const access = await getCurrentWorkspace()
    if (access) {
      activeWorkspaceId = access.workspaceId
    }
  }

  return (
    <div className={cn("hidden lg:flex h-screen w-64 flex-col border-r bg-card text-card-foreground", className)}>
      <div className="p-6 pb-2">
        <h2 className="text-2xl font-bold tracking-tight text-primary">ClientFlow</h2>
      </div>
      
      <div className="px-4 mb-4">
        {workspaces.length > 0 && (
          <WorkspaceSwitcher 
            workspaces={workspaces} 
            currentWorkspaceId={activeWorkspaceId} 
          />
        )}
      </div>

      <nav className="flex-1 space-y-1 px-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-secondary-foreground transition-all"
            >
              <Icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 px-3">
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0">
              {profile?.full_name?.charAt(0).toUpperCase() || profile?.email?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="flex flex-col overflow-hidden flex-1">
              <span className="text-sm font-medium truncate">{profile?.full_name || user?.email || "My Account"}</span>
              <span className="text-xs text-muted-foreground capitalize">
                {workspaces.find(w => w.id === activeWorkspaceId)?.role || "Member"}
              </span>
            </div>
            <ThemeToggle />
          </div>
          <form action={logout}>
            <button type="submit" className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-all">
              Log out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
