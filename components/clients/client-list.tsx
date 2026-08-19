"use client"

import { useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { MoreHorizontal, Edit, Trash, ExternalLink, Mail, Phone } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { deleteClient } from "@/app/(dashboard)/clients/actions"
import { useToast } from "@/hooks/use-toast"
import { ClientFormDialog } from "./client-form-dialog"
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog"
import type { Client } from "@/types"

export function ClientList({ clients, currentUser }: { clients: Client[], currentUser: { id: string, role: string } }) {
  const { toast } = useToast()
  const [editingClient, setEditingClient] = useState<Client | null>(null)

  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  async function handleDeleteConfirm() {
    if (!deletingId) return
    setIsPending(true)
    const result = await deleteClient(deletingId)
    setIsPending(false)
    setDeletingId(null)
    if (result.success) {
      toast({ title: "Client deleted" })
    } else {
      toast({ 
        title: "Error deleting client", 
        description: result.error,
        variant: "destructive"
      })
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'active':
        return <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20">Active</Badge>
      case 'lead':
        return <Badge variant="outline" className="text-muted-foreground">Lead</Badge>
      case 'prospect':
        return <Badge className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/20">Prospect</Badge>
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (clients.length === 0) {
    return (
      <div className="text-center p-12 border rounded-lg border-dashed">
        <h3 className="text-lg font-medium">No clients yet</h3>
        <p className="text-sm text-muted-foreground mt-1">Get started by adding your first client.</p>
        <div className="mt-6">
          <ClientFormDialog>
            <Button>Add Client</Button>
          </ClientFormDialog>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Added</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((client) => (
              <TableRow key={client.id}>
                <TableCell>
                  <Link href={`/clients/${client.id}`} className="font-medium hover:underline flex items-center transition-colors">
                    {client.name}
                  </Link>
                  {client.company && (
                    <div className="text-xs text-muted-foreground">{client.company}</div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                    {client.email && (
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3 w-3" />
                        <a href={`mailto:${client.email}`} className="hover:underline">{client.email}</a>
                      </div>
                    )}
                    {client.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3 w-3" />
                        <a href={`tel:${client.phone}`} className="hover:underline">{client.phone}</a>
                      </div>
                    )}
                    {!client.email && !client.phone && <span className="text-xs italic">No contact info</span>}
                  </div>
                </TableCell>
                <TableCell>
                  {getStatusBadge(client.status)}
                </TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                  {format(new Date(client.created_at), 'MMM d, yyyy')}
                </TableCell>
                <TableCell>
                  {(() => {
                    const canEdit = currentUser.role !== 'member' || client.created_by === currentUser.id;
                    if (!canEdit) return null;

                    return (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => navigator.clipboard.writeText(client.id)}>
                            Copy ID
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setEditingClient(client)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Client
                          </DropdownMenuItem>
                          {client.website && (
                            <DropdownMenuItem asChild>
                              <a href={client.website.startsWith('http') ? client.website : `https://${client.website}`} target="_blank" rel="noreferrer">
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Visit Website
                              </a>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {currentUser.role !== 'member' && (
                            <DropdownMenuItem className="text-destructive focus:bg-destructive focus:text-destructive-foreground" onClick={() => setDeletingId(client.id)}>
                              <Trash className="h-4 w-4 mr-2" />
                              Delete Client
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    );
                  })()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ClientFormDialog 
        client={editingClient || undefined} 
        open={!!editingClient} 
        onOpenChange={(open) => !open && setEditingClient(null)} 
      />

      <ConfirmDeleteDialog
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete client?"
        description="This client and its associated data will be permanently deleted. This action cannot be undone."
        isPending={isPending}
      />
    </>
  )
}
