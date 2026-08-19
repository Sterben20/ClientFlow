"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { acceptInvitation } from "@/app/invite/[token]/actions"

export function AcceptInviteButton({ token, workspaceName }: { token: string, workspaceName: string }) {
  const { toast } = useToast()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  async function handleAccept() {
    setIsLoading(true)
    const result = await acceptInvitation(token)
    setIsLoading(false)

    if (result.success) {
      setIsSuccess(true)
      toast({
        title: "Invitation Accepted",
        description: `You are now a member of ${workspaceName}.`,
      })
      setTimeout(() => {
        router.push("/dashboard")
        router.refresh()
      }, 1500)
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: result.error || "Failed to accept invitation.",
      })
    }
  }

  if (isSuccess) {
    return (
      <Button className="w-full bg-green-600 hover:bg-green-700 text-white" disabled>
        <Check className="mr-2 h-4 w-4" />
        Joined Workspace Successfully
      </Button>
    )
  }

  return (
    <Button onClick={handleAccept} disabled={isLoading} className="w-full text-lg h-12">
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Joining...
        </>
      ) : (
        "Accept Invitation"
      )}
    </Button>
  )
}
