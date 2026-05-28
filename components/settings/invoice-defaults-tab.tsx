'use client'

import { useState } from 'react'
import { Field, inputClass, btnClass } from './shared'

interface Props {
  profile: any
  save: (data: Record<string, any>) => Promise<void>
  saving: boolean
}

export default function InvoiceDefaultsTab({ profile, save, saving }: Props) {
  const [inf, setInf] = useState({
    address_line1: profile?.address_line1 ?? '',
    address_line2: profile?.address_line2 ?? '',
    city:          profile?.city          ?? '',
    postcode:      profile?.postcode      ?? '',
  })

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
      <h2 className="font-semibold text-slate-900">Invoice Defaults</h2>
      <p className="text-sm text-slate-500">This address appears on all invoices sent to clients.</p>
      <Field label="Address line 1">
        <input className={inputClass} value={inf.address_line1} onChange={e => setInf(p => ({ ...p, address_line1: e.target.value }))} />
      </Field>
      <Field label="Address line 2">
        <input className={inputClass} value={inf.address_line2} onChange={e => setInf(p => ({ ...p, address_line2: e.target.value }))} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="City">
          <input className={inputClass} value={inf.city} onChange={e => setInf(p => ({ ...p, city: e.target.value }))} />
        </Field>
        <Field label="Postcode">
          <input className={inputClass} value={inf.postcode} onChange={e => setInf(p => ({ ...p, postcode: e.target.value }))} placeholder="E1 1AA" />
        </Field>
      </div>
      <button className={btnClass} disabled={saving} onClick={() => save(inf)}>
        {saving ? 'Saving...' : 'Save invoice defaults'}
      </button>
    </div>
  )
}
