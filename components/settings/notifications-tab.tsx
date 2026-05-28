'use client'

import { Toggle } from './shared'

export default function NotificationsTab() {
  return (
    <div className="space-y-5">
      <p className="text-sm text-text-muted">Email reminders sent to your account email.</p>
      {[
        { label: 'Invoices overdue',          desc: 'After 7 days past due date' },
        { label: 'VAT threshold approaching', desc: 'When rolling income nears £90,000' },
        { label: 'Self Assessment deadline',  desc: '31 January reminder' },
        { label: 'Tax year end',              desc: '5 April reminder' },
      ].map(n => (
        <div key={n.label} className="flex items-start justify-between py-3 border-b border-border-subtle last:border-0">
          <div>
            <p className="text-sm font-medium text-text-secondary">{n.label}</p>
            <p className="text-xs text-text-secondary">{n.desc}</p>
          </div>
          <Toggle checked={false} onChange={() => {}} />
        </div>
      ))}
    </div>
  )
}
