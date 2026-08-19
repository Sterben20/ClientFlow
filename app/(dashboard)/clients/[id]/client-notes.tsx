"use client"

import { useState } from "react"
import { format } from "date-fns"
import { MoreHorizontal, Edit, Trash, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { createClientNote, updateClientNote, deleteClientNote, ClientNoteData } from "@/app/(dashboard)/clients/actions"
import type { WorkspaceRole } from "@/lib/workspace"

interface ClientNotesProps {
  clientId: string
  notes: ClientNoteData[]
  currentUserId: string
  currentUserRole: WorkspaceRole
}

export function ClientNotes({ clientId, notes, currentUserId, currentUserRole }: ClientNotesProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingNote, setEditingNote] = useState<ClientNoteData | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [noteToDelete, setNoteToDelete] = useState<ClientNoteData | null>(null)
  const [content, setContent] = useState("")
  const [isPending, setIsPending] = useState(false)
  const { toast } = useToast()

  function openCreateDialog() {
    setEditingNote(null)
    setContent("")
    setIsDialogOpen(true)
  }

  function openEditDialog(note: ClientNoteData) {
    setEditingNote(note)
    setContent(note.content)
    setIsDialogOpen(true)
  }

  async function handleSave() {
    const trimmed = content.trim()
    if (!trimmed) {
      toast({ title: "Note cannot be empty", variant: "destructive" })
      return
    }
    if (trimmed.length > 10000) {
      toast({ title: "Note exceeds 10,000 characters limit", variant: "destructive" })
      return
    }

    setIsPending(true)
    let result
    if (editingNote) {
      result = await updateClientNote(editingNote.id, trimmed)
    } else {
      result = await createClientNote(clientId, trimmed)
    }
    setIsPending(false)

    if (result.success) {
      toast({ title: editingNote ? "Note updated" : "Note created" })
      setIsDialogOpen(false)
    } else {
      toast({ title: "Error saving note", description: result.error, variant: "destructive" })
    }
  }

  function confirmDelete(note: ClientNoteData) {
    setNoteToDelete(note)
    setIsDeleteDialogOpen(true)
  }

  async function handleDeleteConfirm() {
    if (!noteToDelete) return
    setIsPending(true)
    const result = await deleteClientNote(noteToDelete.id)
    setIsPending(false)
    
    if (result.success) {
      setIsDeleteDialogOpen(false)
      setNoteToDelete(null)
      toast({ title: "Note deleted" })
    } else {
      // Keep dialog open if desired, but user specifically asked to "Close the dialog appropriately" if failed
      setIsDeleteDialogOpen(false)
      setNoteToDelete(null)
      toast({ title: "Unable to delete note", description: result.error, variant: "destructive" })
    }
  }

  function canManageNote(note: ClientNoteData) {
    if (currentUserRole === 'owner' || currentUserRole === 'admin') return true
    if (note.author_id === currentUserId) return true
    return false
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Notes</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-1" />
              Add Note
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingNote ? "Edit Note" : "Add Note"}</DialogTitle>
              <DialogDescription>
                Keep important client information in one place.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your note here..."
                className="min-h-[150px]"
                disabled={isPending}
                maxLength={10000}
                aria-label="Note content"
              />
              <div className="text-xs text-muted-foreground mt-2 flex justify-between">
                <span>Markdown is not supported yet.</span>
                <span>{content.length} / 10000</span>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isPending || !content.trim()}>
                {isPending ? "Saving..." : "Save Note"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete note?</AlertDialogTitle>
              <AlertDialogDescription>
                This note will be permanently deleted. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
              <Button 
                variant="destructive" 
                onClick={handleDeleteConfirm} 
                disabled={isPending}
              >
                {isPending ? "Deleting..." : "Delete"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardHeader>
      <CardContent className="space-y-4">
        {notes.length === 0 ? (
          <div className="text-center py-6 border rounded-md border-dashed">
            <p className="text-sm font-medium mb-1">No notes yet</p>
            <p className="text-sm text-muted-foreground mb-4">Add a note to keep important client information in one place.</p>
            <Button variant="outline" size="sm" onClick={openCreateDialog}>Add Note</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {notes.map((note) => {
              const authorName = note.profiles?.full_name || note.profiles?.email || "Unknown User"
              const canManage = canManageNote(note)
              
              return (
                <div key={note.id} className="border rounded-md p-4 relative group">
                  <div className="flex justify-between items-start gap-4 mb-3">
                    <div>
                      <p className="text-sm font-medium">{authorName}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(note.created_at), "MMM d, yyyy 'at' h:mm a")}
                        {note.updated_at !== note.created_at && " (edited)"}
                      </p>
                    </div>
                    {canManage && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 -mt-2 -mr-2 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100" aria-label="Note actions">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(note)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive focus:bg-destructive focus:text-destructive-foreground" onClick={() => confirmDelete(note)}>
                            <Trash className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                  <div className="whitespace-pre-wrap text-sm">{note.content}</div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
