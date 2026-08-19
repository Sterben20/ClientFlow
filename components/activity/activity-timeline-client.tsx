'use client'

import { useState, useEffect } from 'react'
import { Activity } from '@/types'
import { ActivityItem } from './activity-item'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { getClientTimeline, getProjectTimeline, ActivityFilter } from '@/app/(dashboard)/activity/actions'
import { getRecentActivity } from '@/app/(dashboard)/dashboard/actions'

type FilterType = 'all' | 'clients' | 'projects' | 'tasks' | 'notes' | 'members' | 'deals';

export const FILTER_CONFIG: Record<FilterType, { label: string, entity_types: Activity['entity_type'][] }> = {
  all: { label: 'All Activity', entity_types: ['client', 'project', 'task', 'note', 'member', 'deal'] },
  clients: { label: 'Clients', entity_types: ['client'] },
  projects: { label: 'Projects', entity_types: ['project'] },
  tasks: { label: 'Tasks', entity_types: ['task'] },
  notes: { label: 'Notes', entity_types: ['note'] },
  members: { label: 'Team', entity_types: ['member'] },
  deals: { label: 'Deals', entity_types: ['deal'] }
};

interface ActivityTimelineClientProps {
  initialActivities: Activity[]
  contextType: 'client' | 'project' | 'dashboard'
  contextId?: string // Required for client/project
  availableFilters?: ActivityFilter[]
}

export function ActivityTimelineClient({
  initialActivities,
  contextType,
  contextId,
  availableFilters = ['all']
}: ActivityTimelineClientProps) {
  const [activities, setActivities] = useState<Activity[]>(initialActivities)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(initialActivities.length === (contextType === 'dashboard' ? 5 : 20))
  const [activeFilter, setActiveFilter] = useState<ActivityFilter>('all')

  useEffect(() => {
    setActivities(initialActivities)
    setPage(1)
    setHasMore(initialActivities.length === (contextType === 'dashboard' ? 5 : 20))
  }, [initialActivities, contextType])

  const fetchActivities = async (pageNum: number, filter: ActivityFilter, append: boolean = false) => {
    setLoading(true)
    setError(null)
    try {
      let newActivities: Activity[] = []
      
      if (contextType === 'client' && contextId) {
        newActivities = await getClientTimeline(contextId, pageNum, filter)
      } else if (contextType === 'project' && contextId) {
        newActivities = await getProjectTimeline(contextId, pageNum, filter)
      } else if (contextType === 'dashboard') {
        // We do not filter dashboard activities in MVP based on requirements
        newActivities = await getRecentActivity(pageNum)
      }

      if (append) {
        // Avoid duplicates by comparing IDs
        setActivities(prev => {
          const existingIds = new Set(prev.map(a => a.id))
          const filteredNew = newActivities.filter(a => !existingIds.has(a.id))
          return [...prev, ...filteredNew]
        })
      } else {
        setActivities(newActivities)
      }
      
      const limit = contextType === 'dashboard' ? 5 : 20
      setHasMore(newActivities.length === limit)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load activity right now.')
    } finally {
      setLoading(false)
    }
  }

  const handleLoadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchActivities(nextPage, activeFilter, true)
  }

  const handleFilterChange = (filter: ActivityFilter) => {
    if (filter === activeFilter) return
    setActiveFilter(filter)
    setPage(1)
    fetchActivities(1, filter, false)
  }

  // Grouping logic
  const groupedActivities = activities.reduce((acc, activity) => {
    const date = new Date(activity.created_at)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    // reset time for proper comparison
    today.setHours(0, 0, 0, 0)
    yesterday.setHours(0, 0, 0, 0)
    const activityDate = new Date(date)
    activityDate.setHours(0, 0, 0, 0)

    let group = 'Older'
    if (activityDate.getTime() === today.getTime()) {
      group = 'Today'
    } else if (activityDate.getTime() === yesterday.getTime()) {
      group = 'Yesterday'
    } else if (today.getTime() - activityDate.getTime() <= 7 * 24 * 60 * 60 * 1000) {
      group = 'Earlier this week'
    }

    if (!acc[group]) acc[group] = []
    acc[group].push(activity)
    return acc
  }, {} as Record<string, Activity[]>)

  const groupOrder = ['Today', 'Yesterday', 'Earlier this week', 'Older']

  return (
    <div className="space-y-6">
      {availableFilters.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {availableFilters.map(filter => (
            <Button
              key={filter}
              variant={activeFilter === filter ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => handleFilterChange(filter)}
              className="capitalize"
              disabled={loading}
            >
              {filter}
            </Button>
          ))}
        </div>
      )}

      {error && (
        <div className="p-4 rounded-md bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      {activities.length === 0 && !loading && !error && (
        <div className="text-sm text-muted-foreground text-center py-8 border rounded-lg border-dashed">
          <p className="font-medium mb-1">No activity yet</p>
          <p>Activity from clients, projects, tasks, and notes will appear here.</p>
        </div>
      )}

      <div className="space-y-8">
        {groupOrder.map(group => {
          const groupActs = groupedActivities[group]
          if (!groupActs || groupActs.length === 0) return null
          
          return (
            <div key={group} className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground sticky top-0 bg-card py-1 z-10">
                {group}
              </h4>
              <div className="space-y-6">
                {groupActs.map(activity => (
                  <ActivityItem key={activity.id} activity={activity} />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {hasMore && (
        <div className="pt-4 flex justify-center">
          <Button 
            variant="outline" 
            onClick={handleLoadMore} 
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Load More
          </Button>
        </div>
      )}
    </div>
  )
}
