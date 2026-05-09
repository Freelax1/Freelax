'use client'

import { Toggle } from './shared'

export default function NotificationsTab() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
      <p className="text-sm text-slate-500">Email reminders sent to your account email.</p>
      {[
        { label: 'Invoices overdue',          desc: 'After 7 days past due date' },
        { label: 'VAT threshold approaching', desc: 'When rolling income nears £90,000' },
        { label: 'Self Assessment deadline',  desc: '31 January reminder' },
        { label: 'Tax year end',              desc: '5 April reminder' },
      ].map(n => (
        <div key={n.label} className="flex items-start justify-between py-3 border-b border-slate-50 last:border-0">
          <div>
            <p className="text-sm font-medium text-slate-700">{n.label}</p>
            <p className="text-xs text-slate-400">{n.desc}</p>
          </div>
          <Toggle checked={false} onChange={() => {}} />
        </div>
      ))}
    </div>
  )
}
