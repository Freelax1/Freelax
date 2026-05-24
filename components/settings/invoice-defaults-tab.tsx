'use client'

import { useState } from 'react'
import { Field, Input, Textarea, SaveSettingsButton } from './shared'

interface Props {
  profile: any
  save: (data: Record<string, any>) => Promise<void>
  saving: boolean
}

export default function InvoiceDefaultsTab({ profile, save, saving }: Props) {
  const [addr, setAddr] = useState({
    address_line1: profile?.address_line1 ?? '',
    address_line2: profile?.address_line2 ?? '',
    city:          profile?.city          ?? '',
    postcode:      profile?.postcode      ?? '',
  })

  const [numbering, setNumbering] = useState({
    invoice_prefix:        profile?.invoice_prefix        ?? '',
    invoice_default_notes: profile?.invoice_default_notes ?? '',
  })

  const [email, setEmail] = useState({
    invoice_email_subject: profile?.invoice_email_subject ?? '',
    invoice_email_body:    profile?.invoice_email_body    ?? '',
  })

  return (
    <div className="space-y-4">

      {/* Address */}
      <div className="space-y-5 pb-6 border-b border-border-subtle last:border-0 last:pb-0">
        <div>
          <h2 className="font-semibold text-text-primary">Invoice address</h2>
          <p className="text-sm text-text-muted mt-1">This address appears on all invoices sent to clients.</p>
        </div>
        <Field label="Address line 1">
          <Input value={addr.address_line1} onChange={e => setAddr(p => ({ ...p, address_line1: e.target.value }))} />
        </Field>
        <Field label="Address line 2">
          <Input value={addr.address_line2} onChange={e => setAddr(p => ({ ...p, address_line2: e.target.value }))} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="City">
            <Input value={addr.city} onChange={e => setAddr(p => ({ ...p, city: e.target.value }))} />
          </Field>
          <Field label="Postcode">
            <Input value={addr.postcode} onChange={e => setAddr(p => ({ ...p, postcode: e.target.value }))} placeholder="E1 1AA" />
          </Field>
        </div>
        <SaveSettingsButton saving={saving} label="Save address" onClick={() => save(addr)} />
      </div>

      {/* Numbering + default notes */}
      <div className="space-y-5 pb-6 border-b border-border-subtle last:border-0 last:pb-0">
        <div>
          <h2 className="font-semibold text-text-primary">Invoice numbering</h2>
          <p className="text-sm text-text-muted mt-1">Pre-filled on every new invoice you create.</p>
        </div>
        <Field label="Invoice prefix" hint="Prefix used for invoice numbers. Default is INV (e.g. INV-0001).">
          <Input
            value={numbering.invoice_prefix}
            onChange={e => setNumbering(p => ({ ...p, invoice_prefix: e.target.value }))}
            placeholder="INV"
            maxLength={10}
          />
        </Field>
        <Field label="Default notes" hint="Appears at the bottom of every invoice. Can be overridden per invoice.">
          <Textarea
            rows={3}
            value={numbering.invoice_default_notes}
            onChange={e => setNumbering(p => ({ ...p, invoice_default_notes: e.target.value }))}
            placeholder="e.g. Payment due within 30 days. Thank you for your business."
          />
        </Field>
        <SaveSettingsButton saving={saving} label="Save invoice defaults" onClick={() => save(numbering)} />
      </div>

      {/* Email template */}
      <div className="space-y-5 pb-6 border-b border-border-subtle last:border-0 last:pb-0">
        <div>
          <h2 className="font-semibold text-text-primary">Invoice email message</h2>
          <p className="text-sm text-text-muted mt-1">
            Customise the email sent when you send an invoice to a client.
            Available variables: <code className="text-xs bg-surface-sunken px-1 rounded">{'{{invoice_number}}'}</code>{' '}
            <code className="text-xs bg-surface-sunken px-1 rounded">{'{{client_name}}'}</code>{' '}
            <code className="text-xs bg-surface-sunken px-1 rounded">{'{{total}}'}</code>{' '}
            <code className="text-xs bg-surface-sunken px-1 rounded">{'{{due_date}}'}</code>{' '}
            <code className="text-xs bg-surface-sunken px-1 rounded">{'{{business_name}}'}</code>
          </p>
        </div>
        <Field label="Email subject">
          <Input
            value={email.invoice_email_subject}
            onChange={e => setEmail(p => ({ ...p, invoice_email_subject: e.target.value }))}
            placeholder="Invoice {{invoice_number}} from {{business_name}}"
          />
        </Field>
        <Field label="Personal message">
          <Textarea
            rows={5}
            value={email.invoice_email_body}
            onChange={e => setEmail(p => ({ ...p, invoice_email_body: e.target.value }))}
            placeholder={`e.g. Hi {{client_name}},\n\nPlease find invoice {{invoice_number}} for {{total}} attached.\n\nKind regards,\n{{business_name}}`}
          />
        </Field>
        <SaveSettingsButton saving={saving} label="Save email template" onClick={() => save(email)} />
      </div>
    </div>
  )
}
