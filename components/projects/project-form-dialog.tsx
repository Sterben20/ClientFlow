"use client"

import { useState, useEffect } from "react"
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
import { createProject, updateProject, ProjectData } from "@/app/(dashboard)/projects/actions"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

import type { Project, ClientOption } from "@/types"

interface ProjectFormDialogProps {
  children?: React.ReactNode;
  project?: Project; // If provided, we are in Edit mode
  clients: ClientOption[]; // List of clients for the dropdown
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ProjectFormDialog({ children, project, clients, open, onOpenChange }: ProjectFormDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const isControlled = open !== undefined;
  const dialogOpen = isControlled ? open : isOpen;
  const setDialogOpen = isControlled ? onOpenChange! : setIsOpen;

  const isEdit = !!project

  const [progressStr, setProgressStr] = useState(project?.progress?.toString() || "0")
  const [status, setStatus] = useState(project?.status || "planning")
  const [formKey, setFormKey] = useState(0)

  useEffect(() => {
    if (dialogOpen) {
      setFormKey(prev => prev + 1)
      if (project) {
        setStatus(project.status)
        setProgressStr(project.progress?.toString() || "0")
      } else {
        setStatus("planning")
        setProgressStr("0")
      }
    }
  }, [project, dialogOpen])

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setProgressStr(val);
    if (val === "100") {
      setStatus("completed");
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    
    // Parse budget securely
    const rawBudget = formData.get("budget") as string;
    const parsedBudget = rawBudget ? parseFloat(rawBudget.replace(/[^0-9.-]+/g, "")) : null;

    if (parsedBudget !== null && parsedBudget < 0) {
      toast({
        title: "Validation Error",
        description: "Budget cannot be a negative number.",
        variant: "destructive"
      })
      setLoading(false)
      return
    }

    const startDate = formData.get("start_date") as string || null;
    const dueDate = formData.get("due_date") as string || null;

    if (startDate && dueDate && new Date(startDate) > new Date(dueDate)) {
      toast({
        title: "Validation Error",
        description: "Start date cannot be after the due date.",
        variant: "destructive"
      })
      setLoading(false)
      return
    }

    const progressValue = parseInt(formData.get("progress") as string || "0", 10);
    if (progressValue < 0 || progressValue > 100) {
      toast({
        title: "Validation Error",
        description: "Progress must be between 0 and 100.",
        variant: "destructive"
      })
      setLoading(false)
      return
    }

    const rawClientId = formData.get("client_id") as string;
    
    const data: ProjectData = {
      name: formData.get("name") as string,
      client_id: rawClientId === "no-client" ? null : (rawClientId || null),
      status: formData.get("status") as Project["status"],
      priority: formData.get("priority") as ProjectData["priority"],
      progress: progressValue,
      start_date: startDate,
      due_date: dueDate,
      budget: parsedBudget,
      description: formData.get("description") as string || null,
    }

    let result;
    if (isEdit) {
      result = await updateProject(project.id, data)
    } else {
      result = await createProject(data)
    }

    setLoading(false)

    if (result.success) {
      toast({
        title: isEdit ? "Project updated" : "Project created",
        description: isEdit ? "The project details have been updated." : "A new project has been added.",
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
      <DialogContent className="sm:max-w-[550px]">
        <form key={formKey} onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit Project" : "Create New Project"}</DialogTitle>
            <DialogDescription>
              {isEdit ? "Make changes to the project's details here." : "Enter the details of your new project."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Project Name *</Label>
                <Input id="name" name="name" defaultValue={project?.name} required placeholder="e.g. Website Redesign" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client_id">Client <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                <Select name="client_id" defaultValue={project?.client_id || "no-client"}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no-client">No client</SelectItem>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} {c.company ? `(${c.company})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select name="status" value={status} onValueChange={(val: string) => setStatus(val as Project["status"])}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select name="priority" defaultValue={project?.priority || "medium"}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="progress">Progress (%)</Label>
                <Input 
                  id="progress" 
                  name="progress" 
                  type="number" 
                  min="0" max="100" 
                  value={progressStr}
                  onChange={handleProgressChange} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget">Budget (Rp) <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                <Input id="budget" name="budget" type="number" min="0" step="1000" defaultValue={project?.budget || ""} placeholder="e.g. 5000000" />
              </div>
            </div>

            <div className="space-y-4 rounded-lg border p-4 bg-muted/20">
              <div className="text-sm font-medium">Timeline <span className="text-muted-foreground font-normal">(Optional)</span></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input id="start_date" name="start_date" type="date" defaultValue={project?.start_date ? project.start_date.split('T')[0] : ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="due_date">Expected End Date</Label>
                  <Input id="due_date" name="due_date" type="date" defaultValue={project?.due_date ? project.due_date.split('T')[0] : ""} />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description <span className="text-muted-foreground font-normal">(Optional)</span></Label>
              <Textarea 
                id="description" 
                name="description" 
                defaultValue={project?.description || ""} 
                placeholder="Brief description of the project scope..."
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
              {isEdit ? "Save changes" : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
