'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

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
      setAvailableHeight(window.innerHeight - 48)
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
    <div style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(2px)' }}
      />

      {isMobile ? (
        /* ── Mobile: bottom sheet ── */
        <div style={{
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
          maxHeight: '92dvh',
          background: '#fff',
          borderRadius: '16px 16px 0 0',
          boxShadow: '0 -4px 32px rgba(0,0,0,0.15)',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Drag handle */}
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, paddingBottom: 2, flexShrink: 0 }}>
            <div style={{ width: 36, height: 4, background: '#E2E8F0', borderRadius: 99 }} />
          </div>

          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 20px 14px',
            borderBottom: '1px solid #E8E8E8',
            flexShrink: 0,
          }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#0F172A', margin: 0 }}>{title}</h2>
            <button
              onClick={onClose}
              style={{
                padding: 6, borderRadius: 8, border: 'none',
                background: '#F1F5F9', cursor: 'pointer', color: '#64748B',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Scrollable body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px', minHeight: 0 }}>
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div style={{
              flexShrink: 0,
              padding: `12px 20px max(env(safe-area-inset-bottom), 16px)`,
              borderTop: '1px solid #F1F5F9',
              background: '#fff',
            }}>
              {footer}
            </div>
          )}
        </div>
      ) : (
        /* ── Desktop: right-side panel ── */
        <div style={{
          position: 'fixed',
          top: 48, right: 0,
          height: availableHeight,
          width: panelWidth,
          background: '#fff',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 24px',
            borderBottom: '1px solid #E8E8E8',
            flexShrink: 0,
          }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#0F172A', margin: 0 }}>{title}</h2>
            <button
              onClick={onClose}
              style={{
                padding: 6, borderRadius: 8, border: 'none', background: 'none',
                cursor: 'pointer', color: '#64748B',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F1F5F9')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <X size={18} />
            </button>
          </div>

          {/* Scrollable body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', minHeight: 0 }}>
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div style={{
              flexShrink: 0,
              padding: '12px 24px 16px',
              borderTop: '1px solid #F1F5F9',
              background: '#fff',
            }}>
              {footer}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
