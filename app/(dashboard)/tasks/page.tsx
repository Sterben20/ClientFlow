import { getTasks, getOptionsForTasks } from "./actions"
import { TaskList } from "@/components/tasks/task-list"
import { TaskFormDialog } from "@/components/tasks/task-form-dialog"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

import { requireWorkspaceAccess } from "@/lib/workspace"

export default async function TasksPage() {
  const tasks = await getTasks()
  const { clients, projects } = await getOptionsForTasks()
  const { role, user } = await requireWorkspaceAccess()
  const currentUser = { id: user.id, role }

  return (
    <div className="p-4 lg:p-8 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Tasks</h2>
          <p className="text-muted-foreground mt-2">
            Track and manage your tasks.
          </p>
        </div>
        <TaskFormDialog clients={clients} projects={projects}>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Task
          </Button>
        </TaskFormDialog>
      </div>

      <TaskList tasks={tasks} clients={clients} projects={projects} currentUser={currentUser} />
    </div>
  )
}
