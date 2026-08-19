import { notFound } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"
import { ArrowLeft, Building2, Calendar, Globe, Mail, MapPin, Phone, UserCircle2 } from "lucide-react"

import { createClient as createSupabase } from "@/lib/supabase/server"
import { requireWorkspaceAccess } from "@/lib/workspace"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ClientDetailActions } from "./client-detail-actions"
import { ClientNotes } from "./client-notes"
import { ActivityTimelineClient } from "@/components/activity/activity-timeline-client"
import { getClientTimeline } from "../../activity/actions"

export async function generateMetadata({ params }: { params: { id: string } }) {
  const { workspaceId } = await requireWorkspaceAccess()
  const supabase = createSupabase()
  
  const { data: client } = await supabase
    .from('clients')
    .select('name')
    .eq('id', params.id)
    .eq('workspace_id', workspaceId)
    .single()
    
  if (!client) {
    return { title: 'Client Not Found — ClientFlow' }
  }
  
  return { title: `${client.name} — ClientFlow` }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'active':
      return <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20">Active</Badge>
    case 'lead':
      return <Badge variant="outline" className="text-muted-foreground">Lead</Badge>
    case 'prospect':
      return <Badge className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/20">Prospect</Badge>
    case 'inactive':
      return <Badge variant="secondary">Inactive</Badge>
    default:
      return <Badge variant="outline" className="capitalize">{status}</Badge>
  }
}

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const { workspaceId, role, user } = await requireWorkspaceAccess()
  const supabase = createSupabase()

  const { data: client, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', params.id)
    .eq('workspace_id', workspaceId)
    .single()

  if (error || !client) {
    notFound()
  }

  const { data: deals } = await supabase
    .from('deals')
    .select(`
      id,
      name,
      stage,
      value,
      expected_close_date,
      profiles (
        full_name,
        email,
        avatar_url
      )
    `)
    .eq('client_id', params.id)
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  const { data: notes } = await supabase
    .from('client_notes')
    .select(`
      *,
      profiles(full_name, email)
    `)
    .eq('client_id', params.id)
    .order('created_at', { ascending: false })

  const initialActivities = await getClientTimeline(params.id, 1, 'all')

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/clients" className="text-sm text-muted-foreground hover:text-foreground flex items-center transition-colors">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Clients
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-2xl font-semibold text-primary">
              {client.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              {client.name}
              {getStatusBadge(client.status)}
            </h1>
            {client.company && (
              <p className="text-muted-foreground flex items-center mt-1">
                <Building2 className="h-4 w-4 mr-1.5" />
                {client.company}
              </p>
            )}
          </div>
        </div>
        <ClientDetailActions client={client} currentUser={{ id: user.id, role }} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        {/* Left Column */}
        <div className="space-y-6 md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Client Information</CardTitle>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-sm text-muted-foreground flex items-center">
                  <UserCircle2 className="h-4 w-4 mr-1.5" />
                  Full Name
                </span>
                <p className="font-medium">{client.name}</p>
              </div>
              <div className="space-y-1">
                <span className="text-sm text-muted-foreground flex items-center">
                  <Building2 className="h-4 w-4 mr-1.5" />
                  Company
                </span>
                <p className="font-medium">{client.company || <span className="text-muted-foreground italic font-normal">Not provided</span>}</p>
              </div>
              <div className="space-y-1">
                <span className="text-sm text-muted-foreground flex items-center">
                  <MapPin className="h-4 w-4 mr-1.5" />
                  Source
                </span>
                <p className="font-medium">{client.source || <span className="text-muted-foreground italic font-normal">Not provided</span>}</p>
              </div>
              <div className="space-y-1">
                <span className="text-sm text-muted-foreground flex items-center">
                  <Calendar className="h-4 w-4 mr-1.5" />
                  Created
                </span>
                <p className="font-medium">{format(new Date(client.created_at), 'MMMM d, yyyy')}</p>
              </div>
            </CardContent>
          </Card>

          <ClientNotes 
            clientId={client.id} 
            notes={notes || []} 
            currentUserId={user.id} 
            currentUserRole={role} 
          />
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityTimelineClient 
                initialActivities={initialActivities} 
                contextType="client" 
                contextId={params.id}
                availableFilters={['all', 'projects', 'tasks', 'notes']}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <span className="text-sm text-muted-foreground flex items-center">
                  <Mail className="h-4 w-4 mr-1.5" />
                  Email
                </span>
                {client.email ? (
                  <a href={`mailto:${client.email}`} className="text-sm font-medium hover:underline text-primary">
                    {client.email}
                  </a>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Not provided</p>
                )}
              </div>
              
              <div className="space-y-1">
                <span className="text-sm text-muted-foreground flex items-center">
                  <Phone className="h-4 w-4 mr-1.5" />
                  Phone
                </span>
                {client.phone ? (
                  <a href={`tel:${client.phone}`} className="text-sm font-medium hover:underline text-primary">
                    {client.phone}
                  </a>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Not provided</p>
                )}
              </div>

              <div className="space-y-1">
                <span className="text-sm text-muted-foreground flex items-center">
                  <Globe className="h-4 w-4 mr-1.5" />
                  Website
                </span>
                {client.website ? (
                  <a 
                    href={client.website.startsWith('http') ? client.website : `https://${client.website}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-sm font-medium hover:underline text-primary break-all"
                  >
                    {client.website}
                  </a>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Not provided</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg">Related Deals</CardTitle>
              <Link href="/deals">
                <Badge variant="secondary" className="hover:bg-secondary cursor-pointer">View All</Badge>
              </Link>
            </CardHeader>
            <CardContent>
              {deals && deals.length > 0 ? (
                <div className="space-y-4 pt-2">
                  {deals.map(deal => (
                    <div key={deal.id} className="flex flex-col gap-1 border-b last:border-0 pb-3 last:pb-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{deal.name}</span>
                        <Badge variant="outline" className="text-[10px] uppercase">{deal.stage}</Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                        <span>{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(deal.value)}</span>
                        {deal.expected_close_date && <span>{format(new Date(deal.expected_close_date), 'MMM d, yyyy')}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground italic mt-2">No deals associated with this client.</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
