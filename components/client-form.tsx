'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Field, Input, Textarea, Select, SaveButton } from '@/components/form-fields'
import type { Client } from '@/types/database'

interface ClientFormProps {
  client?: Partial<Client>
  onSuccess?: () => void
}

export default function ClientForm({ client, onSuccess }: ClientFormProps) {
  const router = useRouter()
  const isEdit = !!client?.id

  const [form, setForm] = useState({
    name: client?.name ?? '',
    contact_name: client?.contact_name ?? '',
    email: client?.email ?? '',
    phone: client?.phone ?? '',
    address_line1: client?.address_line1 ?? '',
    address_line2: client?.address_line2 ?? '',
    city: client?.city ?? '',
    postcode: client?.postcode ?? '',
    status: client?.status ?? 'active',
    notes: client?.notes ?? '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  function set(field: string, value: string) {
    setForm(p => ({ ...p, [field]: value }))
    if (errors[field]) setErrors(p => { const n = { ...p }; delete n[field]; return n })
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Business name is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const payload = { ...form, updated_at: new Date().toISOString() }

    const { error } = isEdit
      ? await supabase.from('clients').update(payload).eq('id', client!.id!)
      : await supabase.from('clients').insert({ ...payload, user_id: user.id })

    setSaving(false)
    if (error) { setErrors({ _: error.message }); return }
    onSuccess?.()
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errors._ && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{errors._}</p>}

      <Field label="Business name" required error={errors.name}>
        <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Acme Ltd" error={!!errors.name} />
      </Field>

      <Field label="Contact name">
        <Input value={form.contact_name} onChange={e => set('contact_name', e.target.value)} placeholder="Jane Smith" />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Email">
          <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="jane@acme.com" />
        </Field>
        <Field label="Phone">
          <Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="07700 000000" />
        </Field>
      </div>

      <Field label="Address line 1">
        <Input value={form.address_line1} onChange={e => set('address_line1', e.target.value)} />
      </Field>
      <Field label="Address line 2">
        <Input value={form.address_line2} onChange={e => set('address_line2', e.target.value)} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="City">
          <Input value={form.city} onChange={e => set('city', e.target.value)} />
        </Field>
        <Field label="Postcode">
          <Input value={form.postcode} onChange={e => set('postcode', e.target.value)} placeholder="E1 1AA" />
        </Field>
      </div>

      <Field label="Status">
        <Select
          value={form.status}
          onChange={e => set('status', e.target.value)}
          options={[
            { value: 'active', label: 'Active' },
            { value: 'paused', label: 'Paused' },
            { value: 'archived', label: 'Archived' },
          ]}
        />
      </Field>

      <Field label="Notes">
        <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} placeholder="Any notes about this client..." />
      </Field>

      <div className="pt-2">
        <SaveButton loading={saving} label={isEdit ? 'Update client' : 'Add client'} />
      </div>
    </form>
  )
}
