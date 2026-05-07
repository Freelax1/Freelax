'use client'

import { useState } from 'react'
import { Field, Toggle, inputClass, btnClass } from './shared'

interface Props {
  profile: any
  save: (data: Record<string, any>) => Promise<void>
  saving: boolean
}

export default function BusinessTab({ profile, save, saving }: Props) {
  const [bf, setBf] = useState({
    business_name: profile?.business_name ?? '',
    business_type: profile?.business_type ?? 'sole_trader',
    vat_registered: profile?.vat_registered ?? false,
    vat_number: profile?.vat_number ?? '',
    vat_scheme: profile?.vat_scheme ?? 'standard',
    utr_number: profile?.utr_number ?? '',
  })

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
      <h2 className="font-semibold text-slate-900">Business details</h2>
      <Field label="Business name">
        <input className={inputClass} value={bf.business_name} onChange={e => setBf(p => ({ ...p, business_name: e.target.value }))} />
      </Field>
      <Field label="Business type">
        <p className={inputClass + ' bg-slate-50 text-slate-700 cursor-default'}>
          {{ sole_trader: 'Sole Trader', limited_company: 'Limited Company', partnership: 'Partnership' }[bf.business_type] ?? bf.business_type}
        </p>
        <p className="text-xs text-slate-500 mt-1">
          To change your business type, contact support@freelax.co.uk.{' '}
          <a
            href={`mailto:support@freelax.co.uk?subject=Business%20type%20change%20request&body=Hi%2C%20I%20would%20like%20to%20change%20my%20business%20type%20from%20${encodeURIComponent(bf.business_type)}%20to%20%5Bblank%5D.%20My%20account%20email%20is%20${encodeURIComponent(profile?.email ?? '')}.`}
            className="text-indigo-600 hover:underline"
          >
            Request business type change
          </a>
        </p>
      </Field>
      <Toggle checked={bf.vat_registered} onChange={v => setBf(p => ({ ...p, vat_registered: v }))} label="VAT registered" />
      {bf.vat_registered && (
        <>
          <Field label="VAT number">
            <input className={inputClass} value={bf.vat_number} onChange={e => setBf(p => ({ ...p, vat_number: e.target.value }))} placeholder="GB123456789" />
          </Field>
          <Field label="VAT scheme">
            <select className={inputClass} value={bf.vat_scheme} onChange={e => setBf(p => ({ ...p, vat_scheme: e.target.value }))}>
              <option value="standard">Standard</option>
              <option value="flat_rate">Flat Rate</option>
            </select>
          </Field>
        </>
      )}
      <Field label="UTR number">
        <input className={inputClass} value={bf.utr_number} onChange={e => setBf(p => ({ ...p, utr_number: e.target.value }))} placeholder="1234567890" />
      </Field>
      <button className={btnClass} disabled={saving} onClick={() => save(bf)}>
        {saving ? 'Saving...' : 'Save business details'}
      </button>
    </div>
  )
}
