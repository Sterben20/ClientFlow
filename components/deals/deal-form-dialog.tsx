"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createDeal, updateDeal, DealData } from "@/app/(dashboard)/deals/actions"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

import type { Deal, ClientOption, Profile } from "@/types"

interface DealFormDialogProps {
  children?: React.ReactNode;
  deal?: Deal; // If provided, we are in Edit mode
  clients: ClientOption[]; // List of clients for the dropdown
  members: Profile[]; // List of workspace members
  currentUser: { id: string, role: string };
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function DealFormDialog({ children, deal, clients, members, currentUser, open, onOpenChange }: DealFormDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const isControlled = open !== undefined;
  const dialogOpen = isControlled ? open : isOpen;
  const setDialogOpen = isControlled ? onOpenChange! : setIsOpen;

  const isEdit = !!deal

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    
    // Parse value securely
    const rawValue = formData.get("value") as string;
    const parsedValue = rawValue ? parseFloat(rawValue.replace(/[^0-9.-]+/g, "")) : 0;
    
    if (parsedValue < 0) {
      toast({
        title: "Validation Error",
        description: "Deal value cannot be a negative number.",
        variant: "destructive"
      })
      setLoading(false)
      return
    }

    const clientId = formData.get("client_id") as string;
    const ownerId = formData.get("owner_id") as string;

    const data: DealData = {
      name: formData.get("name") as string,
      client_id: clientId === "none" ? "" : clientId,
      owner_id: ownerId,
      stage: formData.get("stage") as Deal["stage"],
      expected_close_date: formData.get("expected_close_date") as string || null,
      value: parsedValue,
    }

    let result;
    if (isEdit) {
      result = await updateDeal(deal.id, data)
    } else {
      result = await createDeal(data)
    }

    setLoading(false)

    if (result.success) {
      toast({
        title: isEdit ? "Deal updated" : "Deal created",
        description: isEdit ? "The deal details have been updated." : "A new deal has been added to your pipeline.",
      })
      setDialogOpen(false)
    } else {
      toast({
        title: "Error",
        description: result.error || "Something went wrong.",
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit Deal" : "Create New Deal"}</DialogTitle>
            <DialogDescription>
              {isEdit ? "Make changes to the deal's details here." : "Enter the details of your new deal."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            
            <div className="space-y-2">
              <Label htmlFor="name">Deal Name *</Label>
              <Input id="name" name="name" defaultValue={deal?.name} required placeholder="e.g. Q3 Enterprise Software License" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="client_id">Related Client <span className="text-muted-foreground font-normal">(Optional)</span></Label>
              <Select name="client_id" defaultValue={deal?.client_id || "none"}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Client Yet</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} {c.company ? `(${c.company})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="owner_id">Owner *</Label>
              <Select 
                name="owner_id" 
                defaultValue={deal?.owner_id || (currentUser.role === 'member' ? currentUser.id : (members[0]?.id || ""))}
                disabled={currentUser.role === 'member'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an owner" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.full_name || m.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="value">Value (Rp)</Label>
                <Input id="value" name="value" type="number" min="0" step="1000" defaultValue={deal?.value} required placeholder="e.g. 25000000" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stage">Stage</Label>
                <Select name="stage" defaultValue={deal?.stage || "lead"}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lead">Lead</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                    <SelectItem value="proposal">Proposal</SelectItem>
                    <SelectItem value="negotiation">Negotiation</SelectItem>
                    <SelectItem value="won">Won</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expected_close_date">Expected Close Date <span className="text-muted-foreground font-normal">(Optional)</span></Label>
              <Input id="expected_close_date" name="expected_close_date" type="date" defaultValue={deal?.expected_close_date ? deal.expected_close_date.split('T')[0] : ""} />
            </div>
            
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Save changes" : "Create deal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
