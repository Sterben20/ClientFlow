"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { switchWorkspace } from "@/app/workspace-actions"

interface Workspace {
  id: string
  name: string
  role: string
}

export function WorkspaceSwitcher({
  workspaces,
  currentWorkspaceId,
}: {
  workspaces: Workspace[]
  currentWorkspaceId: string
}) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const currentWorkspace = workspaces.find((w) => w.id === currentWorkspaceId) || workspaces[0]

  async function onSelect(workspaceId: string) {
    setOpen(false)
    if (workspaceId === currentWorkspaceId) return
    
    // Save to cookie
    await switchWorkspace(workspaceId)
    
    // Refresh router to fetch data for the newly selected workspace
    router.refresh()
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between mt-4"
        >
          {currentWorkspace?.name || "Select workspace..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command>
          <CommandInput placeholder="Search workspace..." />
          <CommandList>
            <CommandEmpty>No workspace found.</CommandEmpty>
            <CommandGroup heading="Your Workspaces">
              {workspaces.map((workspace) => (
                <CommandItem
                  key={workspace.id}
                  value={workspace.name}
                  onSelect={() => onSelect(workspace.id)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      currentWorkspaceId === workspace.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {workspace.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
