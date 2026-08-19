"use client"

import { useState, useMemo } from "react"
import { DealList } from "./deal-list"
import { DealKanban } from "./deal-kanban"
import { DealFormDialog } from "./deal-form-dialog"
import { Button } from "@/components/ui/button"
import { Plus, LayoutList, KanbanSquare, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MetricCard } from "@/components/ui/metric-card"
import type { Deal, ClientOption, Profile } from "@/types"

export function DealsClientView({ 
  initialDeals, 
  clients, 
  members,
  currentUser
}: { 
  initialDeals: Deal[], 
  clients: ClientOption[], 
  members: Profile[],
  currentUser: { id: string, role: string }
}) {
  const [view, setView] = useState<'list' | 'kanban'>('kanban')
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState<string>('all')
  const [ownerFilter, setOwnerFilter] = useState<string>('all')
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(amount);
  }

  const filteredDeals = initialDeals.filter(deal => {
    if (search) {
      const s = search.toLowerCase()
      const matchName = deal.name?.toLowerCase().includes(s)
      const matchClientName = deal.clients?.name?.toLowerCase().includes(s)
      const matchClientEmail = deal.clients?.email?.toLowerCase().includes(s)
      const matchOwnerName = deal.profiles?.full_name?.toLowerCase().includes(s)
      const matchOwnerEmail = deal.profiles?.email?.toLowerCase().includes(s)
      
      if (!matchName && !matchClientName && !matchClientEmail && !matchOwnerName && !matchOwnerEmail) {
        return false
      }
    }
    if (stageFilter !== 'all' && deal.stage !== stageFilter) return false
    if (ownerFilter !== 'all' && deal.owner_id !== ownerFilter) return false
    return true
  })

  // Derive metrics from the same filteredDeals — same formula as the original server component
  const metrics = useMemo(() => {
    const openDeals = filteredDeals.filter(d => d.stage !== 'won' && d.stage !== 'lost')
    const wonDeals = filteredDeals.filter(d => d.stage === 'won')
    const lostDeals = filteredDeals.filter(d => d.stage === 'lost')
    const totalOpen = openDeals.length
    const totalValue = openDeals.reduce((sum, d) => sum + Number(d.value), 0)
    const expectedValue = openDeals.reduce((sum, d) => {
      const val = Number(d.value)
      switch (d.stage) {
        case 'lead': return sum + val * 0.1
        case 'qualified': return sum + val * 0.3
        case 'proposal': return sum + val * 0.5
        case 'negotiation': return sum + val * 0.8
        default: return sum
      }
    }, 0)
    return {
      totalOpen,
      totalValue,
      expectedValue,
      wonDeals: wonDeals.length,
      lostDeals: lostDeals.length
    }
  // filteredDeals identity changes whenever search/stageFilter/ownerFilter change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, stageFilter, ownerFilter, initialDeals])

  // When filters are active, find the first stage (in board order) that has a
  // matching deal so the Kanban can auto-scroll to bring it into view.
  const STAGE_ORDER = ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost']
  const scrollToStage = useMemo(() => {
    const hasActiveFilter = search.trim() !== '' || stageFilter !== 'all' || ownerFilter !== 'all'
    if (!hasActiveFilter || filteredDeals.length === 0) return null
    for (const stageId of STAGE_ORDER) {
      if (filteredDeals.some(d => d.stage === stageId)) return stageId
    }
    return null
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, stageFilter, ownerFilter])


  return (
    <div className="flex flex-col gap-6 w-full min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Deals</h2>
          <p className="text-muted-foreground mt-2">
            Track potential sales, contracts, and manage your pipeline.
          </p>
        </div>
        <DealFormDialog clients={clients} members={members} currentUser={currentUser}>
          <Button className="gap-2 w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            New Deal
          </Button>
        </DealFormDialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5 gap-4">
        <MetricCard
          title="Open Deals"
          value={metrics.totalOpen}
        />
        <MetricCard
          title="Total Pipeline Value"
          value={formatCurrency(metrics.totalValue)}
          valueClassName="text-blue-600"
        />
        <MetricCard
          title="Expected Value"
          value={formatCurrency(metrics.expectedValue)}
          valueClassName="text-indigo-600"
        />
        <MetricCard
          title="Won Deals"
          value={metrics.wonDeals}
          valueClassName="text-emerald-600"
        />
        <MetricCard
          title="Lost Deals"
          value={metrics.lostDeals}
          valueClassName="text-red-600"
        />
      </div>

      <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 bg-muted/40 p-4 rounded-lg">
        <div className="flex flex-col md:flex-row flex-1 w-full items-stretch md:items-center gap-4">
          <div className="relative flex-1 w-full lg:max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search deals..."
              className="pl-9 bg-background w-full"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-full md:w-[150px] bg-background">
              <SelectValue placeholder="Stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              <SelectItem value="lead">Lead</SelectItem>
              <SelectItem value="qualified">Qualified</SelectItem>
              <SelectItem value="proposal">Proposal</SelectItem>
              <SelectItem value="negotiation">Negotiation</SelectItem>
              <SelectItem value="won">Won</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
            </SelectContent>
          </Select>

          <Select value={ownerFilter} onValueChange={setOwnerFilter}>
            <SelectTrigger className="w-full md:w-[180px] bg-background">
              <SelectValue placeholder="Owner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Owners</SelectItem>
              {members.map(m => (
                <SelectItem key={m.id} value={m.id}>{m.full_name || m.email}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1 bg-background border p-1 rounded-md shrink-0 w-full md:w-auto mt-2 lg:mt-0">
          <Button 
            variant={view === 'list' ? "secondary" : "ghost"} 
            size="sm" 
            className="flex-1 md:flex-none px-2"
            onClick={() => setView('list')}
          >
            <LayoutList className="h-4 w-4 mr-2" />
            List
          </Button>
          <Button 
            variant={view === 'kanban' ? "secondary" : "ghost"} 
            size="sm" 
            className="flex-1 md:flex-none px-2"
            onClick={() => setView('kanban')}
          >
            <KanbanSquare className="h-4 w-4 mr-2" />
            Kanban
          </Button>
        </div>
      </div>

      {view === 'list' ? (
        <DealList 
          deals={filteredDeals} 
          onEdit={setEditingDeal} 
          currentUser={currentUser}
        />
      ) : (
        <DealKanban 
          deals={filteredDeals} 
          onEdit={setEditingDeal}
          scrollToStage={scrollToStage}
          currentUser={currentUser}
        />
      )}

      <DealFormDialog 
        deal={editingDeal || undefined} 
        clients={clients}
        members={members}
        currentUser={currentUser}
        open={!!editingDeal} 
        onOpenChange={(open) => !open && setEditingDeal(null)} 
      />
    </div>
  )
}
