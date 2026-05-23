'use client'

import { useState } from 'react'
import { addMileageEntry } from '@/lib/api/mileage'

interface Props {
  userId: string
  taxYearStart: number
  onSuccess?: () => void
}

const inputClass = 'w-full px-3 py-2 border border-border-default rounded-md text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/20 bg-surface-card'
const labelClass = 'block text-xs font-medium text-text-secondary mb-1'

export default function MileageForm({ userId, taxYearStart, onSuccess }: Props) {
  const [form, setForm] = useState({
    date:          new Date().toISOString().slice(0, 10),
    description:   '',
    from_location: '',
    to_location:   '',
    miles:         '',
    purpose:       'business',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  async function handleSubmit() {
    if (!form.description.trim() || !form.miles) { setError('Description and miles are required'); return }
    setSaving(true)
    setError(null)
    try {
      await addMileageEntry({
        user_id:        userId,
        date:           form.date,
        description:    form.description,
        from_location:  form.from_location || undefined,
        to_location:    form.to_location   || undefined,
        miles:          Number(form.miles),
        purpose:        form.purpose,
        tax_year_start: taxYearStart,
      })
      onSuccess?.()
    } catch (e) {
      setError('Failed to save journey')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-danger-600">{error}</p>}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Date <span className="text-danger-400">*</span></label>
          <input aria-label="Date" type="date" className={inputClass} value={form.date}
            onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
        </div>
        <div>
          <label className={labelClass}>Miles <span className="text-danger-400">*</span></label>
          <input aria-label="Miles" type="number" step="0.1" min="0.1" className={inputClass} placeholder="e.g. 24.5"
            value={form.miles} onChange={e => setForm(p => ({ ...p, miles: e.target.value }))} />
        </div>
      </div>
      <div>
        <label className={labelClass}>Purpose / description <span className="text-danger-400">*</span></label>
        <input aria-label="Purpose / description" className={inputClass} placeholder="e.g. Client meeting — Acme Ltd"
          value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>From</label>
          <input aria-label="From location" className={inputClass} placeholder="Home office"
            value={form.from_location} onChange={e => setForm(p => ({ ...p, from_location: e.target.value }))} />
        </div>
        <div>
          <label className={labelClass}>To</label>
          <input aria-label="To location" className={inputClass} placeholder="Client site"
            value={form.to_location} onChange={e => setForm(p => ({ ...p, to_location: e.target.value }))} />
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button
          onClick={handleSubmit}
          disabled={saving || !form.description || !form.miles}
          className="px-4 py-2 bg-forest-900 text-white rounded-xl text-sm font-medium hover:bg-forest-800 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save journey'}
        </button>
      </div>
    </div>
  )
}
