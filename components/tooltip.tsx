'use client'

// components/tooltip.tsx
// Lightweight hover tooltip for icon-only interactive elements.
// Wraps any single child and shows a label above it on hover/focus.
// Also injects aria-label onto the child so screen readers get an
// accessible name without requiring it on every call-site.

import { useState, useId, cloneElement, isValidElement } from 'react'
import type { ReactElement } from 'react'

interface TooltipProps {
  /** Text shown in the tooltip and injected as aria-label on the child */
  label: string
  /** Single interactive child element (button, a, etc.) */
  children: ReactElement
  /** Horizontal alignment of the tooltip relative to the trigger */
  align?: 'center' | 'left' | 'right'
}

export default function Tooltip({ label, children, align = 'center' }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const id = useId()

  const alignClass =
    align === 'left'  ? 'left-0'  :
    align === 'right' ? 'right-0' :
    'left-1/2 -translate-x-1/2'

  // Inject aria-label + aria-describedby onto the child
  const trigger = isValidElement(children)
    ? cloneElement(children as ReactElement<Record<string, unknown>>, {
        'aria-label':       label,
        'aria-describedby': visible ? id : undefined,
        onMouseEnter: (e: React.MouseEvent) => {
          setVisible(true)
          ;(children.props as Record<string, unknown>).onMouseEnter?.(e)
        },
        onMouseLeave: (e: React.MouseEvent) => {
          setVisible(false)
          ;(children.props as Record<string, unknown>).onMouseLeave?.(e)
        },
        onFocus: (e: React.FocusEvent) => {
          setVisible(true)
          ;(children.props as Record<string, unknown>).onFocus?.(e)
        },
        onBlur: (e: React.FocusEvent) => {
          setVisible(false)
          ;(children.props as Record<string, unknown>).onBlur?.(e)
        },
      })
    : children

  return (
    <span className="relative inline-flex items-center justify-center">
      {trigger}
      {visible && (
        <span
          id={id}
          role="tooltip"
          className={`pointer-events-none absolute bottom-[calc(100%+6px)] ${alignClass} z-toast whitespace-nowrap rounded-md bg-forest-950 px-2 py-1 text-xs font-medium text-white shadow-tooltip animate-tooltip-in`}
        >
          {label}
        </span>
      )}
    </span>
  )
}
