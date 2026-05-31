'use client'

import { useState } from 'react'
import { addMileageEntry } from '@/lib/api/mileage'
import Button from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'

interface Props {
  userId: string
  taxYearStart: number
  onSuccess?: () => void
}

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
        <Field label="Date" required>
          <Input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
        </Field>
        <Field label="Miles" required>
          <Input type="number" step="0.1" min="0.1" placeholder="e.g. 24.5" value={form.miles} onChange={e => setForm(p => ({ ...p, miles: e.target.value }))} />
        </Field>
      </div>
      <Field label="Purpose / description" required>
        <Input placeholder="e.g. Client meeting — Acme Ltd" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="From">
          <Input placeholder="Home office" value={form.from_location} onChange={e => setForm(p => ({ ...p, from_location: e.target.value }))} />
        </Field>
        <Field label="To">
          <Input placeholder="Client site" value={form.to_location} onChange={e => setForm(p => ({ ...p, to_location: e.target.value }))} />
        </Field>
      </div>
      <Button type="button" intent="primary" size="sm" onClick={handleSubmit} disabled={saving || !form.description || !form.miles}>
        {saving ? 'Saving…' : 'Add journey'}
      </Button>
    </div>
  )
}
