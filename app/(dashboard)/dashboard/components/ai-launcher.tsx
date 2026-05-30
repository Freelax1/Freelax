'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Sparkle, X, Receipt, PenNib, ChatDots, ChartBar, ArrowRight } from '@phosphor-icons/react'
import { IconButton } from '@/components/ui/icon-button'
import { cn } from '@/lib/utils'
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
      <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-border-subtle">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkle weight="regular" className="w-4 h-4 shrink-0 text-brand-primary" />
          <p className="text-sm font-medium text-text-primary truncate">AI features in Freelax</p>
          <span className="text-caption text-text-secondary bg-surface-sunken px-2 py-0.5 rounded-lg font-medium shrink-0">
            {FEATURES.length} tools
          </span>
        </div>
        <IconButton
          label="Dismiss"
          onClick={dismiss}
          className="shrink-0 text-text-muted hover:text-text-secondary"
          icon={<X weight="regular" className="w-4 h-4" />}
        />
      </div>

      <ul className="flex flex-col divide-y divide-border-subtle">
        {FEATURES.map(f => (
          <li key={f.id}>
            <Link
              href={f.href}
              className={cn(
                'flex items-center gap-3 px-5 py-3.5 no-underline transition-colors',
                'hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-primary/40',
              )}
            >
              <div className="w-10 h-10 rounded-lg bg-forest-50 flex items-center justify-center shrink-0">
                <f.icon weight="regular" className="w-[18px] h-[18px] text-brand-primary" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-primary leading-snug">{f.title}</p>
                <p className="text-xs text-text-secondary mt-0.5 leading-relaxed line-clamp-2">{f.desc}</p>
              </div>

              <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-primary shrink-0 whitespace-nowrap">
                {f.cta}
                <ArrowRight weight="regular" className="w-3.5 h-3.5" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
