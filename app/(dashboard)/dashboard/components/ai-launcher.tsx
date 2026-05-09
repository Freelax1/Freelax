'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, X } from 'lucide-react'

const DISMISS_KEY = 'freelax_ai_launcher_dismissed'

const FEATURES = [
  {
    id:    'receipt',
    icon:  '📄',
    title: 'Scan a receipt',
    desc:  'Photo to logged expense in seconds',
    href:  '/expenses/new',
    cta:   'Try it',
  },
  {
    id:    'invoice',
    icon:  '✍️',
    title: 'Invoice assistant',
    desc:  'Describe your work — we build the line items',
    href:  '/invoices/new',
    cta:   'Try it',
  },
  {
    id:    'tax',
    icon:  '💬',
    title: 'Tax Q&A',
    desc:  'Ask anything about UK tax, IR35, or VAT',
    href:  '/tax',
    cta:   'Ask now',
  },
  {
    id:    'summary',
    icon:  '📊',
    title: 'SA narrative',
    desc:  'Plain-English Self Assessment summary',
    href:  '/tax',
    cta:   'View',
  },
] as const

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
    <div className="bg-white rounded-xl border border-purple-100 overflow-hidden mb-6">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-purple-50 bg-gradient-to-r from-purple-50 to-white">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-500" />
          <p className="text-sm font-semibold text-slate-800">AI features in Freelax</p>
          <span className="text-xs text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full font-medium">4 tools</span>
        </div>
        <button
          onClick={dismiss}
          className="text-slate-300 hover:text-slate-500 transition-colors p-1 rounded"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Feature tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-slate-100">
        {FEATURES.map(f => (
          <button
            key={f.id}
            onClick={() => router.push(f.href)}
            className="text-left p-4 hover:bg-slate-50 transition-colors group"
          >
            <span className="text-xl mb-2 block">{f.icon}</span>
            <p className="text-xs font-semibold text-slate-800 mb-0.5 group-hover:text-purple-700 transition-colors">
              {f.title}
            </p>
            <p className="text-xs text-slate-400 leading-relaxed mb-2">{f.desc}</p>
            <span className="text-xs font-medium text-purple-600 group-hover:text-purple-700">
              {f.cta} →
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
