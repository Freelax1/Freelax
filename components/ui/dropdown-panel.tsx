'use client'

import { cva, type VariantProps } from 'class-variance-authority'
import Link from 'next/link'
import {
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ComponentProps,
  type ReactNode,
  type RefObject,
} from 'react'
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

const dropdownMenuItemVariants = cva(
  [
    'flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-left',
    'border-0 bg-transparent cursor-pointer font-[inherit] transition-colors duration-fast',
  ],
  {
    variants: {
      variant: {
        default: 'text-text-primary hover:bg-surface-sunken',
        danger: 'text-danger-600 hover:bg-danger-50',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

const dropdownMenuLinkVariants = cva(
  [
    'flex w-full items-center gap-2.5 px-3.5 py-2 text-sm no-underline',
    'transition-colors duration-fast',
  ],
  {
    variants: {
      variant: {
        default: 'text-text-primary hover:bg-surface-sunken',
        danger: 'text-danger-600 hover:bg-danger-50',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

/** Standard row inside DropdownPanel — icon + label */
export function DropdownMenuItem({
  className,
  variant,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof dropdownMenuItemVariants>) {
  return (
    <button
      type="button"
      className={cn(dropdownMenuItemVariants({ variant }), className)}
      {...props}
    >
      {children}
    </button>
  )
}

/** Next.js link row inside DropdownPanel */
export function DropdownMenuLink({
  className,
  variant,
  children,
  ...props
}: ComponentProps<typeof Link> & VariantProps<typeof dropdownMenuLinkVariants>) {
  return (
    <Link
      className={cn(dropdownMenuLinkVariants({ variant }), className)}
      {...props}
    >
      {children}
    </Link>
  )
}

/** Section label inside a dropdown (e.g. "Change status") */
export function DropdownMenuLabel({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <p
      className={cn(
        'text-micro font-semibold text-text-secondary px-3.5 pt-1.5 pb-1 text-left m-0',
        className,
      )}
    >
      {children}
    </p>
  )
}

export function DropdownMenuSeparator({ className }: { className?: string }) {
  return <div className={cn('border-t border-border-subtle my-1', className)} role="separator" />
}
