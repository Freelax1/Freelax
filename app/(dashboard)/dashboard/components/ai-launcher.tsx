'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkle, X, Receipt, PenNib, ChatDots, ChartBar } from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'

const DISMISS_KEY = 'freelax_ai_launcher_dismissed'

const FEATURES: { id: string; icon: Icon; title: string; desc: string; href: string; cta: string }[] = [
  {
    id:    'receipt',
    icon:  Receipt,
    title: 'Scan a receipt',
    desc:  'Photo to logged expense in seconds',
    href:  '/expenses/new',
    cta:   'Try it',
  },
  {
    id:    'invoice',
    icon:  PenNib,
    title: 'Invoice assistant',
    desc:  'Describe your work — we build the line items',
    href:  '/invoices/new',
    cta:   'Try it',
  },
  {
    id:    'tax',
    icon:  ChatDots,
    title: 'Tax Q&A',
    desc:  'Ask anything about UK tax, IR35, or VAT',
    href:  '/tax',
    cta:   'Ask now',
  },
  {
    id:    'summary',
    icon:  ChartBar,
    title: 'SA narrative',
    desc:  'Plain-English Self Assessment summary',
    href:  '/tax',
    cta:   'View',
  },
]

export default function AiLauncher() {
  const [visible, setVisible] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const dismissed = localStorage.getItem(DISMISS_KEY)
    if (!dismissed) setVisible(true)
  }, [])

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="bg-surface-card rounded-xl border border-forest-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-forest-100 bg-gradient-to-r from-forest-50 to-surface-card">
        <div className="flex items-center gap-2">
          <Sparkle weight="regular" className="w-4 h-4 text-forest-500" />
          <p className="text-sm font-semibold text-text-primary">AI features in Freelax</p>
          <span className="text-xs text-forest-700 bg-forest-100 px-2 py-0.5 rounded-lg font-medium">4 tools</span>
        </div>
        <button
          onClick={dismiss}
          className="text-text-muted hover:text-text-secondary transition-colors p-1 rounded"
          title="Dismiss"
          aria-label="Dismiss AI features panel"
        >
          <X weight="regular" className="w-4 h-4" />
        </button>
      </div>

      {/* Feature tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border-subtle">
        {FEATURES.map(f => (
          <button
            key={f.id}
            onClick={() => router.push(f.href)}
            className="bg-surface-card text-left p-4 hover:bg-forest-50 transition-colors group"
          >
            <f.icon weight="regular" className="w-5 h-5 mb-2 text-forest-600" />
            <p className="text-xs font-semibold text-text-primary mb-0.5 group-hover:text-forest-700 transition-colors">
              {f.title}
            </p>
            <p className="text-xs text-text-secondary leading-relaxed mb-2">{f.desc}</p>
            <span className="text-xs font-medium text-forest-600 group-hover:text-forest-800">
              {f.cta} →
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
