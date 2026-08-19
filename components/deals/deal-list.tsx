"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MoreHorizontal, Edit, Trash } from "lucide-react"
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
import { deleteDeal, updateDealStage } from "@/app/(dashboard)/deals/actions"
import { useToast } from "@/hooks/use-toast"
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog"
import type { Deal } from "@/types"

export function DealList({ deals, onEdit, currentUser }: { deals: Deal[], onEdit: (deal: Deal) => void, currentUser: { id: string, role: string } }) {
  const { toast } = useToast()
  
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  async function handleDeleteConfirm() {
    if (!deletingId) return
    setIsPending(true)
    const result = await deleteDeal(deletingId)
    setIsPending(false)
    setDeletingId(null)
    if (result.success) {
      toast({ title: "Deal deleted" })
    } else {
      toast({ 
        title: "Error deleting deal", 
        description: result.error,
        variant: "destructive"
      })
    }
  }

  async function handleStageUpdate(id: string, stage: string) {
    const result = await updateDealStage(id, stage as Deal["stage"])
    if (result.success) {
      toast({ title: "Stage updated successfully" })
    }
  }

  function getStageBadge(stage: string) {
    switch (stage) {
      case 'won':
        return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20">Won</Badge>
      case 'lost':
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20">Lost</Badge>
      case 'negotiation':
        return <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20 hover:bg-orange-500/20">Negotiation</Badge>
      case 'proposal':
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20">Proposal</Badge>
      case 'qualified':
        return <Badge className="bg-indigo-500/10 text-indigo-500 border-indigo-500/20 hover:bg-indigo-500/20">Qualified</Badge>
      case 'lead':
      default:
        return <Badge variant="outline" className="text-muted-foreground">Lead</Badge>
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  if (deals.length === 0) {
    return (
      <div className="text-center p-12 border rounded-lg border-dashed">
        <h3 className="text-lg font-medium">No deals found</h3>
        <p className="text-sm text-muted-foreground mt-1">There are no deals matching your current view or filters.</p>
      </div>
    )
  }

  return (
    <>
      <div className="border rounded-md overflow-x-auto min-w-0 w-full">
        <Table className="min-w-[800px]">
          <TableHeader>
            <TableRow>
              <TableHead>Deal Name</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead className="hidden lg:table-cell text-right">Expected Close Date</TableHead>
              <TableHead className="text-right">Value</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deals.map((deal) => (
              <TableRow key={deal.id}>
                <TableCell>
                  <div className="font-medium">{deal.name}</div>
                </TableCell>
                <TableCell>
                  {deal.clients?.name ? (
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{deal.clients.name}</span>
                      {deal.clients.company && <span className="text-xs text-muted-foreground">{deal.clients.company}</span>}
                    </div>
                  ) : (
                    <span className="text-muted-foreground italic text-sm">No Client</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {deal.profiles ? (
                      <>
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={deal.profiles.avatar_url || ''} />
                          <AvatarFallback className="text-[10px]">{deal.profiles.full_name?.charAt(0).toUpperCase() || deal.profiles.email.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm truncate max-w-[120px]">{deal.profiles.full_name || deal.profiles.email}</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground text-sm italic">Unassigned</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {getStageBadge(deal.stage)}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-right text-sm text-muted-foreground">
                  {deal.expected_close_date ? format(new Date(deal.expected_close_date), 'MMM d, yyyy') : '-'}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(deal.value)}
                </TableCell>
                <TableCell>
                  {(() => {
                    const canEdit = currentUser.role !== 'member' || deal.owner_id === currentUser.id;
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
                          <DropdownMenuLabel>Change Stage</DropdownMenuLabel>
                          {['lead', 'qualified', 'proposal', 'negotiation'].map(stage => (
                            <DropdownMenuItem key={stage} onClick={() => handleStageUpdate(deal.id, stage)}>
                              Move to {stage.charAt(0).toUpperCase() + stage.slice(1)}
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleStageUpdate(deal.id, 'won')} className="text-emerald-600 focus:bg-emerald-50 focus:text-emerald-600">
                            Mark as Won
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStageUpdate(deal.id, 'lost')} className="text-red-600 focus:bg-red-50 focus:text-red-600">
                            Mark as Lost
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => onEdit(deal)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Deal
                          </DropdownMenuItem>
                          {currentUser.role !== 'member' && (
                            <DropdownMenuItem className="text-destructive focus:bg-destructive focus:text-destructive-foreground" onClick={() => setDeletingId(deal.id)}>
                              <Trash className="h-4 w-4 mr-2" />
                              Delete Deal
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )
                  })()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ConfirmDeleteDialog
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete deal?"
        description="This deal will be permanently deleted. This action cannot be undone."
        isPending={isPending}
      />
    </>
  )
}
