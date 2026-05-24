'use client'

import { useState, useRef, useEffect } from 'react'
import { Question } from '@phosphor-icons/react'

interface Props {
  children: React.ReactNode
  width?: number
}

export default function InfoTooltip({ children, width = 280 }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open) return
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
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

  return (
    <span ref={ref} className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-label="More information"
        className="bg-transparent border-none p-0 ml-1 cursor-pointer inline-flex items-center transition-colors text-text-secondary hover:text-brand-primary"
      >
        <Question weight="regular" size={13} />
      </button>

      {open && (
        <span
          role="tooltip"
          className="absolute top-[calc(100%+6px)] left-0 z-dropdown text-text-secondary text-xs leading-relaxed px-3 py-2.5 rounded-lg font-normal bg-surface-card border border-border-default shadow-tooltip"
          style={{ width, maxWidth: 'calc(100vw - 32px)' }}
          onClick={e => e.stopPropagation()}
        >
          {children}
        </span>
      )}
    </span>
  )
}
