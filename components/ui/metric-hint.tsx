'use client'

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { useFloatingPosition } from '@/lib/use-floating-position'

/** Hover/focus tooltip for summary metrics (ListMetrics, StatCard labels, etc.) */
export function MetricWithTooltip({
  tooltip,
  children,
  side = 'top',
}: {
  tooltip: string
  children: ReactNode
  /** Prefer above the trigger so stat-card values stay visible */
  side?: 'top' | 'bottom'
}) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const id = useId()
  const anchorRef = useRef<HTMLDivElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)

  const { coords, side: placedSide } = useFloatingPosition(open, anchorRef, panelRef, {
    preferredSide: side,
    align: 'start',
    gap: 6,
    estimateWidth: 256,
    estimateHeight: 40,
  })

  useEffect(() => setMounted(true), [])

  const panel =
    mounted && open ? (
      <div
        ref={panelRef}
        id={id}
        role="tooltip"
        data-side={placedSide}
        className="fd-tooltip fixed z-dropdown max-w-[16rem] text-xs leading-relaxed px-3 py-2 rounded-lg pointer-events-none"
        style={{ top: coords.top, left: coords.left }}
      >
        {tooltip}
      </div>
    ) : null

  return (
    <div
      ref={anchorRef}
      className={cn('relative', open && 'z-10')}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <div
        tabIndex={0}
        className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30"
        aria-describedby={open ? id : undefined}
      >
        {children}
      </div>
      {panel ? createPortal(panel, document.body) : null}
    </div>
  )
}
