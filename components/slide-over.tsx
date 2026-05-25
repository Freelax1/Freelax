'use client'

import { useEffect, useState } from 'react'
import { X } from '@phosphor-icons/react'

interface SlideOverProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
  width?: 'md' | 'lg'
}

export default function SlideOver({ open, onClose, title, children, footer, width = 'md' }: SlideOverProps) {
  const [availableHeight, setAvailableHeight] = useState(600)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    function measure() {
      setAvailableHeight(window.innerHeight)
      setIsMobile(window.innerWidth < 640)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  const panelWidth = width === 'lg' ? 640 : 440

  return (
    <div className="fixed inset-0 z-overlay">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
      />

      {isMobile ? (
        /* ── Mobile: bottom sheet ── */
        <div className="fixed bottom-0 left-0 right-0 bg-white flex flex-col shadow-sheet-bottom max-h-[92dvh] rounded-t-[16px]">
          {/* Drag handle */}
          <div className="flex justify-center pt-2.5 pb-0.5 shrink-0">
            <div className="w-9 h-1 rounded-full bg-border-default" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-2.5 pb-3.5 shrink-0 border-b border-b-border-subtle">
            <h2 className="text-base font-semibold m-0 text-text-primary">{title}</h2>
            <button
              onClick={onClose}
              aria-label="Close"
              className="p-1.5 rounded-lg border-none cursor-pointer flex items-center justify-center bg-surface-sunken text-text-secondary"
            >
              <X weight="regular" size={18} />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto p-5 min-h-0">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="shrink-0 bg-surface-card border-t border-t-border-subtle" style={{ padding: `12px 20px max(env(safe-area-inset-bottom), 16px)` }}>
              {footer}
            </div>
          )}
        </div>
      ) : (
        /* ── Desktop: right-side panel ── */
        <div
          className="fixed top-0 right-0 bg-surface-card flex flex-col"
          style={{
            height: availableHeight,
            width: panelWidth,
            borderRadius: '16px 0 0 16px',
            boxShadow: '-8px 0 32px rgba(0,0,0,0.14), -1px 0 0 rgba(0,0,0,0.06)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 shrink-0 border-b border-b-border-subtle">
            <h2 className="text-base font-semibold m-0 text-text-primary">{title}</h2>
            <button
              onClick={onClose}
              aria-label="Close"
              className="p-1.5 rounded-lg border-none bg-transparent cursor-pointer flex items-center justify-center text-text-secondary hover:bg-surface-sunken transition-colors"
            >
              <X weight="regular" size={16} />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="shrink-0 px-6 pt-3 pb-5 bg-surface-card border-t border-t-border-subtle">
              {footer}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
