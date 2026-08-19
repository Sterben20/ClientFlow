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
import { ProjectFormDialog } from "@/components/projects/project-form-dialog"
import { deleteProject } from "@/app/(dashboard)/projects/actions"
import { useToast } from "@/hooks/use-toast"
import type { Project, ClientOption } from "@/types"

export function ProjectDetailActions({ project, clients, currentUser }: { project: Project, clients: ClientOption[], currentUser: { id: string, role: string } }) {
  const router = useRouter()
  const { toast } = useToast()
  
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDelete() {
    setIsDeleting(true)
    const result = await deleteProject(project.id)
    setIsDeleting(false)
    setIsDeleteOpen(false)

    if (result.success) {
      toast({
        title: "Project deleted",
        description: "The project has been successfully deleted.",
      })
      router.push('/projects')
      router.refresh()
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to delete project.",
        variant: "destructive"
      })
    }
  }

  const canEdit = currentUser.role !== 'member' || project.created_by === currentUser.id;

  if (!canEdit && currentUser.role === 'member') {
    return null; // Hide actions completely if unauthorized member
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {canEdit && (
          <Button variant="outline" className="hidden sm:flex gap-2" onClick={() => setIsEditOpen(true)}>
            <Edit className="h-4 w-4" />
            Edit Project
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
                Edit Project
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {currentUser.role !== 'member' && (
              <DropdownMenuItem className="text-destructive focus:bg-destructive focus:text-destructive-foreground" onClick={() => setIsDeleteOpen(true)}>
                <Trash className="h-4 w-4 mr-2" />
                Delete Project
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ProjectFormDialog 
        project={project} 
        clients={clients} 
        open={isEditOpen} 
        onOpenChange={setIsEditOpen} 
      />

      <ConfirmDeleteDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={handleDelete}
        title="Delete project?"
        description="This will permanently delete this project. This action cannot be undone."
        isPending={isDeleting}
      />
    </>
  )
}
