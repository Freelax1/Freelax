'use client'

import { useEffect, useState } from 'react'
import { _registerToastListener, type ToastItem } from '@/lib/toast'
import { cn } from '@/lib/utils'

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
    <div className="fixed top-[72px] right-5 z-[9999] flex flex-col gap-2 max-w-[360px] w-[calc(100vw-40px)] pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={cn(
            'flex items-center gap-2.5 px-3.5 py-3 rounded-lg text-sm font-medium pointer-events-auto shadow-[0_4px_16px_rgba(0,0,0,0.12)] animate-toast-in',
            t.type === 'success' ? 'bg-success-50 text-success-700 border border-success-200'
            : t.type === 'error'  ? 'bg-danger-50 text-danger-800 border border-danger-200'
            : 'bg-surface-sunken text-text-secondary border border-border-subtle'
          )}
        >
          {t.type === 'success' && (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
              <path d="M3 8l4 4 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
          {t.type === 'error' && (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M8 5v3M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          )}
          {t.type === 'info' && (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M8 7v4M8 5.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          )}

          <span className="flex-1">{t.message}</span>

          {t.action && (
            <button
              onClick={t.action.onClick}
              className="shrink-0 px-2 py-1 rounded-md text-xs font-semibold cursor-pointer text-[inherit] font-[inherit] bg-black/[0.08] border border-black/10"
            >
              {t.action.label}
            </button>
          )}
        </div>
      ))}

    </div>
  )
}
