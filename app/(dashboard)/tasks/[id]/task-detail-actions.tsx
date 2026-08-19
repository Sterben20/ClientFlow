"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Edit, Trash, MoreHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog"
import { TaskFormDialog } from "@/components/tasks/task-form-dialog"
import { deleteTask } from "@/app/(dashboard)/tasks/actions"
import { useToast } from "@/hooks/use-toast"
import type { Task, ProjectOption, ClientOption } from "@/types"

export function TaskDetailActions({ task, clients, projects, currentUser }: { task: Task, clients: ClientOption[], projects: ProjectOption[], currentUser: { id: string, role: string } }) {
  const router = useRouter()
  const { toast } = useToast()
  
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDelete() {
    setIsDeleting(true)
    const result = await deleteTask(task.id)
    setIsDeleting(false)
    setIsDeleteOpen(false)

    if (result.success) {
      toast({
        title: "Task deleted",
        description: "The task has been successfully deleted.",
      })
      router.push('/tasks')
      router.refresh()
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to delete task.",
        variant: "destructive"
      })
    }
  }

  const canEdit = currentUser.role !== 'member' || task.created_by === currentUser.id;

  if (!canEdit && currentUser.role === 'member') {
    return null; // Hide actions completely if unauthorized member
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {canEdit && (
          <Button variant="outline" className="hidden sm:flex gap-2" onClick={() => setIsEditOpen(true)}>
            <Edit className="h-4 w-4" />
            Edit Task
          </Button>
        )}
        {currentUser.role !== 'member' && (
          <Button variant="destructive" className="hidden sm:flex gap-2" onClick={() => setIsDeleteOpen(true)}>
            <Trash className="h-4 w-4" />
            Delete
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="sm:hidden">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {canEdit && (
              <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Task
              </DropdownMenuItem>
            )}
            {currentUser.role !== 'member' && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:bg-destructive focus:text-destructive-foreground" onClick={() => setIsDeleteOpen(true)}>
                  <Trash className="h-4 w-4 mr-2" />
                  Delete Task
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <TaskFormDialog 
        task={task} 
        clients={clients}
        projects={projects}
        open={isEditOpen} 
        onOpenChange={setIsEditOpen} 
      />

      <ConfirmDeleteDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={handleDelete}
        title="Delete task?"
        description="This will permanently delete this task. This action cannot be undone."
        isPending={isDeleting}
      />
    </>
  )
}
