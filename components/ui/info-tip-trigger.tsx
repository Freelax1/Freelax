'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useFloatingPosition } from '@/lib/use-floating-position'
import { cn } from '@/lib/utils'

const POPOVER_WIDTH = 264

export type InfoTipTriggerProps = {
  label: string
  children: ReactNode
  panelWidth?: number
  estimateHeight?: number
}

/** Small “i” control that opens a positioned tooltip panel (portal). */
export function InfoTipTrigger({
  label,
  children,
  panelWidth = POPOVER_WIDTH,
  estimateHeight = 280,
}: InfoTipTriggerProps) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const { coords, side } = useFloatingPosition(open, triggerRef, panelRef, {
    preferredSide: 'top',
    align: 'end',
    gap: 10,
    estimateWidth: panelWidth,
    estimateHeight,
  })

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      const t = e.target as Node
      if (triggerRef.current?.contains(t) || panelRef.current?.contains(t)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const panel = open && mounted ? (
    <div
      ref={panelRef}
      role="tooltip"
      className={cn(
        'fixed bg-surface-card border border-border-default rounded-[var(--radius-lg)] px-4 py-4 z-dropdown shadow-popover',
        side === 'top' ? 'origin-bottom right' : 'origin-top right',
      )}
      style={{ top: coords.top, left: coords.left, width: panelWidth }}
      onMouseEnter={() => setOpen(true)}
    >
      {children}
    </div>
  ) : null

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        onMouseEnter={() => setOpen(true)}
        className={cn(
          'w-[18px] h-[18px] rounded-full text-[10px] font-semibold cursor-pointer flex items-center justify-center shrink-0 leading-none p-0 transition-all duration-fast border-[1.5px]',
          open
            ? 'border-border-focus bg-forest-50 text-brand-primary'
            : 'border-border-default bg-transparent text-text-secondary',
        )}
      >
        i
      </button>
      {mounted && panel ? createPortal(panel, document.body) : null}
    </>
  )
}
