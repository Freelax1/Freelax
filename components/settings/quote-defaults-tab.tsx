'use client'

import { useState } from 'react'
import { Field, inputClass, btnClass } from './shared'

interface Props {
  profile: any
  save: (data: Record<string, any>) => Promise<void>
  saving: boolean
}

export default function QuoteDefaultsTab({ profile, save, saving }: Props) {
  const [qd, setQd] = useState({
    quote_validity_days:  profile?.quote_validity_days  ?? 30,
    quote_default_notes:  profile?.quote_default_notes  ?? '',
    quote_email_subject:  profile?.quote_email_subject  ?? 'Quote {{quote_number}} from {{business_name}}',
    quote_email_body:     profile?.quote_email_body     ?? '',
  })

  return (
    <div className="space-y-4">

      {/* Quote defaults */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
        <div>
          <h2 className="font-semibold text-slate-900">Quote defaults</h2>
          <p className="text-sm text-slate-500 mt-1">Pre-filled on every new quote you create.</p>
        </div>
        <Field label="Default validity period (days)" hint="How many days a quote stays open. 30 days is standard.">
          <input
            type="number" min="1" max="365"
            className={inputClass}
            value={qd.quote_validity_days}
            onChange={e => setQd(p => ({ ...p, quote_validity_days: parseInt(e.target.value) || 30 }))}
          />
        </Field>
        <Field label="Default notes" hint="Appears at the bottom of every quote. Can be overridden per quote.">
          <textarea
            rows={3}
            className={inputClass}
            value={qd.quote_default_notes}
            onChange={e => setQd(p => ({ ...p, quote_default_notes: e.target.value }))}
            placeholder="e.g. All prices exclude VAT. Subject to our standard terms and conditions."
          />
        </Field>
        <button className={btnClass} disabled={saving} onClick={() => save({
          quote_validity_days: qd.quote_validity_days,
          quote_default_notes: qd.quote_default_notes,
        })}>
          {saving ? 'Saving...' : 'Save quote defaults'}
        </button>
      </div>

      {/* Email message */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <div>
          <h2 className="font-semibold text-slate-900">Quote email message</h2>
          <p className="text-sm text-slate-500 mt-1">
            Add a personal message to include in the email when you send a quote.
            The quote number, amount, expiry date and a link to view the quote are added automatically.
          </p>
        </div>
        <Field label="Personal message">
          <textarea
            rows={5}
            className={inputClass}
            value={qd.quote_email_body}
            onChange={e => setQd(p => ({ ...p, quote_email_body: e.target.value }))}
            placeholder="e.g. Thank you for the opportunity. Please find your quote attached. Feel free to get in touch if you have any questions."
          />
        </Field>
        <button className={btnClass} disabled={saving} onClick={() => save({
          quote_email_body: qd.quote_email_body,
        })}>
          {saving ? 'Saving...' : 'Save message'}
        </button>
      </div>
    </div>
  )
}
