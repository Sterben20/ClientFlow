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
import { createTask, updateTask } from "@/app/(dashboard)/tasks/actions"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"
import type { Task, ProjectOption, ClientOption } from "@/types"
import type { TaskFormValues } from "@/lib/validations"

export function TaskFormDialog({ 
  children, 
  task, 
  clients = [], 
  projects = [], 
  open, 
  onOpenChange 
}: {
  children?: React.ReactNode;
  task?: Task;
  clients?: ClientOption[];
  projects?: ProjectOption[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const isControlled = open !== undefined;
  const dialogOpen = isControlled ? open : isOpen;
  const setDialogOpen = isControlled ? onOpenChange! : setIsOpen;

  const isEdit = !!task

  const [status, setStatus] = useState(task?.status || "todo")
  const [priority, setPriority] = useState(task?.priority || "medium")
  const [formKey, setFormKey] = useState(0)

  useEffect(() => {
    if (dialogOpen) {
      setFormKey(prev => prev + 1)
      if (task) {
        setStatus(task.status)
        setPriority(task.priority)
      } else {
        setStatus("todo")
        setPriority("medium")
      }
    }
  }, [task, dialogOpen])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    
    const dueDate = formData.get("due_date") as string || null;
    const rawClientId = formData.get("client_id") as string;
    const rawProjectId = formData.get("project_id") as string;
    
    const data = {
      title: formData.get("title") as string,
      description: formData.get("description") as string || null,
      status: formData.get("status") as string,
      priority: formData.get("priority") as string,
      client_id: rawClientId === "no-client" ? null : (rawClientId || null),
      project_id: rawProjectId === "no-project" ? null : (rawProjectId || null),
      due_date: dueDate,
    }

    let result;
    if (isEdit && task) {
      result = await updateTask(task.id, data as TaskFormValues)
    } else {
      result = await createTask(data as TaskFormValues)
    }

    setLoading(false)

    if (result.success) {
      toast({
        title: isEdit ? "Task updated" : "Task created",
        description: isEdit ? "The task details have been updated." : "A new task has been added.",
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
            <DialogTitle>{isEdit ? "Edit Task" : "Create New Task"}</DialogTitle>
            <DialogDescription>
              {isEdit ? "Make changes to the task's details here." : "Enter the details of your new task."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            
            <div className="space-y-2">
              <Label htmlFor="title">Task Title *</Label>
              <Input id="title" name="title" defaultValue={task?.title} required placeholder="e.g. Follow up on proposal" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="project_id">Project <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                <Select name="project_id" defaultValue={task?.project_id || "no-project"}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no-project">No project</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="client_id">Client <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                <Select name="client_id" defaultValue={task?.client_id || "no-client"}>
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
                <Select name="status" value={status} onValueChange={(val) => setStatus(val as Task["status"])}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">Todo</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select name="priority" value={priority} onValueChange={(val) => setPriority(val as Task["priority"])}>
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

            <div className="space-y-2">
              <Label htmlFor="due_date">Due Date <span className="text-muted-foreground font-normal">(Optional)</span></Label>
              <Input id="due_date" name="due_date" type="date" defaultValue={task?.due_date ? task.due_date.split('T')[0] : ""} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description <span className="text-muted-foreground font-normal">(Optional)</span></Label>
              <Textarea 
                id="description" 
                name="description" 
                defaultValue={task?.description || ""} 
                placeholder="Details about the task..."
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
              {isEdit ? "Save changes" : "Create task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
