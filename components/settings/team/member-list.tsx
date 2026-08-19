"use client"

import { useState, useEffect } from "react"
import { MoreHorizontal, Trash2, Shield, User, Clock } from "lucide-react"

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
import { useToast } from "@/hooks/use-toast"
import { revokeInvitation, removeMember, updateMemberRole } from "@/app/(dashboard)/settings/team/actions"
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog"

import type { WorkspaceMember, WorkspaceInvitation } from "@/types"
import type { WorkspaceRole } from "@/lib/workspace"

export function MemberList({ members, invitations, currentUserId, currentUserRole }: { members: WorkspaceMember[], invitations: WorkspaceInvitation[], currentUserId: string, currentUserRole: string }) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const [removingProfileId, setRemovingProfileId] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  async function onChangeRole(profileId: string, newRole: WorkspaceRole) {
    setIsLoading(profileId)
    const result = await updateMemberRole(profileId, newRole)
    setIsLoading(null)
    
    if (result.success) {
      toast({ title: "Member role updated" })
    } else {
      toast({ variant: "destructive", title: "Error", description: result.error })
    }
  }

  async function onRemoveMemberConfirm() {
    if (!removingProfileId) return
    setIsLoading(removingProfileId)
    const result = await removeMember(removingProfileId)
    setIsLoading(null)
    setRemovingProfileId(null)
    
    if (result.success) {
      toast({ title: "Member removed" })
    } else {
      toast({ variant: "destructive", title: "Error", description: result.error })
    }
  }

  async function onRevokeInvite(id: string) {
    setIsLoading(id)
    const result = await revokeInvitation(id)
    setIsLoading(null)
    
    if (result.success) {
      toast({ title: "Invitation revoked" })
    } else {
      toast({ variant: "destructive", title: "Error", description: result.error })
    }
  }

  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/invite/${token}`
    navigator.clipboard.writeText(link)
    toast({ title: "Invite link copied to clipboard" })
  }

  return (
    <div className="space-y-8">
      {/* Active Members */}
      <div>
        <h3 className="text-lg font-medium mb-4">Active Members</h3>
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                {currentUserRole !== 'member' && <TableHead className="w-[80px]"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={currentUserRole !== 'member' ? 4 : 3} className="text-center text-muted-foreground py-8">
                    No active members found.
                  </TableCell>
                </TableRow>
              ) : (
                members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                          {member.profiles.full_name?.charAt(0) || member.profiles.email.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium">{member.profiles.full_name || 'No Name'}</span>
                          <span className="text-xs text-muted-foreground">{member.profiles.email}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {currentUserRole === 'owner' && member.profile_id !== currentUserId ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 capitalize" disabled={isLoading === member.profile_id}>
                              {member.role === 'owner' && <Shield className="w-3 h-3 mr-2 text-muted-foreground" />}
                              {member.role === 'admin' && <Shield className="w-3 h-3 mr-2 text-muted-foreground" />}
                              {member.role === 'member' && <User className="w-3 h-3 mr-2 text-muted-foreground" />}
                              {member.role}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => onChangeRole(member.profile_id, 'member')} disabled={member.role === 'member'}>
                              Member
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onChangeRole(member.profile_id, 'admin')} disabled={member.role === 'admin'}>
                              Admin
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onChangeRole(member.profile_id, 'owner')} disabled={member.role === 'owner'}>
                              Owner
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <Badge variant={member.role === 'owner' ? 'default' : member.role === 'admin' ? 'secondary' : 'outline'} className="capitalize">
                          {member.role === 'owner' && <Shield className="w-3 h-3 mr-1" />}
                          {member.role === 'admin' && <Shield className="w-3 h-3 mr-1" />}
                          {member.role === 'member' && <User className="w-3 h-3 mr-1" />}
                          {member.role}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {isMounted ? new Date(member.created_at).toLocaleDateString() : "..."}
                    </TableCell>
                    {currentUserRole !== 'member' && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" disabled={isLoading === member.profile_id}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {member.role !== 'owner' ? (
                              <DropdownMenuItem 
                                className="text-destructive focus:text-destructive cursor-pointer focus:bg-destructive/10"
                                onClick={() => setRemovingProfileId(member.profile_id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Remove from Workspace
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem disabled className="text-muted-foreground">
                                Cannot remove owner
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div>
          <h3 className="text-lg font-medium mb-4">Pending Invitations</h3>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invite) => (
                  <TableRow key={invite.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{invite.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {invite.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Clock className="w-3 h-3 mr-1" />
                        {isMounted ? new Date(invite.expires_at).toLocaleDateString() : "..."}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" disabled={isLoading === invite.id}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => copyInviteLink(invite.token)}>
                            Copy Invite Link
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive focus:text-destructive cursor-pointer"
                            onClick={() => onRevokeInvite(invite.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Revoke Invite
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <ConfirmDeleteDialog
        open={!!removingProfileId}
        onOpenChange={(open) => !open && setRemovingProfileId(null)}
        onConfirm={onRemoveMemberConfirm}
        title="Remove team member?"
        description="This member will lose access to this workspace. This action cannot be undone."
        actionLabel="Remove"
        isPending={!!isLoading && isLoading === removingProfileId}
      />
    </div>
  )
}
