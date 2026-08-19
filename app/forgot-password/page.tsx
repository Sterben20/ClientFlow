"use client"

import Link from "next/link"
import { useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { forgotPassword } from "./actions"

export default function ForgotPasswordPage() {
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleReset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    const formData = new FormData(e.currentTarget)
    const result = await forgotPassword(formData)
    
    if (result?.error) {
      setMessage({ type: 'error', text: result.error })
    } else if (result?.success) {
      setMessage({ type: 'success', text: result.success })
    }
    
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Reset Password</CardTitle>
          <CardDescription>
            Enter your email address and we&apos;ll send you a link to reset your password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleReset} className="grid gap-4">
            {message && (
              <div className={`text-sm p-3 rounded-md ${message.type === 'error' ? 'bg-destructive/15 text-destructive' : 'bg-green-100 text-green-800 border border-green-200'}`}>
                {message.text}
              </div>
            )}
            
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="m@example.com"
                required
                disabled={loading || message?.type === 'success'}
              />
            </div>
            
            {!message || message.type === 'error' ? (
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending link...
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </Button>
            ) : null}
            
            <div className="mt-4 text-center text-sm">
              <Link href="/login" className="underline text-muted-foreground hover:text-foreground">
                Back to login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
