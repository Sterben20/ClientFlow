"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
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
  { id: "lead", label: "Lead" },
  { id: "qualified", label: "Qualified" },
  { id: "proposal", label: "Proposal" },
  { id: "negotiation", label: "Negotiation" },
  { id: "won", label: "Won" },
  { id: "lost", label: "Lost" },
] as const

type StageId = (typeof STAGES)[number]["id"]

// ─── Drag configuration ──────────────────────────────────────────────────────
const DRAG_THRESHOLD_PX = 5 // pointer movement before drag activates
const LONG_PRESS_MS = 150 // long-press delay for touch activation
const EDGE_ZONE_PX = 60 // width of auto-scroll hot zone at edges
const EDGE_MAX_SPEED = 10 // max px per animation frame at edge
const OVERLAY_OFFSET = 10 // gap between pointer and overlay
const COLUMN_HIGHLIGHT = ["bg-primary/5", "ring-2", "ring-primary/30", "ring-inset"]

export function DealKanban({
  deals,
  onEdit,
  scrollToStage,
  currentUser,
}: {
  deals: Deal[]
  onEdit: (deal: Deal) => void
  scrollToStage?: string | null
  currentUser: { id: string; role: string }
}) {
  const { toast } = useToast()

  // ── DOM refs ──────────────────────────────────────────────────────────────
  const scrollRef = useRef<HTMLDivElement>(null)
  const leftGradientRef = useRef<HTMLDivElement>(null)
  const rightGradientRef = useRef<HTMLDivElement>(null)
  const columnRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const overlayRef = useRef<HTMLDivElement>(null)
  const overlayTargetRef = useRef<HTMLSpanElement>(null)

  // ── React state (minimal — only changed at drag start/end and on drops) ───
  const [localDeals, setLocalDeals] = useState<Deal[]>(deals)
  const [showOverlay, setShowOverlay] = useState(false)
  const [mounted, setMounted] = useState(false)

  // ── Drag state refs (mutated during drag — zero re-renders) ──────────────
  const dragDeal = useRef<Deal | null>(null)
  const startPos = useRef<{ x: number; y: number } | null>(null)
  const isTracking = useRef(false) // pointer is down, threshold not yet met
  const isDragging = useRef(false) // drag is active
  const currentPointer = useRef<{ x: number; y: number } | null>(null)
  const activeStage = useRef<string | null>(null) // currently highlighted column
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scrollRaf = useRef(0)
  const savedTouchAction = useRef("")

  // ── Portal mount ──────────────────────────────────────────────────────────
  useEffect(() => {
    setMounted(true)
  }, [])

  // ── Sync deals from parent ────────────────────────────────────────────────
  useEffect(() => {
    setLocalDeals(deals)
  }, [deals])

  // ═══════════════════════════════════════════════════════════════════════════
  // SCROLL GRADIENT INDICATORS
  // ═══════════════════════════════════════════════════════════════════════════

  const checkScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const { scrollLeft, scrollWidth, clientWidth } = el
    if (leftGradientRef.current) {
      leftGradientRef.current.style.opacity = scrollLeft > 0 ? "1" : "0"
    }
    if (rightGradientRef.current) {
      rightGradientRef.current.style.opacity =
        Math.ceil(scrollLeft + clientWidth) < scrollWidth ? "1" : "0"
    }
  }, [])

  useEffect(() => {
    checkScroll()
    window.addEventListener("resize", checkScroll)
    return () => window.removeEventListener("resize", checkScroll)
  }, [localDeals, checkScroll])

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTO-SCROLL TO STAGE COLUMN ON FILTER CHANGE
  // ═══════════════════════════════════════════════════════════════════════════

  const scrollToStageColumn = useCallback((stageId: string) => {
    const container = scrollRef.current
    const column = columnRefs.current[stageId]
    if (!container || !column) return

    const containerLeft = container.scrollLeft
    const containerRight = containerLeft + container.clientWidth
    const columnLeft = column.offsetLeft
    const columnRight = columnLeft + column.offsetWidth

    const alreadyVisible = columnLeft >= containerLeft && columnRight <= containerRight
    if (!alreadyVisible) {
      container.scrollTo({ left: columnLeft - 16, behavior: "smooth" })
    }
  }, [])

  useEffect(() => {
    if (!scrollToStage) return
    const t = setTimeout(() => scrollToStageColumn(scrollToStage), 60)
    return () => clearTimeout(t)
  }, [scrollToStage, scrollToStageColumn])

  // ═══════════════════════════════════════════════════════════════════════════
  // MENU-BASED STAGE UPDATE (fallback — always works, no drag needed)
  // ═══════════════════════════════════════════════════════════════════════════

  async function handleStageUpdate(id: string, stage: StageId) {
    const result = await updateDealStage(id, stage)
    if (result.success) {
      toast({ title: "Stage updated successfully" })
    } else {
      toast({
        title: "Error updating stage",
        description: result.error,
        variant: "destructive",
      })
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DRAG SYSTEM — HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  /** Hit-test which column the pointer is over, using live getBoundingClientRect. */
  const hitTestColumn = useCallback((x: number, y: number): string | null => {
    const entries = Object.entries(columnRefs.current)
    for (let i = 0; i < entries.length; i++) {
      const [stageId, el] = entries[i]
      if (!el) continue
      const r = el.getBoundingClientRect()
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
        return stageId
      }
    }
    return null
  }, [])

  /** Imperatively highlight the target column (avoids React re-renders). */
  const highlightColumn = useCallback((stageId: string | null) => {
    const prev = activeStage.current
    if (prev === stageId) return

    // Remove old highlight
    if (prev) {
      const el = columnRefs.current[prev]
      if (el) el.classList.remove(...COLUMN_HIGHLIGHT)
    }
    // Add new highlight
    if (stageId) {
      const el = columnRefs.current[stageId]
      if (el) el.classList.add(...COLUMN_HIGHLIGHT)
    }
    activeStage.current = stageId

    // Update overlay target label imperatively
    if (overlayTargetRef.current) {
      if (stageId) {
        const stage = STAGES.find((s) => s.id === stageId)
        overlayTargetRef.current.textContent = stage ? `\u2192 ${stage.label}` : ""
      } else {
        overlayTargetRef.current.textContent = ""
      }
    }
  }, [])

  /** Remove all column highlights. */
  const clearHighlights = useCallback(() => {
    Object.values(columnRefs.current).forEach((el) => {
      if (el) el.classList.remove(...COLUMN_HIGHLIGHT)
    })
    activeStage.current = null
    if (overlayTargetRef.current) overlayTargetRef.current.textContent = ""
  }, [])

  // ═══════════════════════════════════════════════════════════════════════════
  // DRAG SYSTEM — AUTO-SCROLL (requestAnimationFrame)
  // ═══════════════════════════════════════════════════════════════════════════

  const autoScrollTick = useCallback(() => {
    if (!isDragging.current || !scrollRef.current || !currentPointer.current) {
      scrollRaf.current = 0
      return
    }

    const container = scrollRef.current
    const containerRect = container.getBoundingClientRect()
    const px = currentPointer.current.x

    const distLeft = px - containerRect.left
    const distRight = containerRect.right - px

    let delta = 0

    if (distLeft >= 0 && distLeft < EDGE_ZONE_PX) {
      // Near left edge → scroll left
      const intensity = 1 - distLeft / EDGE_ZONE_PX
      delta = -(intensity * intensity * EDGE_MAX_SPEED)
    } else if (distRight >= 0 && distRight < EDGE_ZONE_PX) {
      // Near right edge → scroll right
      const intensity = 1 - distRight / EDGE_ZONE_PX
      delta = intensity * intensity * EDGE_MAX_SPEED
    }

    if (delta !== 0) {
      container.scrollLeft += delta

      // Re-hit-test after scroll (column positions changed)
      if (currentPointer.current) {
        const hit = hitTestColumn(currentPointer.current.x, currentPointer.current.y)
        highlightColumn(hit)
      }
    }

    scrollRaf.current = requestAnimationFrame(autoScrollTick)
  }, [hitTestColumn, highlightColumn])

  const startAutoScroll = useCallback(() => {
    if (scrollRaf.current) return
    scrollRaf.current = requestAnimationFrame(autoScrollTick)
  }, [autoScrollTick])

  const stopAutoScroll = useCallback(() => {
    if (scrollRaf.current) {
      cancelAnimationFrame(scrollRaf.current)
      scrollRaf.current = 0
    }
  }, [])

  // ═══════════════════════════════════════════════════════════════════════════
  // DRAG SYSTEM — ACTIVATION & DEACTIVATION
  // ═══════════════════════════════════════════════════════════════════════════

  const activateDrag = useCallback(
    (deal: Deal, x: number, y: number) => {
      isDragging.current = true
      dragDeal.current = deal
      currentPointer.current = { x, y }

      // Dim original card imperatively
      const cardEl = document.querySelector<HTMLElement>(
        `[data-deal-id="${deal.id}"]`,
      )
      if (cardEl) cardEl.style.opacity = "0.4"

      // Show overlay
      setShowOverlay(true)
      // Position overlay after React renders it
      requestAnimationFrame(() => {
        if (overlayRef.current) {
          overlayRef.current.style.left = `${x + OVERLAY_OFFSET}px`
          overlayRef.current.style.top = `${y + OVERLAY_OFFSET}px`
        }
        if (overlayTargetRef.current) overlayTargetRef.current.textContent = ""
      })

      // Prevent touch scrolling on the Kanban container
      if (scrollRef.current) {
        savedTouchAction.current = scrollRef.current.style.touchAction
        scrollRef.current.style.touchAction = "none"
      }

      startAutoScroll()
    },
    [startAutoScroll],
  )

  /** Execute the drop — optimistic update + server action + rollback on failure. */
  const executeDrop = useCallback(
    async (deal: Deal, targetStageId: StageId) => {
      if (deal.stage === targetStageId) return

      const originalStage = deal.stage as StageId

      // Optimistic update
      setLocalDeals((prev) =>
        prev.map((d) =>
          d.id === deal.id ? { ...d, stage: targetStageId } : d,
        ),
      )

      // Persist to backend
      const result = await updateDealStage(deal.id, targetStageId)
      if (result.success) {
        toast({
          title: `Moved to ${STAGES.find((s) => s.id === targetStageId)?.label}`,
        })
      } else {
        // Rollback on failure
        setLocalDeals((prev) =>
          prev.map((d) =>
            d.id === deal.id ? { ...d, stage: originalStage } : d,
          ),
        )
        toast({
          title: "Failed to move deal",
          description: result.error,
          variant: "destructive",
        })
      }
    },
    [toast],
  )

  /** End drag — clean up all state and execute drop if valid. */
  const endDrag = useCallback(() => {
    const deal = dragDeal.current
    const target = activeStage.current as StageId | null

    // Stop auto-scroll first
    stopAutoScroll()
    clearHighlights()

    // Restore touch-action
    if (scrollRef.current) {
      scrollRef.current.style.touchAction = savedTouchAction.current
    }

    // Restore original card opacity
    if (deal) {
      const cardEl = document.querySelector<HTMLElement>(
        `[data-deal-id="${deal.id}"]`,
      )
      if (cardEl) cardEl.style.opacity = ""
    }

    // Hide overlay
    setShowOverlay(false)

    // Reset all drag state refs
    isDragging.current = false
    isTracking.current = false
    dragDeal.current = null
    startPos.current = null
    currentPointer.current = null
    activeStage.current = null

    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }

    // Execute drop
    if (deal && target && deal.stage !== target) {
      executeDrop(deal, target)
    }
  }, [stopAutoScroll, clearHighlights, executeDrop])

  // ═══════════════════════════════════════════════════════════════════════════
  // DRAG SYSTEM — DOCUMENT-LEVEL POINTER EVENT LISTENERS
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      if (!isTracking.current && !isDragging.current) return

      // Prevent browser scroll during active drag
      if (isDragging.current) {
        e.preventDefault()
      }

      currentPointer.current = { x: e.clientX, y: e.clientY }

      if (!isDragging.current) {
        // Still in threshold-checking phase
        if (startPos.current) {
          const dx = Math.abs(e.clientX - startPos.current.x)
          const dy = Math.abs(e.clientY - startPos.current.y)

          if (dx > DRAG_THRESHOLD_PX || dy > DRAG_THRESHOLD_PX) {
            // Movement exceeded threshold
            if (longPressTimer.current) {
              clearTimeout(longPressTimer.current)
              longPressTimer.current = null
            }

            if (dy > dx * 1.5) {
              // Mostly vertical → user is scrolling, cancel drag tracking
              isTracking.current = false
              dragDeal.current = null
              startPos.current = null
              return
            }

            // Horizontal / diagonal → activate drag
            if (dragDeal.current && !isDragging.current) {
              activateDrag(dragDeal.current, startPos.current!.x, startPos.current!.y)
              currentPointer.current = { x: e.clientX, y: e.clientY }
            }
          }
        }
        return
      }

      // ── Drag is active: update overlay position imperatively ──
      if (overlayRef.current) {
        // Clamp to viewport so overlay doesn't escape off-screen
        const vw = window.innerWidth
        const vh = window.innerHeight
        const overlayW = 290 // approximate card width
        const overlayH = 100 // approximate card height
        const clampedX = Math.min(
          Math.max(e.clientX + OVERLAY_OFFSET, 0),
          vw - overlayW,
        )
        const clampedY = Math.min(
          Math.max(e.clientY + OVERLAY_OFFSET, 0),
          vh - overlayH,
        )
        overlayRef.current.style.left = `${clampedX}px`
        overlayRef.current.style.top = `${clampedY}px`
      }

      // Hit-test columns
      const hit = hitTestColumn(e.clientX, e.clientY)
      highlightColumn(hit)
    }

    const onPointerUp = () => {
      // Cancel pending long-press timer
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
        longPressTimer.current = null
      }

      if (!isTracking.current && !isDragging.current) return

      if (isDragging.current) {
        endDrag()
      } else {
        // Was tracking but never activated drag — clean up silently
        isTracking.current = false
        dragDeal.current = null
        startPos.current = null
      }
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isDragging.current) {
        endDrag()
      }
    }

    document.addEventListener("pointermove", onPointerMove, { passive: false })
    document.addEventListener("pointerup", onPointerUp)
    document.addEventListener("pointercancel", onPointerUp)
    document.addEventListener("keydown", onKeyDown)

    return () => {
      document.removeEventListener("pointermove", onPointerMove)
      document.removeEventListener("pointerup", onPointerUp)
      document.removeEventListener("pointercancel", onPointerUp)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [activateDrag, endDrag, hitTestColumn, highlightColumn])

  // ── Cleanup on unmount ─────────────────────────────────────────────────────
  useEffect(() => {
    const scrollEl = scrollRef.current
    return () => {
      stopAutoScroll()
      clearHighlights()
      if (longPressTimer.current) clearTimeout(longPressTimer.current)
      if (scrollEl) scrollEl.style.touchAction = ""
    }
  }, [stopAutoScroll, clearHighlights])

  // ═══════════════════════════════════════════════════════════════════════════
  // DRAG SYSTEM — CARD POINTER DOWN HANDLER
  // ═══════════════════════════════════════════════════════════════════════════

  const onCardPointerDown = useCallback(
    (e: React.PointerEvent, deal: Deal, canDrag: boolean) => {
      if (!canDrag || e.button !== 0) return

      // Begin tracking — the document-level pointermove will decide
      // whether this is a scroll or a drag based on movement threshold.
      isTracking.current = true
      dragDeal.current = deal
      startPos.current = { x: e.clientX, y: e.clientY }

      // Long-press timer for touch devices: if the finger stays still for
      // LONG_PRESS_MS, activate drag immediately (before threshold check).
      longPressTimer.current = setTimeout(() => {
        if (isTracking.current && !isDragging.current && dragDeal.current) {
          activateDrag(dragDeal.current, startPos.current!.x, startPos.current!.y)
        }
      }, LONG_PRESS_MS)
    },
    [activateDrag],
  )

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="relative w-full max-w-full min-w-0 rounded-lg bg-background border p-4 shadow-sm group">
      {/* ── Left gradient scroll indicator ── */}
      <div
        ref={leftGradientRef}
        className="absolute left-0 top-0 bottom-0 w-14 bg-gradient-to-r from-background via-background/80 to-transparent z-10 pointer-events-none rounded-l-lg transition-opacity duration-300"
        style={{ opacity: 0 }}
      />
      {/* ── Right gradient scroll indicator ── */}
      <div
        ref={rightGradientRef}
        className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-background via-background/80 to-transparent z-10 pointer-events-none rounded-r-lg transition-opacity duration-300"
        style={{ opacity: 0 }}
      />

      {/* ── Horizontal scroll container ── */}
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex gap-4 overflow-x-auto overflow-y-hidden pb-4 items-start w-full max-w-full min-w-0 snap-x scroll-smooth custom-scrollbar"
      >
        {STAGES.map((stage) => {
          const stageId = stage.id as StageId
          const columnDeals = localDeals.filter((d) => d.stage === stageId)

          return (
            <div
              key={stageId}
              ref={(el) => {
                columnRefs.current[stageId] = el
              }}
              className="w-[280px] flex-shrink-0 flex flex-col gap-3 rounded-lg transition-colors duration-150"
            >
              {/* Column header */}
              <div className="flex items-center justify-between font-semibold text-sm px-1 pt-1">
                <span className="text-muted-foreground uppercase tracking-wider text-xs">
                  {stage.label} ({columnDeals.length})
                </span>
                <span className="text-muted-foreground text-xs font-medium">
                  {formatCurrency(
                    columnDeals.reduce((sum, d) => sum + Number(d.value), 0),
                  )}
                </span>
              </div>

              {/* Cards */}
              <div className="flex flex-col gap-3 min-h-[60px]">
                {columnDeals.map((deal) => {
                  const canEdit =
                    currentUser.role !== "member" ||
                    deal.owner_id === currentUser.id

                  return (
                    <div
                      key={deal.id}
                      data-deal-id={deal.id}
                      onPointerDown={(e) => onCardPointerDown(e, deal, canEdit)}
                      className={[
                        canEdit
                          ? "cursor-grab active:cursor-grabbing"
                          : "cursor-default",
                        "select-none transition-opacity duration-150 touch-none",
                      ].join(" ")}
                    >
                      <Card className="shadow-sm hover:shadow transition-shadow">
                        <CardHeader className="p-3 pb-2 flex flex-row items-start justify-between space-y-0">
                          <div className="font-medium text-sm truncate pr-2">
                            {deal.name}
                          </div>
                          {/* Three-dot menu — stopPropagation prevents drag from starting on menu clicks */}
                          {canEdit && (
                            <div
                              onPointerDown={(e) => e.stopPropagation()}
                              draggable={false}
                            >
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    className="h-6 w-6 p-0 shrink-0 -mr-2 -mt-1"
                                  >
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>
                                    Change Stage
                                  </DropdownMenuLabel>
                                  {STAGES.filter((s) => s.id !== deal.stage).map(
                                    (s) => (
                                      <DropdownMenuItem
                                        key={s.id}
                                        onClick={() =>
                                          handleStageUpdate(
                                            deal.id,
                                            s.id as StageId,
                                          )
                                        }
                                      >
                                        Move to {s.label}
                                      </DropdownMenuItem>
                                    ),
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => onEdit(deal)}>
                                    Edit Deal
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          )}
                        </CardHeader>
                        <CardContent className="p-3 pt-0 flex flex-col gap-2 text-xs">
                          <div className="text-muted-foreground truncate">
                            {deal.clients?.name || (
                              <span className="italic">No Client</span>
                            )}
                            {deal.clients?.company &&
                              ` \u2022 ${deal.clients.company}`}
                          </div>

                          <div className="flex items-center justify-between mt-2">
                            <span className="font-semibold text-foreground">
                              {formatCurrency(deal.value)}
                            </span>
                            {deal.expected_close_date && (
                              <span className="text-muted-foreground">
                                {format(
                                  new Date(deal.expected_close_date),
                                  "MMM d, yy",
                                )}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between mt-1 pt-2 border-t">
                            <div className="flex items-center gap-1.5">
                              <Avatar className="h-5 w-5 border">
                                <AvatarImage
                                  src={deal.profiles?.avatar_url || ""}
                                />
                                <AvatarFallback className="text-[9px]">
                                  {deal.profiles?.full_name
                                    ?.charAt(0)
                                    .toUpperCase() ||
                                    deal.profiles?.email
                                      .charAt(0)
                                      .toUpperCase() ||
                                    "?"}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-muted-foreground truncate max-w-[120px]">
                                {deal.profiles?.full_name ||
                                  deal.profiles?.email ||
                                  "Unassigned"}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )
                })}

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

      {/* ── Drag overlay (portal to body to escape overflow containers) ── */}
      {mounted &&
        showOverlay &&
        createPortal(
          <div
            ref={overlayRef}
            className="pointer-events-none fixed z-[9999] w-[280px]"
            style={{ left: -9999, top: -9999 }}
          >
            <Card className="shadow-xl ring-2 ring-primary/30 border-primary/20 bg-background/95 backdrop-blur-sm">
              <CardHeader className="p-3 pb-1 flex flex-row items-start justify-between space-y-0">
                <div className="font-medium text-sm truncate pr-2">
                  {dragDeal.current?.name}
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0 flex flex-col gap-1 text-xs">
                <div className="text-muted-foreground truncate">
                  {dragDeal.current?.clients?.name || "No Client"}
                </div>
                <div className="font-semibold text-foreground">
                  {dragDeal.current
                    ? formatCurrency(dragDeal.current.value)
                    : ""}
                </div>
                <span
                  ref={overlayTargetRef}
                  className="text-primary font-medium text-xs mt-0.5 min-h-[14px]"
                />
              </CardContent>
            </Card>
          </div>,
          document.body,
        )}
    </div>
  )
}
