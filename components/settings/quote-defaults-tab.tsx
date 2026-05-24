'use client'

import { useState } from 'react'
import { Field, Input, Textarea, SaveSettingsButton } from './shared'

interface Props {
  profile: any
  save: (data: Record<string, any>) => Promise<void>
  saving: boolean
}

export default function QuoteDefaultsTab({ profile, save, saving }: Props) {
  const [qd, setQd] = useState({
    quote_prefix:         profile?.quote_prefix         ?? '',
    quote_validity_days:  profile?.quote_validity_days  ?? 30,
    quote_default_notes:  profile?.quote_default_notes  ?? '',
    quote_email_subject:  profile?.quote_email_subject  ?? '',
    quote_email_body:     profile?.quote_email_body     ?? '',
  })

  return (
    <div className="space-y-4">

      {/* Quote defaults */}
      <div className="space-y-5 pb-6 border-b border-border-subtle last:border-0 last:pb-0">
        <div>
          <p className="text-sm text-text-muted">Pre-filled on every new quote you create.</p>
        </div>
        <Field label="Default validity period (days)" hint="How many days a quote stays open. 30 days is standard.">
          <Input
            type="number"
            min="1"
            max="365"
            value={qd.quote_validity_days}
            onChange={e => setQd(p => ({ ...p, quote_validity_days: parseInt(e.target.value) || 30 }))}
          />
        </Field>
        <Field label="Quote prefix" hint="Prefix used for quote numbers. Default is QUO (e.g. QUO-0001).">
          <Input
            value={qd.quote_prefix}
            onChange={e => setQd(p => ({ ...p, quote_prefix: e.target.value }))}
            placeholder="QUO"
            maxLength={10}
          />
        </Field>
        <Field label="Default notes" hint="Appears at the bottom of every quote. Can be overridden per quote.">
          <Textarea
            rows={3}
            value={qd.quote_default_notes}
            onChange={e => setQd(p => ({ ...p, quote_default_notes: e.target.value }))}
            placeholder="e.g. All prices exclude VAT. Subject to our standard terms and conditions."
          />
        </Field>
        <SaveSettingsButton
          saving={saving}
          label="Save quote defaults"
          onClick={() => save({
            quote_prefix: qd.quote_prefix,
            quote_validity_days: qd.quote_validity_days,
            quote_default_notes: qd.quote_default_notes,
          })}
        />
      </div>

      {/* Email message */}
      <div className="space-y-5 pb-6 border-b border-border-subtle last:border-0 last:pb-0">
        <div>
          <h2 className="font-semibold text-text-primary">Quote email message</h2>
          <p className="text-sm text-text-muted mt-1">
            Add a personal message to include in the email when you send a quote.
            The quote number, amount, expiry date and a link to view the quote are added automatically.
          </p>
        </div>
        <Field label="Email subject">
          <Input
            value={qd.quote_email_subject}
            onChange={e => setQd(p => ({ ...p, quote_email_subject: e.target.value }))}
            placeholder="Quote {{quote_number}} from {{business_name}}"
          />
        </Field>
        <Field label="Personal message">
          <Textarea
            rows={5}
            value={qd.quote_email_body}
            onChange={e => setQd(p => ({ ...p, quote_email_body: e.target.value }))}
            placeholder="e.g. Thank you for the opportunity. Please find your quote attached. Feel free to get in touch if you have any questions."
          />
        </Field>
        <SaveSettingsButton
          saving={saving}
          label="Save message"
          onClick={() => save({
            quote_email_subject: qd.quote_email_subject,
            quote_email_body: qd.quote_email_body,
          })}
        />
      </div>
    </div>
  )
}
