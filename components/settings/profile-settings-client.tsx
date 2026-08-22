"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useTheme } from "next-themes"
import { updateProfile } from "@/app/(dashboard)/settings/profile/actions"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Loader2 } from "lucide-react"

const profileSchema = z.object({
  fullName: z.string().min(2, { message: "Name must be at least 2 characters." }),
})

const passwordSchema = z.object({
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
  confirmPassword: z.string().min(8, { message: "Confirm password must be at least 8 characters." }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

export function ProfileSettingsClient({
  profile,
  role,
}: {
  profile: { full_name: string | null; email: string | null }
  role: string
}) {
  const { toast } = useToast()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Profile Form
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: profile.full_name || "",
    },
  })

  async function onProfileSubmit(values: z.infer<typeof profileSchema>) {
    setIsSavingProfile(true)
    const formData = new FormData()
    formData.append("fullName", values.fullName)
    
    const result = await updateProfile(formData)
    setIsSavingProfile(false)

    if (result?.error) {
      toast({
        title: "Error updating profile",
        description: result.error,
        variant: "destructive",
      })
    } else {
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      })
    }
  }

  // Password Form
  const [isSavingPassword, setIsSavingPassword] = useState(false)
  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  })

  async function onPasswordSubmit(values: z.infer<typeof passwordSchema>) {
    setIsSavingPassword(true)
    const { error } = await supabase.auth.updateUser({
      password: values.password,
    })
    setIsSavingPassword(false)

    if (error) {
      toast({
        title: "Error updating password",
        description: error.message,
        variant: "destructive",
      })
    } else {
      toast({
        title: "Password updated",
        description: "Your password has been changed successfully.",
      })
      passwordForm.reset()
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Profile Section */}
      <section>
        <div className="mb-4">
          <h3 className="text-lg font-medium">Profile Information</h3>
          <p className="text-sm text-muted-foreground">Update your personal details.</p>
        </div>
        
        <div className="flex items-center gap-4 mb-6">
          <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center text-primary text-2xl font-bold shrink-0">
            {profile.full_name?.charAt(0).toUpperCase() || profile.email?.charAt(0).toUpperCase() || "U"}
          </div>
          <div className="flex flex-col">
            <span className="font-medium text-lg">{profile.full_name || "Unknown"}</span>
            <span className="text-sm text-muted-foreground">{profile.email}</span>
          </div>
        </div>

        <Form {...profileForm}>
          <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
            <FormField
              control={profileForm.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={profile.email || ""} disabled className="bg-muted/50 text-muted-foreground" />
                <p className="text-[0.8rem] text-muted-foreground">Email cannot be changed.</p>
              </div>

              <div className="space-y-2">
                <Label>Workspace Role</Label>
                <Input value={role.charAt(0).toUpperCase() + role.slice(1)} disabled className="bg-muted/50 text-muted-foreground" />
                <p className="text-[0.8rem] text-muted-foreground">Your role in the active workspace.</p>
              </div>
            </div>

            <Button type="submit" disabled={isSavingProfile}>
              {isSavingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </form>
        </Form>
      </section>

      <Separator />

      {/* Security Section */}
      <section>
        <div className="mb-4">
          <h3 className="text-lg font-medium">Security</h3>
          <p className="text-sm text-muted-foreground">Manage your password and security settings.</p>
        </div>

        <Form {...passwordForm}>
          <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
            <FormField
              control={passwordForm.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="********" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={passwordForm.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm New Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="********" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isSavingPassword}>
              {isSavingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Password
            </Button>
          </form>
        </Form>
      </section>

      <Separator />

      {/* Appearance Section */}
      <section>
        <div className="mb-4">
          <h3 className="text-lg font-medium">Appearance</h3>
          <p className="text-sm text-muted-foreground">Customize how ClientFlow looks on your device.</p>
        </div>

        {mounted ? (
          <RadioGroup
            onValueChange={setTheme}
            value={theme}
            className="grid max-w-md grid-cols-1 gap-4 sm:grid-cols-3"
          >
            <div className="relative">
              <RadioGroupItem value="light" id="light" className="peer absolute inset-0 z-10 opacity-0 cursor-pointer" />
              <label
                htmlFor="light"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 cursor-pointer"
              >
                <div className="mb-2 h-6 w-6 rounded-full bg-white border" />
                Light
              </label>
            </div>
            <div className="relative">
              <RadioGroupItem value="dark" id="dark" className="peer absolute inset-0 z-10 opacity-0 cursor-pointer" />
              <label
                htmlFor="dark"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 cursor-pointer"
              >
                <div className="mb-2 h-6 w-6 rounded-full bg-slate-950 border border-slate-800" />
                Dark
              </label>
            </div>
            <div className="relative">
              <RadioGroupItem value="system" id="system" className="peer absolute inset-0 z-10 opacity-0 cursor-pointer" />
              <label
                htmlFor="system"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 cursor-pointer"
              >
                <div className="mb-2 h-6 w-6 rounded-full bg-gradient-to-tr from-slate-950 to-white border" />
                System
              </label>
            </div>
          </RadioGroup>
        ) : (
          <div className="grid max-w-md grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="h-[88px] rounded-md border-2 border-muted bg-popover" />
            <div className="h-[88px] rounded-md border-2 border-muted bg-popover" />
            <div className="h-[88px] rounded-md border-2 border-muted bg-popover" />
          </div>
        )}
      </section>
    </div>
  )
}
