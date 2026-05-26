'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkle, X, Receipt, PenNib, ChatDots, ChartBar } from '@phosphor-icons/react'
import { IconButton } from '@/components/ui/icon-button'
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
    title: 'Tax advisor',
    desc:  'Follow-up questions on your briefing',
    href:  '/tax',
    cta:   'Open',
  },
  {
    id:    'summary',
    icon:  ChartBar,
    title: 'Tax briefing',
    desc:  'Plain-English walkthrough of your tax year',
    href:  '/tax',
    cta:   'Read',
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
    <div className="bg-surface-card rounded-xl border border-border-default overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <Sparkle weight="regular" className="w-4 h-4 text-brand-primary" />
          <p className="text-sm font-medium text-text-primary">AI features in Freelax</p>
          <span className="text-caption text-text-secondary bg-surface-sunken px-2 py-0.5 rounded-lg font-medium">4 tools</span>
        </div>
        <IconButton
          label="Dismiss"
          onClick={dismiss}
          className="text-text-muted hover:text-text-secondary"
          icon={<X weight="regular" className="w-4 h-4" />}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border-subtle">
        {FEATURES.map(f => (
          <button
            key={f.id}
            onClick={() => router.push(f.href)}
            className="bg-surface-card text-left p-4 hover:bg-surface-sunken transition-colors group"
          >
            <f.icon weight="regular" className="w-5 h-5 mb-2 text-text-secondary group-hover:text-brand-primary transition-colors" />
            <p className="text-xs font-semibold text-text-primary mb-0.5">
              {f.title}
            </p>
            <p className="text-xs text-text-secondary leading-relaxed mb-2">{f.desc}</p>
            <span className="text-xs font-medium text-brand-primary">
              {f.cta} →
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
