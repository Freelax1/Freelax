'use client'

import { useState } from 'react'
import { Field, Toggle, Input, Select, inputClass, SaveSettingsButton } from './shared'

interface Props {
  profile: any
  save: (data: Record<string, any>) => Promise<void>
  saving: boolean
}

const businessTypeLabels: Record<string, string> = {
  sole_trader: 'Sole Trader',
  limited_company: 'Limited Company',
  partnership: 'Partnership',
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
    <div className="space-y-5">
      <Field label="Business name">
        <Input value={bf.business_name} onChange={e => setBf(p => ({ ...p, business_name: e.target.value }))} />
      </Field>
      <Field label="Business type">
        <p className={inputClass + ' bg-surface-sunken text-text-secondary cursor-default'}>
          {businessTypeLabels[bf.business_type] ?? bf.business_type}
        </p>
        <p className="text-xs text-text-muted mt-1">
          To change your business type, contact support@freelax.co.uk.{' '}
          <a
            href={`mailto:support@freelax.co.uk?subject=Business%20type%20change%20request&body=Hi%2C%20I%20would%20like%20to%20change%20my%20business%20type%20from%20${encodeURIComponent(bf.business_type)}%20to%20%5Bblank%5D.%20My%20account%20email%20is%20${encodeURIComponent(profile?.email ?? '')}.`}
            className="text-forest-600 hover:underline"
          >
            Request business type change
          </a>
        </p>
      </Field>
      <Toggle checked={bf.vat_registered} onChange={v => setBf(p => ({ ...p, vat_registered: v }))} label="VAT registered" />
      {bf.vat_registered && (
        <>
          <Field label="VAT number">
            <Input value={bf.vat_number} onChange={e => setBf(p => ({ ...p, vat_number: e.target.value }))} placeholder="GB123456789" />
          </Field>
          <Field label="VAT scheme">
            <Select value={bf.vat_scheme} onChange={e => setBf(p => ({ ...p, vat_scheme: e.target.value }))}>
              <option value="standard">Standard</option>
              <option value="flat_rate">Flat Rate</option>
            </Select>
          </Field>
        </>
      )}
      <Field label="UTR number">
        <Input value={bf.utr_number} onChange={e => setBf(p => ({ ...p, utr_number: e.target.value }))} placeholder="1234567890" />
      </Field>
      <SaveSettingsButton saving={saving} label="Save business details" onClick={() => save(bf)} />
    </div>
  )
}
