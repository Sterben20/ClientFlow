import { getWorkspaceMembers, getPendingInvitations } from "./actions"
import { InviteForm } from "@/components/settings/team/invite-form"
import { MemberList } from "@/components/settings/team/member-list"
import { requireWorkspaceAccess } from "@/lib/workspace"

export default async function TeamSettingsPage() {
  const { role, user } = await requireWorkspaceAccess()
  const members = await getWorkspaceMembers()
  const invitations = await getPendingInvitations()

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto flex flex-col gap-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Team Management</h2>
        <p className="text-muted-foreground mt-2">
          Manage workspace members and send invitations to your team.
        </p>
      </div>

      {role !== 'member' ? (
        <div className="border rounded-xl p-6 bg-card text-card-foreground shadow-sm">
          <h3 className="text-lg font-medium mb-1">Invite new member</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Generate an invite link to invite a colleague to this workspace.
          </p>
          <InviteForm />
        </div>
      ) : (
        <div className="p-4 border rounded-md bg-muted/50 text-sm text-muted-foreground">
          You are a Member of this workspace. Only Admins and Owners can invite new members.
        </div>
      )}

      <MemberList members={members} invitations={invitations} currentUserId={user.id} currentUserRole={role} />
    </div>
  )
}
