'use client'

// components/tooltip.tsx
// Lightweight hover tooltip for icon-only interactive elements.
// Viewport-aware: flips above/below and clamps horizontally.

import {
  useState,
  useId,
  useRef,
  useEffect,
  cloneElement,
  isValidElement,
} from 'react'
import { createPortal } from 'react-dom'
import type { FocusEvent, MouseEvent, ReactElement } from 'react'
import { mergeRefs } from '@/lib/merge-refs'
import { useFloatingPosition } from '@/lib/use-floating-position'
import type { FloatingAlign } from '@/lib/floating-placement'

interface TooltipProps {
  /** Text shown in the tooltip and injected as aria-label on the child */
  label: string
  /** Single interactive child element (button, a, etc.) */
  children: ReactElement<TriggerProps & Record<string, unknown>>
  /** Horizontal alignment of the tooltip relative to the trigger */
  align?: 'center' | 'left' | 'right'
}

type TriggerProps = {
  ref?: (node: HTMLElement | null) => void
  onMouseEnter?: (e: MouseEvent) => void
  onMouseLeave?: (e: MouseEvent) => void
  onFocus?: (e: FocusEvent) => void
  onBlur?: (e: FocusEvent) => void
}

function toFloatingAlign(align: 'center' | 'left' | 'right'): FloatingAlign {
  if (align === 'left') return 'start'
  if (align === 'right') return 'end'
  return 'center'
}

export default function Tooltip({ label, children, align = 'center' }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const [mounted, setMounted] = useState(false)
  const id = useId()
  const anchorRef = useRef<HTMLElement | null>(null)
  const panelRef = useRef<HTMLSpanElement | null>(null)

  const { coords, side } = useFloatingPosition(visible, anchorRef, panelRef, {
    preferredSide: 'top',
    align: toFloatingAlign(align),
    gap: 6,
    estimateWidth: Math.min(280, label.length * 7 + 24),
    estimateHeight: 28,
  })

  useEffect(() => setMounted(true), [])

  const childProps = (isValidElement(children) ? children.props : {}) as TriggerProps

  const trigger = isValidElement(children)
    ? cloneElement(children, {
        'aria-label': label,
        'aria-describedby': visible ? id : undefined,
        ref: mergeRefs(anchorRef, childProps.ref),
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

  const tooltip =
    mounted && visible ? (
      <span
        ref={panelRef}
        id={id}
        role="tooltip"
        className="fd-tooltip pointer-events-none fixed z-toast whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium"
        style={{ top: coords.top, left: coords.left }}
        data-side={side}
      >
        {label}
      </span>
    ) : null

  return (
    <>
      <span className="inline-flex items-center justify-center">{trigger}</span>
      {tooltip ? createPortal(tooltip, document.body) : null}
    </>
  )
}
