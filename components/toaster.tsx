'use client'

import { useEffect, useState } from 'react'
import { _registerToastListener, type ToastItem } from '@/lib/toast'

const AUTO_DISMISS_MS = 5000

export default function Toaster() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    _registerToastListener(item => {
      setToasts(prev => [...prev, item])
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== item.id))
      }, AUTO_DISMISS_MS)
    })
    return () => _registerToastListener(null)
  }, [])

  if (toasts.length === 0) return null

  return (
    <div
      style={{
        position:      'fixed',
        top:           72,
        right:         20,
        zIndex:        9999,
        display:       'flex',
        flexDirection: 'column',
        gap:           8,
        maxWidth:      360,
        width:         'calc(100vw - 40px)',
        pointerEvents: 'none',
      }}
    >
      {toasts.map(t => (
        <div
          key={t.id}
          style={{
            display:       'flex',
            alignItems:    'center',
            gap:           10,
            padding:       '12px 14px',
            borderRadius:  10,
            fontSize:      13,
            fontWeight:    500,
            fontFamily:    "'Plus Jakarta Sans', sans-serif",
            boxShadow:     '0 4px 16px rgba(0,0,0,0.12)',
            pointerEvents: 'auto',
            animation:     'fd-toast-in 200ms cubic-bezier(0.22,1,0.36,1)',
            ...(t.type === 'success' ? {
              background: '#F0FDF4',
              color:      '#166534',
              border:     '1px solid #BBF7D0',
            } : t.type === 'error' ? {
              background: '#FEF2F2',
              color:      '#991B1B',
              border:     '1px solid #FECACA',
            } : {
              background: '#F8FAFC',
              color:      '#475569',
              border:     '1px solid #E2E8F0',
            }),
          }}
        >
          {t.type === 'success' && (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
              <path d="M3 8l4 4 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
          {t.type === 'error' && (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M8 5v3M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          )}
          {t.type === 'info' && (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M8 7v4M8 5.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          )}

          <span style={{ flex: 1 }}>{t.message}</span>

          {t.action && (
            <button
              onClick={t.action.onClick}
              style={{
                flexShrink:    0,
                padding:       '3px 9px',
                borderRadius:  6,
                fontSize:      12,
                fontWeight:    600,
                cursor:        'pointer',
                background:    'rgba(0,0,0,0.08)',
                border:        '1px solid rgba(0,0,0,0.10)',
                color:         'inherit',
                fontFamily:    'inherit',
              }}
            >
              {t.action.label}
            </button>
          )}
        </div>
      ))}

      <style>{`
        @keyframes fd-toast-in {
          from { opacity: 0; transform: translateX(12px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}
