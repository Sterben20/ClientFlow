"use client"

import { useState } from "react"
import { format } from "date-fns"
import { MoreHorizontal, Edit, Trash, ArrowRight } from "lucide-react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { deleteProject } from "@/app/(dashboard)/projects/actions"
import { useToast } from "@/hooks/use-toast"
import { ProjectFormDialog } from "./project-form-dialog"
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog"
import type { Project, ClientOption } from "@/types"

export function ProjectList({ projects, clients, currentUser }: { projects: Project[], clients: ClientOption[], currentUser: { id: string, role: string } }) {
  const { toast } = useToast()
  const [editingProject, setEditingProject] = useState<Project | null>(null)

  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  const [statusFilter, setStatusFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")

  async function handleDeleteConfirm() {
    if (!deletingId) return
    setIsPending(true)
    const result = await deleteProject(deletingId)
    setIsPending(false)
    setDeletingId(null)
    if (result.success) {
      toast({ title: "Project deleted" })
    } else {
      toast({ 
        title: "Error deleting project", 
        description: result.error,
        variant: "destructive"
      })
    }
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
        return <Badge variant="outline">{status}</Badge>
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

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return "-";
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  if (projects.length === 0) {
    return (
      <div className="text-center p-12 border rounded-lg border-dashed">
        <h3 className="text-lg font-medium">No projects yet</h3>
        <p className="text-sm text-muted-foreground mt-1">Get started by creating your first project.</p>
        <div className="mt-6">
          <ProjectFormDialog clients={clients}>
            <Button>Create Project</Button>
          </ProjectFormDialog>
        </div>
      </div>
    )
  }

  const filteredProjects = projects.filter(p => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (priorityFilter !== "all" && p.priority !== priorityFilter) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="planning">Planning</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="on_hold">On Hold</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project Name</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Status & Priority</TableHead>
              <TableHead className="hidden md:table-cell">Progress</TableHead>
              <TableHead className="hidden lg:table-cell text-right">Budget</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProjects.map((project) => (
              <TableRow key={project.id}>
                <TableCell>
                  <Link href={`/projects/${project.id}`} className="font-medium hover:underline text-primary">
                    {project.name}
                  </Link>
                  {project.description && (
                    <div className="text-xs text-muted-foreground line-clamp-1 max-w-[200px] mt-1">
                      {project.description}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {project.clients?.name || <span className="text-muted-foreground italic">Not assigned</span>}
                  </div>
                  {project.clients?.company && (
                    <div className="text-xs text-muted-foreground">{project.clients.company}</div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1 items-start">
                    {getStatusBadge(project.status)}
                    {getPriorityBadge(project.priority)}
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-full max-w-[100px] bg-secondary rounded-full h-2 overflow-hidden">
                      <div className="bg-primary h-full" style={{ width: `${project.progress || 0}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground font-medium">{project.progress || 0}%</span>
                  </div>
                  {(project.start_date || project.due_date) && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {project.start_date ? format(new Date(project.start_date), 'MMM d') : ''}
                      {project.start_date && project.due_date ? ' → ' : ''}
                      {project.due_date ? format(new Date(project.due_date), 'MMM d, yyyy') : ''}
                    </div>
                  )}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-right font-medium">
                  {formatCurrency(project.budget)}
                </TableCell>
                <TableCell>
                  {(() => {
                    const canEdit = currentUser.role !== 'member' || project.created_by === currentUser.id;

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
                            <Link href={`/projects/${project.id}`}>
                              <ArrowRight className="h-4 w-4 mr-2" />
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigator.clipboard.writeText(project.id)}>
                            Copy ID
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {canEdit && (
                            <DropdownMenuItem onClick={() => setEditingProject(project)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Project
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {currentUser.role !== 'member' && (
                            <DropdownMenuItem className="text-destructive focus:bg-destructive focus:text-destructive-foreground" onClick={() => setDeletingId(project.id)}>
                              <Trash className="h-4 w-4 mr-2" />
                              Delete Project
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

      <ProjectFormDialog 
        project={editingProject || undefined} 
        clients={clients}
        open={!!editingProject} 
        onOpenChange={(open) => !open && setEditingProject(null)} 
      />

      <ConfirmDeleteDialog
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete project?"
        description="This project will be permanently deleted. This action cannot be undone."
        isPending={isPending}
      />
    </div>
  )
}
