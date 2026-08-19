import { notFound } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"
import { ArrowLeft, Calendar, CheckCircle2, Circle, Clock, XCircle, Building2, User, Activity } from "lucide-react"

import { requireWorkspaceAccess } from "@/lib/workspace"
import { createClient as createSupabase } from "@/lib/supabase/server"
import { getOptionsForTasks } from "../actions"
import { TaskDetailActions } from "./task-detail-actions"
import { Badge } from "@/components/ui/badge"

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

export default async function TaskDetailPage({ params }: { params: { id: string } }) {
  const { workspaceId, role, user } = await requireWorkspaceAccess()
  const supabase = createSupabase()

  const { data: task, error } = await supabase
    .from('tasks')
    .select(`
      *,
      projects (
        id,
        name
      ),
      clients (
        id,
        name
      ),
      profiles (
        id,
        full_name,
        email
      )
    `)
    .eq('id', params.id)
    .eq('workspace_id', workspaceId)
    .single()

  if (error || !task) {
    notFound()
  }

  const { clients, projects } = await getOptionsForTasks()

  return (
    <div className="p-4 lg:p-8 flex flex-col gap-6 max-w-5xl mx-auto w-full">
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <Link href="/tasks" className="hover:text-primary transition-colors flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          Back to Tasks
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">{task.title}</h1>
          <div className="flex items-center gap-2 flex-wrap">
            {getStatusBadge(task.status)}
            {getPriorityBadge(task.priority)}
          </div>
        </div>
        <TaskDetailActions task={task} clients={clients} projects={projects} currentUser={{ id: user.id, role }} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
        <div className="md:col-span-2 space-y-6">
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
            <div className="p-6">
              <h3 className="font-semibold text-lg mb-4">Description</h3>
              {task.description ? (
                <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">{task.description}</p>
              ) : (
                <p className="text-muted-foreground italic">No description provided.</p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
            <div className="p-6">
              <h3 className="font-semibold text-lg mb-4">Task Details</h3>
              <div className="space-y-4">
                
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-full text-primary">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Project</p>
                    <p className="text-sm font-medium">
                      {task.projects ? (
                        <Link href={`/projects/${task.projects.id}`} className="hover:underline text-blue-600 dark:text-blue-400">
                          {task.projects.name}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground italic">Not assigned</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-full text-primary">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Client</p>
                    <p className="text-sm font-medium">
                      {task.clients ? (
                        <Link href={`/clients/${task.clients.id}`} className="hover:underline text-blue-600 dark:text-blue-400">
                          {task.clients.name}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground italic">Not assigned</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-full text-primary">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Due Date</p>
                    <p className="text-sm font-medium">
                      {task.due_date ? format(new Date(task.due_date), 'MMMM d, yyyy') : <span className="text-muted-foreground italic">Not assigned</span>}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-full text-primary">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Created By</p>
                    <p className="text-sm font-medium">
                      {task.profiles?.full_name || task.profiles?.email || 'Unknown'}
                    </p>
                  </div>
                </div>

              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
            <div className="p-6">
              <h3 className="font-semibold text-lg mb-4">Dates</h3>
              <div className="space-y-4">
                
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Created On</p>
                  <p className="text-sm font-medium">{format(new Date(task.created_at), 'MMMM d, yyyy h:mm a')}</p>
                </div>
                
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Last Updated</p>
                  <p className="text-sm font-medium">{format(new Date(task.updated_at), 'MMMM d, yyyy h:mm a')}</p>
                </div>
                
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Completed On</p>
                  <p className="text-sm font-medium">
                    {task.completed_at ? format(new Date(task.completed_at), 'MMMM d, yyyy h:mm a') : <span className="text-muted-foreground italic">Not completed</span>}
                  </p>
                </div>

              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
