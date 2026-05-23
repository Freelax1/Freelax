'use client'

import { useState } from 'react'
import { Bank } from '@phosphor-icons/react'
import { Field, inputClass, btnClass, formatSortCode } from './shared'

interface Props {
  profile: any
  save: (data: Record<string, any>) => Promise<void>
  saving: boolean
}

export default function BankingTab({ profile, save, saving }: Props) {
  const [bank, setBank] = useState({
    bank_account_name:   profile?.bank_account_name   ?? '',
    bank_sort_code:      profile?.bank_sort_code       ?? '',
    bank_account_number: profile?.bank_account_number  ?? '',
    bank_reference_note: profile?.bank_reference_note  ?? '',
  })

  return (
    <div className="space-y-4">
      <p className="text-xs text-text-muted bg-surface-sunken border border-border-default rounded-xl px-3 py-2">
        These details appear on your invoice PDFs only. Freelax does not process payments or access your bank account.
      </p>
      <div className="space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <Bank weight="regular" className="w-4 h-4 text-text-secondary" />
          <h2 className="font-semibold text-text-primary">Bank details</h2>
        </div>
        <p className="text-sm text-text-muted">
          These appear on all invoices and payment reminder emails, making it easy for clients to pay you directly.
        </p>

        <Field label="Account name" hint="Usually your full name or business name as registered with your bank">
          <input
            className={inputClass}
            value={bank.bank_account_name}
            onChange={e => setBank(p => ({ ...p, bank_account_name: e.target.value }))}
            placeholder="Jane Smith"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Sort code" hint="Format: 12-34-56">
            <input
              className={inputClass}
              value={bank.bank_sort_code}
              onChange={e => setBank(p => ({ ...p, bank_sort_code: formatSortCode(e.target.value) }))}
              placeholder="12-34-56"
              maxLength={8}
            />
          </Field>
          <Field label="Account number" hint="8 digits">
            <input
              className={inputClass}
              value={bank.bank_account_number}
              onChange={e => setBank(p => ({ ...p, bank_account_number: e.target.value.replace(/\D/g, '').slice(0, 8) }))}
              placeholder="12345678"
              maxLength={8}
            />
          </Field>
        </div>

        <Field
          label="Payment reference note"
          hint='Shown on invoices under bank details, e.g. "Please use invoice number as reference"'
        >
          <input
            className={inputClass}
            value={bank.bank_reference_note}
            onChange={e => setBank(p => ({ ...p, bank_reference_note: e.target.value }))}
            placeholder="Please use invoice number as reference"
          />
        </Field>

        <button className={btnClass} disabled={saving} onClick={() => save(bank)}>
          {saving ? 'Saving...' : 'Save bank details'}
        </button>
      </div>

      {/* Preview */}
      {(bank.bank_sort_code || bank.bank_account_number) && (
        <div className="bg-surface-sunken rounded-xl border border-border-default p-5">
          <p className="text-xs font-semibold text-text-secondary mb-3">Invoice preview</p>
          <div className="space-y-1.5 text-sm">
            {[
              { label: 'Account name',   value: bank.bank_account_name || '—' },
              { label: 'Sort code',      value: bank.bank_sort_code || '—' },
              { label: 'Account number', value: bank.bank_account_number || '—' },
              { label: 'Reference',      value: bank.bank_reference_note || 'Invoice number' },
            ].map(r => (
              <div key={r.label} className="flex justify-between">
                <span className="text-text-secondary">{r.label}</span>
                <span className="font-medium text-text-primary">{r.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
