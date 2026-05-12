'use client'

import { useState, useRef, useEffect } from 'react'
import { HelpCircle } from 'lucide-react'

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
    <span ref={ref} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-label="More information"
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          marginLeft: 4,
          cursor: 'pointer',
          color: '#475569',
          display: 'inline-flex',
          alignItems: 'center',
          transition: 'color 150ms',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = '#1D6B35')}
        onMouseLeave={e => (e.currentTarget.style.color = '#94A3B8')}
      >
        <HelpCircle size={13} strokeWidth={2} />
      </button>

      {open && (
        <span
          role="tooltip"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 50,
            width,
            maxWidth: 'calc(100vw - 32px)',
            background: '#0F172A',
            color: '#FFFFFF',
            fontSize: 12,
            lineHeight: 1.6,
            padding: '10px 12px',
            borderRadius: 8,
            boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
            fontWeight: 400,
            textTransform: 'none',
            letterSpacing: 0,
          }}
          onClick={e => e.stopPropagation()}
        >
          {children}
        </span>
      )}
    </span>
  )
}
