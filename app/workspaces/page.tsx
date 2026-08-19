import { createClient as createSupabase } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"

import { switchWorkspace } from "@/app/workspace-actions"
import { Briefcase } from "lucide-react"
import { SubmitButton } from "./submit-button"

export default async function WorkspacesPage() {
  const supabase = createSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect("/login")
  }

  const { data: memberships, error } = await supabase
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

  if (error || !memberships || memberships.length === 0) {
    // If they have no workspaces, they probably need to create one,
    // but in our app a workspace is created on signup. 
    // If this happens, it's an edge case.
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <div className="max-w-md w-full text-center space-y-4">
          <h1 className="text-2xl font-bold">No Workspaces Found</h1>
          <p className="text-muted-foreground">You do not belong to any workspaces.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <div className="max-w-xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Select Workspace</h1>
          <p className="text-muted-foreground mt-2">Choose a workspace to continue to your dashboard.</p>
        </div>

        <div className={`grid gap-4 ${memberships.length === 1 ? 'max-w-sm mx-auto w-full' : 'sm:grid-cols-2'}`}>
          {(memberships as unknown as { workspace_id: string, role: string, workspaces: { id: string, name: string } }[]).map((m) => (
            <Card key={m.workspace_id} className="hover:border-primary transition-colors">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-primary" />
                  <span className="truncate">{m.workspaces.name}</span>
                </CardTitle>
                <CardDescription className="capitalize">
                  Role: {m.role}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form action={async () => {
                  "use server"
                  await switchWorkspace(m.workspace_id)
                  redirect("/dashboard")
                }}>
                  <SubmitButton />
                </form>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
