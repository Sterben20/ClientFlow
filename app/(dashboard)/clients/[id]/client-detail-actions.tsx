"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { MoreHorizontal, Edit, Trash } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ClientFormDialog } from "@/components/clients/client-form-dialog"
import { deleteClient } from "@/app/(dashboard)/clients/actions"
import { useToast } from "@/hooks/use-toast"
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog"
import type { Client } from "@/types"

export function ClientDetailActions({ client, currentUser }: { client: Client, currentUser: { id: string, role: string } }) {
  const router = useRouter()
  const { toast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isPending, setIsPending] = useState(false)

  async function handleDeleteConfirm() {
    setIsPending(true)
    const result = await deleteClient(client.id)
    setIsPending(false)
    setIsDeleting(false)
    if (result.success) {
      toast({ title: "Client deleted" })
      router.push("/clients")
      router.refresh()
    } else {
      toast({ 
        title: "Error deleting client", 
        description: result.error,
        variant: "destructive"
      })
    }
  }

  const canEdit = currentUser.role !== 'member' || client.created_by === currentUser.id;

  if (!canEdit && currentUser.role === 'member') {
    return null; // Return nothing if member cannot edit and cannot delete
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {canEdit && (
          <Button variant="outline" onClick={() => setIsEditing(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        )}
        {currentUser.role !== 'member' && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:bg-destructive focus:text-destructive-foreground" onClick={() => setIsDeleting(true)}>
                <Trash className="h-4 w-4 mr-2" />
                Delete Client
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <ClientFormDialog 
        client={client} 
        open={isEditing} 
        onOpenChange={(open) => {
          setIsEditing(open)
          if (!open) {
            router.refresh()
          }
        }} 
      />

      <ConfirmDeleteDialog
        open={isDeleting}
        onOpenChange={setIsDeleting}
        onConfirm={handleDeleteConfirm}
        title="Delete client?"
        description="This client and its associated data will be permanently deleted. This action cannot be undone."
        isPending={isPending}
      />
    </>
  )
}
