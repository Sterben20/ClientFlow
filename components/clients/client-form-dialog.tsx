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
import { Textarea } from "@/components/ui/textarea"
import { createClient, updateClient, ClientData } from "@/app/(dashboard)/clients/actions"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

import type { Client } from "@/types"

interface ClientFormDialogProps {
  children?: React.ReactNode;
  client?: Client; // If provided, we are in Edit mode
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ClientFormDialog({ children, client, open, onOpenChange }: ClientFormDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const isControlled = open !== undefined;
  const dialogOpen = isControlled ? open : isOpen;
  const setDialogOpen = isControlled ? onOpenChange! : setIsOpen;

  const isEdit = !!client

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    
    const data: ClientData = {
      name: formData.get("name") as string,
      company: formData.get("company") as string || null,
      email: formData.get("email") as string || null,
      phone: formData.get("phone") as string || null,
      website: formData.get("website") as string || null,
      status: formData.get("status") as Client["status"],
      source: formData.get("source") as string || null,
      notes: formData.get("notes") as string || null,
    }

    if (!data.email && !data.phone) {
      toast({
        title: "Contact Info Required",
        description: "Please provide either an Email or a Phone number.",
        variant: "destructive",
      })
      setLoading(false)
      return
    }

    let result;
    if (isEdit) {
      result = await updateClient(client.id, data)
    } else {
      result = await createClient(data)
    }

    setLoading(false)

    if (result.success) {
      toast({
        title: isEdit ? "Client updated" : "Client created",
        description: isEdit ? "The client details have been updated." : "A new client has been added to your workspace.",
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
            <DialogTitle>{isEdit ? "Edit Client" : "Add New Client"}</DialogTitle>
            <DialogDescription>
              {isEdit ? "Make changes to the client's information here." : "Enter the details of your new client."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input id="name" name="name" defaultValue={client?.name} required placeholder="John Doe" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Company *</Label>
                <Input id="company" name="company" defaultValue={client?.company || ""} required placeholder="Acme Inc." />
              </div>
            </div>
            
            <div className="space-y-4 rounded-lg border p-4 bg-muted/20">
              <div className="text-sm font-medium">Contact Information</div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" defaultValue={client?.email || ""} placeholder="john@example.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" name="phone" type="tel" autoComplete="tel" defaultValue={client?.phone || ""} placeholder="+62 812-3456-7890" />
                </div>
              </div>
              <p className="text-[0.8rem] text-muted-foreground">
                * Please provide at least one contact method.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select name="status" defaultValue={client?.status || "lead"}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lead">Lead</SelectItem>
                    <SelectItem value="prospect">Prospect</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="source">Source <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                <Input id="source" name="source" defaultValue={client?.source || ""} placeholder="e.g. Referral, Website" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website <span className="text-muted-foreground font-normal">(Optional)</span></Label>
              <Input id="website" name="website" defaultValue={client?.website || ""} placeholder="https://example.com" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Background / Description <span className="text-muted-foreground font-normal">(Optional)</span></Label>
              <Textarea 
                id="notes" 
                name="notes" 
                defaultValue={client?.notes || ""} 
                placeholder="Any additional information..."
                className="resize-none"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Save changes" : "Create client"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
