'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Question } from '@phosphor-icons/react'
import { useFloatingPosition } from '@/lib/use-floating-position'

interface Props {
  children: React.ReactNode
  width?: number
}

export default function InfoTooltip({ children, width = 280 }: Props) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const anchorRef = useRef<HTMLButtonElement | null>(null)
  const panelRef = useRef<HTMLSpanElement | null>(null)

  const { coords, side } = useFloatingPosition(open, anchorRef, panelRef, {
    preferredSide: 'bottom',
    align: 'start',
    gap: 6,
    estimateWidth: width,
    estimateHeight: 80,
  })

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!open) return
    function onOutside(e: MouseEvent) {
      const t = e.target as Node
      if (anchorRef.current?.contains(t) || panelRef.current?.contains(t)) return
      setOpen(false)
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onOutside)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open])

  const panel =
    mounted && open ? (
      <span
        ref={panelRef}
        role="tooltip"
        data-side={side}
        className="fd-tooltip fixed z-dropdown text-xs leading-relaxed px-3 py-2.5 rounded-lg font-normal"
        style={{
          top: coords.top,
          left: coords.left,
          width,
          maxWidth: 'calc(100vw - 32px)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </span>
    ) : null

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-label="Help"
        aria-expanded={open}
        className="bg-transparent border-none p-0 ml-1 cursor-pointer inline-flex items-center transition-colors text-text-secondary hover:text-brand-primary"
      >
        <Question weight="regular" size={13} />
      </button>
      {panel ? createPortal(panel, document.body) : null}
    </>
  )
}
