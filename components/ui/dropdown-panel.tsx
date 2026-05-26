'use client'

import { useEffect, useRef, useState, type AnchorHTMLAttributes, type ButtonHTMLAttributes, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { useFloatingPosition } from '@/lib/use-floating-position'

interface DropdownPanelProps {
  children: ReactNode
  className?: string
  /** Element that opens the menu (usually the kebab trigger) */
  anchorRef: RefObject<HTMLElement | null>
  open: boolean
  onClose?: () => void
  align?: 'start' | 'end'
}

/** Anchored menu panel for kebab / row action menus — viewport-aware via portal */
export default function DropdownPanel({
  children,
  className,
  anchorRef,
  open,
  onClose,
  align = 'end',
}: DropdownPanelProps) {
  const [mounted, setMounted] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const { coords, side } = useFloatingPosition(open, anchorRef, panelRef, {
    preferredSide: 'bottom',
    align,
    gap: 4,
    estimateWidth: 180,
    estimateHeight: 160,
  })

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!open || !onClose) return
    function handleClick(e: MouseEvent) {
      const t = e.target as Node
      if (anchorRef.current?.contains(t) || panelRef.current?.contains(t)) return
      onClose?.()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open, onClose, anchorRef])

  if (!open || !mounted) return null

  return createPortal(
    <div
      ref={panelRef}
      data-side={side}
      style={{ top: coords.top, left: coords.left }}
      className={cn(
        'fixed z-dropdown min-w-[160px] overflow-hidden py-1',
        'bg-surface-card border border-border-default rounded-xl shadow-popover',
        className,
      )}
    >
      {children}
    </div>,
    document.body,
  )
}

/** Standard row inside DropdownPanel — icon + label */
export function DropdownMenuItem({
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { className?: string }) {
  return (
    <button
      type="button"
      className={cn(
        'flex w-full items-center gap-2 px-3.5 py-2 text-sm text-text-primary',
        'hover:bg-surface-sunken transition-colors duration-fast',
        'border-0 bg-transparent cursor-pointer text-left font-[inherit]',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

/** Link row inside DropdownPanel */
export function DropdownMenuLink({
  className,
  children,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { className?: string }) {
  return (
    <a
      className={cn(
        'flex w-full items-center gap-2 px-3.5 py-2 text-sm text-text-primary no-underline',
        'hover:bg-surface-sunken transition-colors duration-fast',
        className,
      )}
      {...props}
    >
      {children}
    </a>
  )
}
