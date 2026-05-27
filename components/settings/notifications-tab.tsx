'use client'

import { useState } from 'react'
import { Toggle } from './shared'
import type { User } from '@/types/database'

const PREFS = [
  { key: 'notify_invoices_overdue' as const, label: 'Invoices overdue', desc: 'After 7 days past due date' },
  { key: 'notify_vat_threshold' as const, label: 'VAT threshold approaching', desc: 'When rolling income nears £90,000' },
  { key: 'notify_sa_deadline' as const, label: 'Self Assessment deadline', desc: '31 January reminder' },
  { key: 'notify_tax_year_end' as const, label: 'Tax year end', desc: '5 April reminder' },
]

interface Props {
  profile: User
  save: (data: Record<string, unknown>) => Promise<void>
  saving: boolean
}

export default function NotificationsTab({ profile, save, saving }: Props) {
  const [prefs, setPrefs] = useState({
    notify_invoices_overdue: profile.notify_invoices_overdue ?? true,
    notify_vat_threshold: profile.notify_vat_threshold ?? true,
    notify_sa_deadline: profile.notify_sa_deadline ?? true,
    notify_tax_year_end: profile.notify_tax_year_end ?? true,
  })

  async function toggle(key: keyof typeof prefs, value: boolean) {
    const next = { ...prefs, [key]: value }
    setPrefs(next)
    await save({ [key]: value })
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-text-muted">
        Email reminders sent to your account email once per day when enabled (requires Resend on the server).
      </p>
      {PREFS.map(n => (
        <div key={n.key} className="flex items-start justify-between py-3 border-b border-border-subtle last:border-0">
          <div>
            <p className="text-sm font-medium text-text-secondary">{n.label}</p>
            <p className="text-xs text-text-secondary">{n.desc}</p>
          </div>
          <Toggle
            checked={prefs[n.key]}
            onChange={v => toggle(n.key, v)}
            label={undefined}
          />
        </div>
      ))}
      {saving && <p className="text-xs text-text-muted">Saving…</p>}
    </div>
  )
}
