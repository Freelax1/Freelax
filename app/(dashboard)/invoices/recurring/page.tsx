'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fetchCurrentUser } from '@/lib/api/users'
import { fetchClientsForDropdown } from '@/lib/api/clients'
import { formatCurrency } from '@/lib/tax-calculations'
import { PageHeader, TableCardSkeleton, TABLE_CELL_PRESETS, FormSection, FormFooter } from '@/components/ui'
import Button from '@/components/ui/button'
import Badge from '@/components/badge'
import { Plus, Pause, Play, Trash } from '@phosphor-icons/react'
import type { InvoiceTemplate, Client } from '@/types/database'
import { Input, Select, Field } from '@/components/ui/input'
import { IconButton } from '@/components/ui/icon-button'
import ListPageLayout from '@/components/list-page-layout'

type RecurringTemplateRow = InvoiceTemplate & {
  clients: { name: string } | null
}

interface LineItem { description: string; quantity: number; unit_price: number; vat_rate: number }

export default function RecurringInvoicesPage() {
  const [templates, setTemplates] = useState<RecurringTemplateRow[]>([])
  const [clients, setClients]     = useState<Pick<Client, 'id' | 'name' | 'status'>[]>([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [saving, setSaving]       = useState(false)

  // Form state
  const [clientId, setClientId]   = useState('')
  const [frequency, setFrequency] = useState('monthly')
  const [nextRun, setNextRun]     = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() + 1); return d.toISOString().slice(0, 10)
  })
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: '', quantity: 1, unit_price: 0, vat_rate: 20 }
  ])

  async function load() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data } = await supabase
      .from('invoice_templates')
      .select('*, clients(name)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setTemplates((data ?? []) as RecurringTemplateRow[])
    setLoading(false)
  }

  useEffect(() => {
    load()
    fetchClientsForDropdown().then(setClients)
  }, [])

  async function handleSave() {
    setSaving(true)
    const supabase = createClient()
    const user = await fetchCurrentUser()
    if (!user) { setSaving(false); return }
    const { error } = await supabase.from('invoice_templates').insert({
      user_id:       user.id,
      client_id:     clientId || null,
      frequency,
      next_run_date: nextRun,
      line_items:    lineItems,
      active:        true,
    })
    if (error) { setSaving(false); return }
    setShowForm(false)
    setClientId(''); setFrequency('monthly')
    setLineItems([{ description: '', quantity: 1, unit_price: 0, vat_rate: 20 }])
    await load()
    setSaving(false)
  }

  async function toggleActive(id: string, active: boolean) {
    const supabase = createClient()
    await supabase.from('invoice_templates').update({ active: !active }).eq('id', id)
    await load()
  }

  async function deleteTemplate(id: string) {
    if (!confirm('Delete this recurring template?')) return
    const supabase = createClient()
    await supabase.from('invoice_templates').delete().eq('id', id)
    await load()
  }

  const total = (items: LineItem[]) => items.reduce((s, i) => s + i.quantity * i.unit_price * (1 + i.vat_rate / 100), 0)

  return (
    <ListPageLayout>
      <PageHeader
        title="Recurring Invoices"
        subtitle={loading ? '' : `${templates.filter(t => t.active).length} active templates`}
        action={
          <Button type="button" intent="primary" size="sm" onClick={() => setShowForm(true)}>
            <Plus weight="regular" className="w-4 h-4" /> New template
          </Button>
        }
      />

      {/* New template form */}
      {showForm && (
        <FormSection title="New recurring template" className="mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Client">
              <Select value={clientId} onChange={e => setClientId(e.target.value)}>
                <option value="">Select client...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Frequency">
              <Select value={frequency} onChange={e => setFrequency(e.target.value)}>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
              </Select>
            </Field>
            <Field label="First invoice date">
              <Input type="date" value={nextRun} onChange={e => setNextRun(e.target.value)} />
            </Field>
          </div>

          {/* Line items */}
          <div>
            <p className="text-xs font-medium text-text-muted mb-2">Line items</p>
            {lineItems.map((item, i) => (
              <div key={i} className="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-2">
                <Input variant="inline" value={item.description} onChange={e => setLineItems(prev => prev.map((l, j) => j === i ? { ...l, description: e.target.value } : l))}
                  placeholder="Description" className="sm:col-span-2" />
                <Input variant="inline" type="number" value={item.quantity} onChange={e => setLineItems(prev => prev.map((l, j) => j === i ? { ...l, quantity: Number(e.target.value) } : l))}
                  placeholder="Qty" />
                <Input variant="inline" type="number" value={item.unit_price} onChange={e => setLineItems(prev => prev.map((l, j) => j === i ? { ...l, unit_price: Number(e.target.value) } : l))}
                  placeholder="Price (£)" />
              </div>
            ))}
            <Button
              type="button"
              intent="ghost"
              size="sm"
              className="mt-1 -ml-2"
              onClick={() => setLineItems(prev => [...prev, { description: '', quantity: 1, unit_price: 0, vat_rate: 20 }])}
            >
              <Plus weight="regular" className="w-3.5 h-3.5" /> Add line
            </Button>
          </div>

          <FormFooter className="pt-2">
            <Button type="button" intent="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="button" intent="primary" size="sm" onClick={handleSave} disabled={saving || !clientId}>
              {saving ? 'Saving...' : 'Create template'}
            </Button>
          </FormFooter>
        </FormSection>
      )}

      {/* Template list */}
      {loading ? (
        <TableCardSkeleton rows={4} cells={TABLE_CELL_PRESETS.recurring} tableClassName="text-sm" />
      ) : !templates.length ? (
        <div className="bg-surface-card rounded-xl border border-border-default p-12 text-center">
          <p className="text-text-muted text-sm mb-2">No recurring templates yet</p>
          <p className="text-text-secondary text-xs">Create a template and invoices will be generated automatically.</p>
        </div>
      ) : (
        <div className="fd-table-wrap bg-surface-card rounded-xl border border-border-default overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-sunken border-b border-border-default">
              <tr>
                {['Client', 'Frequency', 'Next invoice', 'Amount', 'Status', ''].map((h, i) => (
                  <th key={i} className="px-4 py-3 font-medium text-text-secondary text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {templates.map(t => (
                <tr key={t.id} className="hover:bg-surface-sunken">
                  <td className="px-4 py-3 font-medium text-text-primary">{t.clients?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-text-secondary capitalize">{t.frequency}</td>
                  <td className="px-4 py-3 text-text-muted">{new Date(t.next_run_date).toLocaleDateString('en-GB')}</td>
                  <td className="px-4 py-3 font-medium">{formatCurrency(total(t.line_items ?? []))}</td>
                  <td className="px-4 py-3">
                    <Badge status={t.active ? 'active' : 'paused'} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <IconButton
                        label={t.active ? 'Pause' : 'Resume'}
                        onClick={() => toggleActive(t.id, t.active)}
                        icon={t.active ? <Pause weight="regular" className="w-4 h-4" /> : <Play weight="regular" className="w-4 h-4" />}
                      />
                      <IconButton
                        label="Delete"
                        variant="danger"
                        onClick={() => deleteTemplate(t.id)}
                        icon={<Trash weight="regular" className="w-4 h-4" />}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-text-secondary mt-4">
        Invoices are auto-created on the scheduled date. A Vercel cron job or Supabase scheduled function is required to trigger generation — see <code>/api/invoices/recurring</code>.
      </p>
    </ListPageLayout>
  )
}
