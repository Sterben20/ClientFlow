"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Deal } from "@/types"
import { updateDealStage } from "@/app/(dashboard)/deals/actions"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { format } from "date-fns"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { MoreHorizontal } from "lucide-react"

const STAGES = [
  { id: 'lead', label: 'Lead' },
  { id: 'qualified', label: 'Qualified' },
  { id: 'proposal', label: 'Proposal' },
  { id: 'negotiation', label: 'Negotiation' },
  { id: 'won', label: 'Won' },
  { id: 'lost', label: 'Lost' }
] as const;

type StageId = typeof STAGES[number]['id'];

export function DealKanban({ deals, onEdit, scrollToStage, currentUser }: { deals: Deal[], onEdit: (deal: Deal) => void, scrollToStage?: string | null, currentUser: { id: string, role: string } }) {
  const { toast } = useToast()
  const scrollRef = useRef<HTMLDivElement>(null)
  const leftGradientRef = useRef<HTMLDivElement>(null)
  const rightGradientRef = useRef<HTMLDivElement>(null)
  // Ref map: stageId → column DOM element
  const columnRefs = useRef<Record<string, HTMLDivElement | null>>({})

  // Optimistic local deal state
  const [localDeals, setLocalDeals] = useState<Deal[]>(deals)
  // Track which deal is currently being dragged (by id, for visual-only style)
  const [draggingDealId, setDraggingDealId] = useState<string | null>(null)
  // Track which deal is being dragged (ref, for drop logic — avoids stale closure)
  const dragDealRef = useRef<Deal | null>(null)

  // Keep local state in sync when parent deals prop changes (after revalidation)
  useEffect(() => {
    setLocalDeals(deals)
  }, [deals])

  const checkScroll = useCallback(() => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
      if (leftGradientRef.current) {
        leftGradientRef.current.style.opacity = scrollLeft > 0 ? "1" : "0"
      }
      if (rightGradientRef.current) {
        rightGradientRef.current.style.opacity = Math.ceil(scrollLeft + clientWidth) < scrollWidth ? "1" : "0"
      }
    }
  }, [])

  useEffect(() => {
    checkScroll()
    window.addEventListener('resize', checkScroll)
    return () => window.removeEventListener('resize', checkScroll)
  }, [localDeals, checkScroll])

  // ── Auto-scroll to the target stage column when filters change ─────────────
  const scrollToStageColumn = useCallback((stageId: string) => {
    const container = scrollRef.current
    const column = columnRefs.current[stageId]
    if (!container || !column) return

    const containerLeft = container.scrollLeft
    const containerRight = containerLeft + container.clientWidth
    const columnLeft = column.offsetLeft
    const columnRight = columnLeft + column.offsetWidth

    // Only scroll if the column is NOT already fully visible
    const alreadyVisible = columnLeft >= containerLeft && columnRight <= containerRight
    if (!alreadyVisible) {
      container.scrollTo({ left: columnLeft - 16, behavior: 'smooth' })
    }
  }, [])

  useEffect(() => {
    if (!scrollToStage) return
    // Small delay to ensure layout has settled after filter change
    const t = setTimeout(() => scrollToStageColumn(scrollToStage), 60)
    return () => clearTimeout(t)
  }, [scrollToStage, scrollToStageColumn])
  
  async function handleStageUpdate(id: string, stage: StageId) {
    const result = await updateDealStage(id, stage)
    if (result.success) {
      toast({ title: "Stage updated successfully" })
    } else {
      toast({ title: "Error updating stage", description: result.error, variant: "destructive" })
    }
  }

  // ── Drag handlers on the card ──────────────────────────────────────────────

  function handleDragStart(e: React.DragEvent<HTMLDivElement>, deal: Deal) {
    dragDealRef.current = deal
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("dealId", deal.id)
    // Use RAF so the browser captures the ghost snapshot at full opacity first,
    // then we apply the dim via React state (not imperative DOM mutation).
    requestAnimationFrame(() => {
      setDraggingDealId(deal.id)
    })
  }

  function handleDragEnd() {
    dragDealRef.current = null
    setDraggingDealId(null)
    // Clear any stuck drop styles
    Object.values(columnRefs.current).forEach(col => {
      if (col) {
        col.classList.remove("bg-primary/5", "ring-2", "ring-primary/30", "ring-inset")
      }
    })
  }

  // ── Drag handlers on the column drop zone ─────────────────────────────────

  function handleDragOver(e: React.DragEvent<HTMLDivElement>, stageId: StageId) {
    e.preventDefault() // required to allow drop
    e.dataTransfer.dropEffect = "move"
    
    // Imperative style update avoids full-board React re-render during native drag
    const column = columnRefs.current[stageId]
    if (column && !column.classList.contains("bg-primary/5")) {
      column.classList.add("bg-primary/5", "ring-2", "ring-primary/30", "ring-inset")
    }
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>, stageId: StageId) {
    // Only clear if leaving the column entirely (not entering a child)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      const column = columnRefs.current[stageId]
      if (column) {
        column.classList.remove("bg-primary/5", "ring-2", "ring-primary/30", "ring-inset")
      }
    }
  }

  async function handleDrop(e: React.DragEvent<HTMLDivElement>, targetStageId: StageId) {
    e.preventDefault()
    
    const column = columnRefs.current[targetStageId]
    if (column) {
      column.classList.remove("bg-primary/5", "ring-2", "ring-primary/30", "ring-inset")
    }

    const deal = dragDealRef.current
    if (!deal) return
    if (deal.stage === targetStageId) return // dropped onto same column — no-op

    const originalStage = deal.stage as StageId

    // ── Optimistic update ──
    setLocalDeals(prev =>
      prev.map(d => d.id === deal.id ? { ...d, stage: targetStageId } : d)
    )

    // ── Persist to backend ──
    const result = await updateDealStage(deal.id, targetStageId)
    if (result.success) {
      toast({ title: `Moved to ${STAGES.find(s => s.id === targetStageId)?.label}` })
    } else {
      // ── Rollback on failure ──
      setLocalDeals(prev =>
        prev.map(d => d.id === deal.id ? { ...d, stage: originalStage } : d)
      )
      toast({
        title: "Failed to move deal",
        description: result.error,
        variant: "destructive"
      })
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  return (
    <div className="relative w-full max-w-full min-w-0 rounded-lg bg-background border p-4 shadow-sm group">
      <div 
        ref={leftGradientRef}
        className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none rounded-l-lg transition-opacity duration-300" 
        style={{ opacity: 0 }}
      />
      <div 
        ref={rightGradientRef}
        className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none rounded-r-lg transition-opacity duration-300" 
        style={{ opacity: 0 }}
      />
      <div 
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex gap-4 overflow-x-auto overflow-y-hidden pb-4 items-start w-full max-w-full min-w-0 snap-x scroll-smooth custom-scrollbar"
      >
        {STAGES.map(stage => {
          const stageId = stage.id as StageId
          const columnDeals = localDeals.filter(d => d.stage === stageId)

          return (
            <div
              key={stageId}
              ref={(el) => { columnRefs.current[stageId] = el }}
              className="w-[280px] flex-shrink-0 flex flex-col gap-3 rounded-lg transition-colors duration-150"
              onDragOver={(e) => handleDragOver(e, stageId)}
              onDragLeave={(e) => handleDragLeave(e, stageId)}
              onDrop={(e) => handleDrop(e, stageId)}
            >
              {/* Column header */}
              <div className="flex items-center justify-between font-semibold text-sm px-1 pt-1">
                <span className="text-muted-foreground uppercase tracking-wider text-xs">
                  {stage.label} ({columnDeals.length})
                </span>
                <span className="text-muted-foreground text-xs font-medium">
                  {formatCurrency(columnDeals.reduce((sum, d) => sum + Number(d.value), 0))}
                </span>
              </div>

              {/* Cards */}
              <div className="flex flex-col gap-3 min-h-[60px]">
                {columnDeals.map(deal => {
                  const canEdit = currentUser.role !== 'member' || deal.owner_id === currentUser.id;
                  
                  return (
                    <div
                      key={deal.id}
                      draggable={canEdit}
                      onDragStart={(e) => canEdit && handleDragStart(e, deal)}
                      onDragEnd={canEdit ? handleDragEnd : undefined}
                      className={[
                        canEdit ? "cursor-grab active:cursor-grabbing" : "cursor-default",
                        "select-none transition-opacity duration-150",
                        draggingDealId === deal.id ? "opacity-40" : "opacity-100"
                      ].join(" ")}
                    >
                      <Card className="shadow-sm hover:shadow transition-shadow">
                        <CardHeader className="p-3 pb-2 flex flex-row items-start justify-between space-y-0">
                          <div className="font-medium text-sm truncate pr-2">{deal.name}</div>
                          {/* Three-dot menu — stopPropagation prevents drag from triggering on menu clicks */}
                          {canEdit && (
                            <div
                              onMouseDown={(e) => e.stopPropagation()}
                              onPointerDown={(e) => e.stopPropagation()}
                              draggable={false}
                            >
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-6 w-6 p-0 shrink-0 -mr-2 -mt-1">
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Change Stage</DropdownMenuLabel>
                                  {STAGES.filter(s => s.id !== deal.stage).map(s => (
                                    <DropdownMenuItem key={s.id} onClick={() => handleStageUpdate(deal.id, s.id as StageId)}>
                                      Move to {s.label}
                                    </DropdownMenuItem>
                                  ))}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => onEdit(deal)}>Edit Deal</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          )}
                        </CardHeader>
                      <CardContent className="p-3 pt-0 flex flex-col gap-2 text-xs">
                        <div className="text-muted-foreground truncate">
                          {deal.clients?.name || <span className="italic">No Client</span>}
                          {deal.clients?.company && ` • ${deal.clients.company}`}
                        </div>
                        
                        <div className="flex items-center justify-between mt-2">
                          <span className="font-semibold text-foreground">
                            {formatCurrency(deal.value)}
                          </span>
                          {deal.expected_close_date && (
                            <span className="text-muted-foreground">
                              {format(new Date(deal.expected_close_date), 'MMM d, yy')}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-1 pt-2 border-t">
                          <div className="flex items-center gap-1.5">
                            <Avatar className="h-5 w-5 border">
                              <AvatarImage src={deal.profiles?.avatar_url || ''} />
                              <AvatarFallback className="text-[9px]">
                                {deal.profiles?.full_name?.charAt(0).toUpperCase() || deal.profiles?.email.charAt(0).toUpperCase() || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-muted-foreground truncate max-w-[120px]">
                              {deal.profiles?.full_name || deal.profiles?.email || 'Unassigned'}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )})}

                {columnDeals.length === 0 && (
                  <div className="p-4 border-2 border-dashed rounded-lg text-center text-xs text-muted-foreground transition-colors pointer-events-none">
                    No deals
                  </div>
                )}
              </div>
            </div>
          )
        })}
        
        {/* Invisible spacer to ensure final column padding works inside scroll container */}
        <div className="w-2 shrink-0 h-full" aria-hidden="true" />
      </div>
    </div>
  )
}
