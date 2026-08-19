'use server'

import { createClient as createSupabase } from '@/lib/supabase/server'
import { requireWorkspaceAccess } from '@/lib/workspace'

export async function getSummaryCounts() {
  const { workspaceId } = await requireWorkspaceAccess()
  const supabase = createSupabase()
  
  const [
    { count: totalClients },
    { count: activeProjects },
    { count: pipelineDeals },
    { count: dueTasks },
    { count: wonDeals },
    { count: lostDeals },
    { data: openDealsData }
  ] = await Promise.all([
    supabase.from('clients').select('*', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
    supabase.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'active').eq('workspace_id', workspaceId),
    supabase.from('deals').select('*', { count: 'exact', head: true }).not('stage', 'in', '("won","lost")').eq('workspace_id', workspaceId),
    supabase.from('tasks').select('*', { count: 'exact', head: true }).neq('status', 'done').eq('workspace_id', workspaceId),
    supabase.from('deals').select('*', { count: 'exact', head: true }).eq('stage', 'won').eq('workspace_id', workspaceId),
    supabase.from('deals').select('*', { count: 'exact', head: true }).eq('stage', 'lost').eq('workspace_id', workspaceId),
    supabase.from('deals').select('value').not('stage', 'in', '("won","lost")').eq('workspace_id', workspaceId)
  ])

  const totalDealValue = (openDealsData || []).reduce((sum, d) => sum + Number(d.value), 0)

  return {
    totalClients: totalClients || 0,
    activeProjects: activeProjects || 0,
    pipelineDeals: pipelineDeals || 0,
    dueTasks: dueTasks || 0,
    wonDeals: wonDeals || 0,
    lostDeals: lostDeals || 0,
    totalDealValue
  }
}

export async function getChartData() {
  const { workspaceId } = await requireWorkspaceAccess()
  const supabase = createSupabase()
  
  const { data: topDeals } = await supabase
    .from('deals')
    .select('name, value')
    .eq('workspace_id', workspaceId)
    .order('value', { ascending: false })
    .limit(5)

  const chartData = (topDeals || []).map(deal => ({
    name: deal.name.length > 15 ? deal.name.substring(0, 15) + '...' : deal.name,
    total: Number(deal.value)
  }))

  return chartData
}

export async function getRecentActivity(page: number = 1) {
  const { workspaceId } = await requireWorkspaceAccess()
  const supabase = createSupabase()
  
  const limit = 5
  const offset = (page - 1) * limit

  const { data: activities, error } = await supabase
    .from('activities')
    .select(`
      *,
      profiles (
        full_name,
        email,
        avatar_url
      )
    `)
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error("Error fetching recent activity:", error)
    throw new Error('Unable to load activity right now.')
  }

  return activities || []
}
