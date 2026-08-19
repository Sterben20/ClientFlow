import { notFound } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"
import { ArrowLeft, Calendar, Target, UserCircle2, Clock, Wallet } from "lucide-react"

import { createClient as createSupabase } from "@/lib/supabase/server"
import { requireWorkspaceAccess } from "@/lib/workspace"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ProjectDetailActions } from "./project-detail-actions"
import { getClientsForSelect } from "../actions"
import type { Project } from "@/types"
import { ActivityTimelineClient } from "@/components/activity/activity-timeline-client"
import { getProjectTimeline } from "../../activity/actions"

export async function generateMetadata({ params }: { params: { id: string } }) {
  const { workspaceId } = await requireWorkspaceAccess()
  const supabase = createSupabase()
  
  const { data: project } = await supabase
    .from('projects')
    .select('name')
    .eq('id', params.id)
    .eq('workspace_id', workspaceId)
    .single()
    
  if (!project) {
    return { title: 'Project Not Found — ClientFlow' }
  }
  
  return { title: `${project.name} — ClientFlow` }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'active':
      return <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20">Active</Badge>
    case 'planning':
      return <Badge variant="outline" className="text-blue-500 border-blue-200">Planning</Badge>
    case 'completed':
      return <Badge className="bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20 border-indigo-500/20">Completed</Badge>
    case 'on_hold':
      return <Badge variant="secondary" className="text-orange-500">On Hold</Badge>
    case 'cancelled':
      return <Badge variant="secondary" className="text-muted-foreground">Cancelled</Badge>
    default:
      return <Badge variant="outline" className="capitalize">{status}</Badge>
  }
}

function getPriorityBadge(priority: string) {
  switch (priority) {
    case 'high':
      return <Badge className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20">High Priority</Badge>
    case 'medium':
      return <Badge className="bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20 border-yellow-500/20">Medium Priority</Badge>
    case 'low':
      return <Badge className="bg-slate-500/10 text-slate-500 hover:bg-slate-500/20 border-slate-500/20">Low Priority</Badge>
    default:
      return null
  }
}

const formatCurrency = (amount: number | null) => {
  if (amount === null || amount === undefined) return "Not specified";
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const { workspaceId, role, user } = await requireWorkspaceAccess()
  const supabase = createSupabase()

  // Strict check matching workspace
  const { data: project, error } = await supabase
    .from('projects')
    .select(`
      *,
      clients(id, name, company),
      profiles!created_by(id, full_name, email)
    `)
    .eq('id', params.id)
    .eq('workspace_id', workspaceId)
    .single()

  if (error || !project) {
    notFound()
  }

  const clients = await getClientsForSelect()

  const initialActivities = await getProjectTimeline(params.id, 1, 'all')

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/projects" className="text-sm text-muted-foreground hover:text-foreground flex items-center transition-colors">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Projects
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Target className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              {project.name}
            </h1>
            <div className="flex items-center gap-2 mt-2">
              {getStatusBadge(project.status)}
              {getPriorityBadge(project.priority)}
            </div>
          </div>
        </div>
        
        <ProjectDetailActions project={project as unknown as Project} clients={clients} currentUser={{ id: user.id, role }} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        {/* Left Column */}
        <div className="space-y-6 md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Project Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Progress Section */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-muted-foreground">Overall Progress</span>
                  <span className="font-semibold">{project.progress}%</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-3 overflow-hidden">
                  <div className="bg-primary h-full transition-all" style={{ width: `${project.progress}%` }} />
                </div>
              </div>

              {/* Description Section */}
              <div className="space-y-2 pt-4 border-t">
                <h3 className="text-sm font-medium text-muted-foreground">Description</h3>
                <p className="text-sm leading-relaxed">
                  {project.description || <span className="italic text-muted-foreground">No description provided.</span>}
                </p>
              </div>

            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Timeline & Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityTimelineClient 
                initialActivities={initialActivities}
                contextType="project"
                contextId={params.id}
                availableFilters={['all', 'tasks']}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Key Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              
              <div className="space-y-1">
                <span className="text-sm text-muted-foreground flex items-center">
                  <UserCircle2 className="h-4 w-4 mr-1.5" />
                  Client
                </span>
                {project.clients ? (
                  <Link href={`/clients/${project.clients.id}`} className="font-medium hover:underline text-primary block">
                    {project.clients.name}
                    {project.clients.company ? ` (${project.clients.company})` : ''}
                  </Link>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Not assigned</p>
                )}
              </div>
              
              <div className="space-y-1">
                <span className="text-sm text-muted-foreground flex items-center">
                  <Clock className="h-4 w-4 mr-1.5" />
                  Timeline
                </span>
                <p className="font-medium text-sm">
                  {project.start_date ? format(new Date(project.start_date), 'MMM d, yyyy') : 'TBD'}
                  {' → '}
                  {project.due_date ? format(new Date(project.due_date), 'MMM d, yyyy') : 'TBD'}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-sm text-muted-foreground flex items-center">
                  <Wallet className="h-4 w-4 mr-1.5" />
                  Budget
                </span>
                <p className="font-medium text-sm">{formatCurrency(project.budget)}</p>
              </div>

              <div className="space-y-1 pt-4 border-t">
                <span className="text-sm text-muted-foreground flex items-center">
                  <Calendar className="h-4 w-4 mr-1.5" />
                  Created
                </span>
                <p className="text-sm font-medium">{format(new Date(project.created_at), 'MMMM d, yyyy')}</p>
                {project.profiles && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    by {project.profiles.full_name}
                  </p>
                )}
              </div>

            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
