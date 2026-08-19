"use client"

import { useState } from "react"
import { Copy, Loader2, Check } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { createInvitation } from "@/app/(dashboard)/settings/team/actions"
import { WorkspaceRole } from "@/lib/workspace"

export function InviteForm() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const [email, setEmail] = useState("")
  const [role, setRole] = useState<WorkspaceRole>("member")

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setInviteLink(null)
    setCopied(false)
    
    try {
      const result = await createInvitation(email, role)
      
      if (result.success && result.token) {
        toast({
          title: "Invitation created",
          description: "Copy the link below and send it to the team member.",
        })
        const link = `${window.location.origin}/invite/${result.token}`
        setInviteLink(link)
        setEmail("")
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error || "Failed to create invitation",
        })
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      toast({
        title: "Copied!",
        description: "Invite link copied to clipboard.",
      })
      setTimeout(() => setCopied(false), 3000)
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input 
              id="email" 
              type="email" 
              required 
              placeholder="colleague@company.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-[200px] space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={(val) => setRole(val as WorkspaceRole)}>
              <SelectTrigger id="role">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            "Create Invite Link"
          )}
        </Button>
      </form>

      {inviteLink && (
        <div className="mt-6 p-4 border rounded-md bg-muted/50 flex flex-col gap-3">
          <p className="text-sm font-medium">Invite Link Ready</p>
          <p className="text-xs text-muted-foreground">
            Send this link to the user. It will expire in 7 days.
          </p>
          <div className="flex gap-2">
            <Input readOnly value={inviteLink} className="flex-1 font-mono text-xs" />
            <Button type="button" variant="secondary" onClick={copyToClipboard} className="shrink-0 w-24">
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
