'use client'

// app/(dashboard)/clients/new/page.tsx — v1.1
// UI only. Data via lib/api/clients + lib/api/users. No inline Supabase.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchCurrentUser } from '@/lib/api/users'
import { createClientRecord } from '@/lib/api/clients'
import { Field, Input, Textarea, Select, SaveButton } from '@/components/form-fields'
import Alert from '@/components/ui/alert'
import PageHeader from '@/components/ui/page-header'
import { FormSection, FormFooter, FormCancelLink } from '@/components/ui'
import PageLayout from '@/components/page-layout'

export default function NewClientPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [form, setForm] = useState({
    name:          '',
    contact_name:  '',
    email:         '',
    phone:         '',
    address_line1: '',
    address_line2: '',
    city:          '',
    postcode:      '',
    status:        'active',
    notes:         '',
  })

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
    setError(null)

    try {
      const user = await fetchCurrentUser()
      if (!user) { setSaving(false); return }
      await createClientRecord({ ...form, user_id: user.id, updated_at: new Date().toISOString() })
      router.push('/clients')
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong')
      setSaving(false)
    }
  }

  return (
    <PageLayout width="narrow" className="space-y-6">
      <PageHeader
        back={{ href: '/clients', label: 'Back to clients' }}
        title="New client"
      />

      {error && (
        <Alert intent="danger">{error}</Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <FormSection title="Client details">
          <Field label="Business name" required error={errors.name}>
            <Input value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="Acme Ltd" error={!!errors.name} autoFocus />
          </Field>

          <Field label="Contact name">
            <Input value={form.contact_name} onChange={e => set('contact_name', e.target.value)} placeholder="Jane Smith" />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Email">
              <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="jane@acme.com" />
            </Field>
            <Field label="Phone">
              <Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="07700 000000" />
            </Field>
          </div>

          <Field label="Status">
            <Select value={form.status} onChange={e => set('status', e.target.value)} options={[
              { value: 'active',   label: 'Active' },
              { value: 'paused',   label: 'Paused' },
              { value: 'archived', label: 'Archived' },
            ]} />
          </Field>
        </FormSection>

        <FormSection title="Address">
          <Field label="Address line 1">
            <Input value={form.address_line1} onChange={e => set('address_line1', e.target.value)} placeholder="10 Example Street" />
          </Field>
          <Field label="Address line 2">
            <Input value={form.address_line2} onChange={e => set('address_line2', e.target.value)} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="City">
              <Input value={form.city} onChange={e => set('city', e.target.value)} placeholder="London" />
            </Field>
            <Field label="Postcode">
              <Input value={form.postcode} onChange={e => set('postcode', e.target.value)} placeholder="E1 1AA" />
            </Field>
          </div>
        </FormSection>

        <FormSection density="none">
          <Field label="Notes">
            <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} placeholder="Any notes about this client..." />
          </Field>
        </FormSection>

        <FormFooter>
          <FormCancelLink href="/clients" />
          <SaveButton loading={saving} label="Add client" />
        </FormFooter>
      </form>
    </PageLayout>
  )
}
