'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fetchCurrentUser } from '@/lib/api/users'
import { fetchClientsForDropdown } from '@/lib/api/clients'
import { formatCurrency } from '@/lib/tax-calculations'
import PageHeader from '@/components/page-header'
import Badge from '@/components/badge'
import Link from 'next/link'
import { Plus, Pause, Play, Trash } from '@phosphor-icons/react'
import type { InvoiceTemplate, Client } from '@/types/database'

interface LineItem { description: string; quantity: number; unit_price: number; vat_rate: number }

export default function RecurringInvoicesPage() {
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([])
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
    if (!user) return
    const { data } = await supabase
      .from('invoice_templates')
      .select('*, clients(name)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setTemplates(data ?? [])
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
    if (!user) return
    await supabase.from('invoice_templates').insert({
      user_id:       user.id,
      client_id:     clientId || null,
      frequency,
      next_run_date: nextRun,
      line_items:    lineItems,
      active:        true,
    })
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
    <div>
      <PageHeader
        title="Recurring Invoices"
        subtitle={loading ? '' : `${templates.filter(t => t.active).length} active templates`}
        action={
          <button onClick={() => setShowForm(true)}
            className="bg-forest-900 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-forest-900 flex items-center gap-2">
            <Plus weight="regular" className="w-4 h-4" /> New template
          </button>
        }
      />

      {/* New template form */}
      {showForm && (
        <div className="bg-surface-card rounded-xl border border-border-default p-6 mb-6 space-y-4">
          <h2 className="font-semibold text-text-primary">New recurring template</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Client</label>
              <select value={clientId} onChange={e => setClientId(e.target.value)}
                className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/20">
                <option value="">Select client...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Frequency</label>
              <select value={frequency} onChange={e => setFrequency(e.target.value)}
                className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/20">
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">First invoice date</label>
              <input type="date" value={nextRun} onChange={e => setNextRun(e.target.value)}
                className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/20" />
            </div>
          </div>

          {/* Line items */}
          <div>
            <p className="text-xs font-medium text-text-muted mb-2">Line items</p>
            {lineItems.map((item, i) => (
              <div key={i} className="grid grid-cols-4 gap-2 mb-2">
                <input value={item.description} onChange={e => setLineItems(prev => prev.map((l, j) => j === i ? { ...l, description: e.target.value } : l))}
                  placeholder="Description" className="col-span-2 px-2 py-1.5 border border-border-default rounded text-sm focus-visible:outline-none" />
                <input type="number" value={item.quantity} onChange={e => setLineItems(prev => prev.map((l, j) => j === i ? { ...l, quantity: Number(e.target.value) } : l))}
                  placeholder="Qty" className="px-2 py-1.5 border border-border-default rounded text-sm focus-visible:outline-none" />
                <input type="number" value={item.unit_price} onChange={e => setLineItems(prev => prev.map((l, j) => j === i ? { ...l, unit_price: Number(e.target.value) } : l))}
                  placeholder="Price (£)" className="px-2 py-1.5 border border-border-default rounded text-sm focus-visible:outline-none" />
              </div>
            ))}
            <button onClick={() => setLineItems(prev => [...prev, { description: '', quantity: 1, unit_price: 0, vat_rate: 20 }])}
              className="text-sm text-forest-600 hover:text-forest-700">+ Add line</button>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-border-default rounded-lg text-sm text-text-secondary hover:bg-surface-sunken">Cancel</button>
            <button onClick={handleSave} disabled={saving || !clientId}
              className="px-4 py-2 bg-forest-900 text-white rounded-xl text-sm font-medium hover:bg-forest-900 disabled:opacity-50">
              {saving ? 'Saving...' : 'Create template'}
            </button>
          </div>
        </div>
      )}

      {/* Template list */}
      {!loading && !templates.length ? (
        <div className="bg-surface-card rounded-xl border border-border-default p-12 text-center">
          <p className="text-text-muted text-sm mb-2">No recurring templates yet</p>
          <p className="text-text-secondary text-xs">Create a template and invoices will be generated automatically.</p>
        </div>
      ) : (
        <div className="bg-surface-card rounded-xl border border-border-default overflow-hidden">
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
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${t.active ? 'bg-success-50 text-success-700 border border-success-200' : 'bg-surface-sunken text-text-secondary border border-border-default'}`}>
                      {t.active ? 'Active' : 'Paused'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => toggleActive(t.id, t.active)}
                        className="p-1.5 rounded hover:bg-surface-sunken text-text-secondary hover:text-text-secondary" title={t.active ? 'Pause' : 'Resume'}>
                        {t.active ? <Pause weight="regular" className="w-4 h-4" /> : <Play weight="regular" className="w-4 h-4" />}
                      </button>
                      <button onClick={() => deleteTemplate(t.id)}
                        className="p-1.5 rounded hover:bg-danger-50 text-text-secondary hover:text-danger-600">
                        <Trash weight="regular" className="w-4 h-4" />
                      </button>
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
    </div>
  )
}
