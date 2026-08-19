import { getProjects, getClientsForSelect } from "./actions"
import { requireWorkspaceAccess } from "@/lib/workspace"
import { ProjectList } from "@/components/projects/project-list"
import { ProjectFormDialog } from "@/components/projects/project-form-dialog"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

export default async function ProjectsPage() {
  const { user, role } = await requireWorkspaceAccess()
  const currentUser = { id: user.id, role }
  const projects = await getProjects()
  const clients = await getClientsForSelect()

  return (
    <div className="p-4 lg:p-8 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Projects</h2>
          <p className="text-muted-foreground mt-2">
            Track and manage your ongoing work for clients.
          </p>
        </div>
        <ProjectFormDialog clients={clients}>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </ProjectFormDialog>
      </div>

      <ProjectList projects={projects} clients={clients} currentUser={currentUser} />
    </div>
  )
}
