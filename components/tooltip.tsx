'use client'

// components/tooltip.tsx
// Lightweight hover tooltip for icon-only interactive elements.
// Wraps any single child and shows a label above it on hover/focus.
// Also injects aria-label onto the child so screen readers get an
// accessible name without requiring it on every call-site.

import { useState, useId, cloneElement, isValidElement } from 'react'
import type { FocusEvent, MouseEvent, ReactElement } from 'react'

interface TooltipProps {
  /** Text shown in the tooltip and injected as aria-label on the child */
  label: string
  /** Single interactive child element (button, a, etc.) */
  children: ReactElement<TriggerProps & Record<string, unknown>>
  /** Horizontal alignment of the tooltip relative to the trigger */
  align?: 'center' | 'left' | 'right'
}

type TriggerProps = {
  onMouseEnter?: (e: MouseEvent) => void
  onMouseLeave?: (e: MouseEvent) => void
  onFocus?: (e: FocusEvent) => void
  onBlur?: (e: FocusEvent) => void
}

export default function Tooltip({ label, children, align = 'center' }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const id = useId()

  const alignClass =
    align === 'left'  ? 'left-0'  :
    align === 'right' ? 'right-0' :
    'left-1/2 -translate-x-1/2'

  const childProps = (isValidElement(children) ? children.props : {}) as TriggerProps

  const trigger = isValidElement(children)
    ? cloneElement(children, {
        'aria-label':       label,
        'aria-describedby': visible ? id : undefined,
        onMouseEnter: (e: MouseEvent) => {
          setVisible(true)
          childProps.onMouseEnter?.(e)
        },
        onMouseLeave: (e: MouseEvent) => {
          setVisible(false)
          childProps.onMouseLeave?.(e)
        },
        onFocus: (e: FocusEvent) => {
          setVisible(true)
          childProps.onFocus?.(e)
        },
        onBlur: (e: FocusEvent) => {
          setVisible(false)
          childProps.onBlur?.(e)
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
          className={`pointer-events-none absolute bottom-[calc(100%+6px)] ${alignClass} z-toast whitespace-nowrap rounded-lg border border-border-default bg-surface-card px-2.5 py-1.5 text-xs font-medium text-text-primary shadow-tooltip`}
        >
          {label}
        </span>
      )}
    </span>
  )
}
