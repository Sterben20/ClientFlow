"use client"

import { useState, useMemo } from "react"
import { format } from "date-fns"
import { MoreHorizontal, Edit, Trash, CheckCircle2, Circle, Clock, XCircle, Eye } from "lucide-react"
import Link from "next/link"
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
import { deleteTask } from "@/app/(dashboard)/tasks/actions"
import { useToast } from "@/hooks/use-toast"
import { TaskFormDialog } from "./task-form-dialog"
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Task, ProjectOption, ClientOption } from "@/types"

export function TaskList({ tasks, projects, clients, currentUser }: { tasks: Task[], projects: ProjectOption[], clients: ClientOption[], currentUser: { id: string, role: string } }) {
  const { toast } = useToast()
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  // Filters state
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filterPriority, setFilterPriority] = useState<string>("all")
  const [filterProject, setFilterProject] = useState<string>("all")
  const [filterClient, setFilterClient] = useState<string>("all")

  async function handleDeleteConfirm() {
    if (!deletingId) return
    setIsPending(true)
    const result = await deleteTask(deletingId)
    setIsPending(false)
    setDeletingId(null)
    if (result.success) {
      toast({ title: "Task deleted" })
    } else {
      toast({ 
        title: "Error deleting task", 
        description: result.error,
        variant: "destructive"
      })
    }
  }

  function getPriorityBadge(priority: string) {
    switch (priority) {
      case 'high':
        return <Badge className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20">High</Badge>
      case 'medium':
        return <Badge className="bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20 border-yellow-500/20">Medium</Badge>
      case 'low':
        return <Badge className="bg-slate-500/10 text-slate-500 hover:bg-slate-500/20 border-slate-500/20">Low</Badge>
      default:
        return null
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'completed':
        return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20"><CheckCircle2 className="w-3 h-3 mr-1"/> Completed</Badge>
      case 'in_progress':
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20"><Clock className="w-3 h-3 mr-1"/> In Progress</Badge>
      case 'cancelled':
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20"><XCircle className="w-3 h-3 mr-1"/> Cancelled</Badge>
      case 'todo':
      default:
        return <Badge variant="outline" className="text-muted-foreground"><Circle className="w-3 h-3 mr-1"/> Todo</Badge>
    }
  }

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchStatus = filterStatus === "all" || task.status === filterStatus;
      const matchPriority = filterPriority === "all" || task.priority === filterPriority;
      const matchProject = filterProject === "all" || (filterProject === "none" && !task.project_id) || task.project_id === filterProject;
      const matchClient = filterClient === "all" || (filterClient === "none" && !task.client_id) || task.client_id === filterClient;
      return matchStatus && matchPriority && matchProject && matchClient;
    })
  }, [tasks, filterStatus, filterPriority, filterProject, filterClient])

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="todo">Todo</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterProject} onValueChange={setFilterProject}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            <SelectItem value="none">No Project</SelectItem>
            {projects.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterClient} onValueChange={setFilterClient}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Client" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clients</SelectItem>
            <SelectItem value="none">No Client</SelectItem>
            {clients.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center p-12 border rounded-lg border-dashed">
          <h3 className="text-lg font-medium">No tasks yet</h3>
          <p className="text-sm text-muted-foreground mt-1">Get started by creating your first task.</p>
          <div className="mt-6">
            <TaskFormDialog projects={projects} clients={clients}>
              <Button>Create Task</Button>
            </TaskFormDialog>
          </div>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="text-center p-12 border rounded-lg border-dashed">
          <h3 className="text-lg font-medium">No tasks match your filters</h3>
          <Button variant="outline" className="mt-4" onClick={() => {
            setFilterStatus("all")
            setFilterPriority("all")
            setFilterProject("all")
            setFilterClient("all")
          }}>Clear Filters</Button>
        </div>
      ) : (
        <div className="border rounded-md hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTasks.map((task) => (
                <TableRow key={task.id} className={task.status === 'completed' ? "opacity-60 bg-muted/30" : ""}>
                  <TableCell className="font-medium">
                    <Link href={`/tasks/${task.id}`} className="hover:underline">
                      {task.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(task.status)}
                  </TableCell>
                  <TableCell>
                    {getPriorityBadge(task.priority)}
                  </TableCell>
                  <TableCell>
                    {task.projects?.name ? task.projects.name : <span className="text-muted-foreground italic">Not assigned</span>}
                  </TableCell>
                  <TableCell>
                    {task.clients?.name ? task.clients.name : <span className="text-muted-foreground italic">Not assigned</span>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {task.due_date ? format(new Date(task.due_date), 'MMM d, yyyy') : '-'}
                  </TableCell>
                  <TableCell>
                    {task.profiles?.full_name || task.profiles?.email || 'Unknown'}
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const canEdit = currentUser.role !== 'member' || task.created_by === currentUser.id;

                      return (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem asChild>
                              <Link href={`/tasks/${task.id}`}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {canEdit && (
                              <DropdownMenuItem onClick={() => setEditingTask(task)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Task
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {currentUser.role !== 'member' && (
                              <DropdownMenuItem className="text-destructive focus:bg-destructive focus:text-destructive-foreground" onClick={() => setDeletingId(task.id)}>
                                <Trash className="h-4 w-4 mr-2" />
                                Delete Task
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      );
                    })()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Mobile view */}
      <div className="md:hidden grid gap-4">
        {filteredTasks.map(task => (
          <div key={task.id} className={`p-4 rounded-lg border ${task.status === 'completed' ? 'opacity-70 bg-muted/30' : 'bg-card'}`}>
            <div className="flex justify-between items-start mb-2">
              <Link href={`/tasks/${task.id}`} className="font-semibold hover:underline">
                {task.title}
              </Link>
              {(() => {
                const canEdit = currentUser.role !== 'member' || task.created_by === currentUser.id;

                return (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem asChild>
                        <Link href={`/tasks/${task.id}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {canEdit && (
                        <DropdownMenuItem onClick={() => setEditingTask(task)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                      )}
                      {currentUser.role !== 'member' && (
                        <DropdownMenuItem className="text-destructive" onClick={() => setDeletingId(task.id)}>
                          <Trash className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                );
              })()}
            </div>
            <div className="flex gap-2 mb-3">
              {getStatusBadge(task.status)}
              {getPriorityBadge(task.priority)}
            </div>
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <div>
                <span className="text-muted-foreground block text-xs">Project</span>
                <span className="truncate">{task.projects?.name || <span className="italic text-muted-foreground">Not assigned</span>}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">Client</span>
                <span className="truncate">{task.clients?.name || <span className="italic text-muted-foreground">Not assigned</span>}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">Due Date</span>
                <span>{task.due_date ? format(new Date(task.due_date), 'MMM d, yyyy') : '-'}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">Created By</span>
                <span className="truncate">{task.profiles?.full_name || task.profiles?.email || 'Unknown'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <TaskFormDialog 
        task={editingTask || undefined} 
        projects={projects}
        clients={clients}
        open={!!editingTask} 
        onOpenChange={(open: boolean) => !open && setEditingTask(null)} 
      />

      <ConfirmDeleteDialog
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete task?"
        description="This task will be permanently deleted. This action cannot be undone."
        isPending={isPending}
      />
    </>
  )
}
