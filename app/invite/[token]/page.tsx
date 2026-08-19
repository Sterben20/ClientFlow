import { getInvitationDetails } from "./actions"
import { createClient as createSupabase } from "@/lib/supabase/server"
import { AcceptInviteButton } from "@/components/settings/team/accept-invite-button"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function InvitePage({ params }: { params: { token: string } }) {
  const token = params.token
  const details = await getInvitationDetails(token)
  const supabase = createSupabase()
  const { data: { session } } = await supabase.auth.getSession()

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="max-w-md w-full bg-card text-card-foreground border rounded-xl shadow-lg p-8">
        {!details ? (
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold text-destructive">Invalid Invitation</h1>
            <p className="text-muted-foreground">
              This invitation link is invalid or has expired. Please ask your administrator to send you a new invitation.
            </p>
            <Button asChild className="mt-4">
              <Link href="/">Return to Home</Link>
            </Button>
          </div>
        ) : (
          <div className="text-center space-y-6">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
              <span className="text-2xl">👋</span>
            </div>
            <h1 className="text-2xl font-bold">You&apos;ve been invited!</h1>
            <p className="text-muted-foreground text-lg">
              You have been invited to join the <strong className="text-foreground">{details.workspace_name}</strong> workspace on ClientFlow.
            </p>
            <div className="bg-muted rounded-md p-4 text-sm mt-6 mb-8 text-left">
              <p><strong>Invited as:</strong> <span className="capitalize">{details.role}</span></p>
              <p><strong>Email:</strong> {details.email}</p>
            </div>

            {!session ? (
              <div className="space-y-4">
                <p className="text-sm font-medium text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 p-3 rounded">
                  You must be logged in to accept this invitation.
                </p>
                <div className="flex flex-col gap-3">
                  <Button asChild>
                    <Link href={`/login?redirect=/invite/${token}`}>Log In</Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href={`/signup?redirect=/invite/${token}`}>Create an Account</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {session.user.email !== details.email && (
                  <p className="text-xs text-destructive bg-destructive/10 p-2 rounded text-left">
                    Note: You are currently logged in as <strong>{session.user.email}</strong>, but this invitation was sent to <strong>{details.email}</strong>. You can still accept it, but please ensure this is correct.
                  </p>
                )}
                <AcceptInviteButton token={token} workspaceName={details.workspace_name} />
                <Button variant="ghost" asChild className="w-full">
                  <Link href="/dashboard">Go to Dashboard</Link>
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
