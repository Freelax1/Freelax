'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/tax-calculations'
import { Plus, X, ArrowLeft } from '@phosphor-icons/react'
import Link from 'next/link'
import type { Invoice, InvoiceLineItem } from '@/types/database'
import { Input, Select, Textarea, Label } from '@/components/form-fields'

type ClientOption = { id: string; name: string }
type ProjectOption = { id: string; title: string }

interface LineItem {
  id?: string
  description: string
  quantity: number
  unit_price: number
  vat_rate: number
}

export default function InvoiceEditPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [clients, setClients] = useState<ClientOption[]>([])
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [clientId, setClientId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [issueDate, setIssueDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [paymentTerms, setPaymentTerms] = useState('')
  const [notes, setNotes] = useState('')
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [{ data: inv }, { data: cls }] = await Promise.all([
        supabase.from('invoices').select('*, invoice_line_items(*)').eq('id', params.id).single(),
        supabase.from('clients').select('id, name').order('name'),
      ])
      if (inv) {
        setInvoice(inv)
        setClientId(inv.client_id ?? '')
        setProjectId(inv.project_id ?? '')
        setIssueDate(inv.issue_date)
        setDueDate(inv.due_date)
        setPaymentTerms(inv.payment_terms ?? '')
        setNotes(inv.notes ?? '')
        setLineItems((inv.invoice_line_items as InvoiceLineItem[] | undefined)?.map((l) => ({
          id: l.id,
          description: l.description,
          quantity: l.quantity,
          unit_price: l.unit_price,
          vat_rate: l.vat_rate,
        })) ?? [])
      }
      setClients(cls ?? [])
      setLoading(false)
    }
    load()
  }, [params.id])

  useEffect(() => {
    if (!clientId) { setProjects([]); return }
    const supabase = createClient()
    supabase.from('projects').select('id, title').eq('client_id', clientId).eq('status', 'active')
      .then(({ data }) => setProjects(data ?? []))
  }, [clientId])

  function updateLine(i: number, field: keyof LineItem, value: string | number) {
    setLineItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item))
  }

  const subtotal = lineItems.reduce((s, l) => s + (Number(l.quantity) * Number(l.unit_price)), 0)
  const vatAmount = lineItems.reduce((s, l) => s + (Number(l.quantity) * Number(l.unit_price) * Number(l.vat_rate) / 100), 0)
  const total = subtotal + vatAmount

  async function handleSave() {
    setSaving(true)
    const supabase = createClient()

    await supabase.from('invoices').update({
      client_id: clientId || null,
      project_id: projectId || null,
      issue_date: issueDate,
      due_date: dueDate,
      payment_terms: paymentTerms,
      notes: notes || null,
      subtotal,
      vat_amount: vatAmount,
      total,
      updated_at: new Date().toISOString(),
    }).eq('id', params.id)

    // Delete old line items and re-insert
    await supabase.from('invoice_line_items').delete().eq('invoice_id', params.id)
    await supabase.from('invoice_line_items').insert(
      lineItems.map(l => ({
        invoice_id: params.id,
        description: l.description,
        quantity: Number(l.quantity),
        unit_price: Number(l.unit_price),
        vat_rate: Number(l.vat_rate),
        line_total: Number(l.quantity) * Number(l.unit_price),
      }))
    )

    setSaving(false)
    router.push(`/invoices/${params.id}`)
  }

  if (loading) return <div className="space-y-4">{Array.from({length:3}).map((_,i) => <div key={i} className="h-16 bg-surface-sunken rounded-xl animate-pulse"/>)}</div>

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href={`/invoices/${params.id}`} className="flex items-center gap-1 text-sm text-text-muted hover:text-text-secondary mb-3">
          <ArrowLeft weight="regular" className="w-4 h-4" /> Back to invoice
        </Link>
        <h1 className="text-2xl font-serif font-semibold text-text-primary">Edit {invoice?.invoice_number}</h1>
      </div>

      <div className="bg-surface-card rounded-xl border border-border-default p-6 space-y-4">
        <h2 className="font-semibold text-text-primary">Invoice Details</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Client</Label>
            <Select value={clientId} onChange={e => setClientId(e.target.value)}>
              <option value="">No client</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
          <div>
            <Label>Project</Label>
            <Select value={projectId} onChange={e => setProjectId(e.target.value)}>
              <option value="">No project</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </Select>
          </div>
          <div>
            <Label>Issue date</Label>
            <Input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} />
          </div>
          <div>
            <Label>Due date</Label>
            <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>
          <div className="col-span-2">
            <Label>Payment terms</Label>
            <Input value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="bg-surface-card rounded-xl border border-border-default p-6 space-y-3">
        <h2 className="font-semibold text-text-primary">Line Items</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-muted border-b border-border-subtle">
                <th className="pb-2 font-medium w-1/2">Description</th>
                <th className="pb-2 font-medium w-16">Qty</th>
                <th className="pb-2 font-medium w-24">Price (£)</th>
                <th className="pb-2 font-medium w-16">VAT%</th>
                <th className="pb-2 font-medium w-20 text-right">Total</th>
                <th className="pb-2 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item, i) => (
                <tr key={i}>
                  <td className="py-1 pr-2"><Input variant="inline" value={item.description} onChange={e => updateLine(i, 'description', e.target.value)} /></td>
                  <td className="py-1 pr-2"><Input variant="inline" type="number" value={item.quantity} onChange={e => updateLine(i, 'quantity', parseFloat(e.target.value) || 0)} /></td>
                  <td className="py-1 pr-2"><Input variant="inline" type="number" step="0.01" value={item.unit_price} onChange={e => updateLine(i, 'unit_price', parseFloat(e.target.value) || 0)} /></td>
                  <td className="py-1 pr-2">
                    <Select variant="inline" value={item.vat_rate} onChange={e => updateLine(i, 'vat_rate', parseFloat(e.target.value))}>
                      <option value={20}>20%</option>
                      <option value={5}>5%</option>
                      <option value={0}>0%</option>
                    </Select>
                  </td>
                  <td className="py-1 text-right font-medium">{formatCurrency(Number(item.quantity) * Number(item.unit_price))}</td>
                  <td className="py-1 pl-2">
                    {lineItems.length > 1 && (
                      <button type="button" onClick={() => setLineItems(prev => prev.filter((_,idx) => idx !== i))} aria-label="Remove line item" className="text-text-muted hover:text-danger-500">
                        <X weight="regular" className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" onClick={() => setLineItems(prev => [...prev, { description: '', quantity: 1, unit_price: 0, vat_rate: 20 }])} className="flex items-center gap-1 text-sm text-forest-600 hover:text-forest-700">
          <Plus weight="regular" className="w-4 h-4" /> Add line item
        </button>
        <div className="border-t border-border-subtle pt-3 space-y-1 max-w-xs ml-auto text-sm">
          <div className="flex justify-between"><span className="text-text-muted">Subtotal</span><span className="font-medium">{formatCurrency(subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-text-muted">VAT</span><span className="font-medium">{formatCurrency(vatAmount)}</span></div>
          <div className="flex justify-between border-t border-border-subtle pt-1"><span className="font-semibold text-text-secondary">Total</span><span className="font-semibold text-text-primary text-base">{formatCurrency(total)}</span></div>
        </div>
      </div>

      <div className="bg-surface-card rounded-xl border border-border-default p-6">
        <Label>Notes</Label>
        <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
      </div>

      <div className="flex justify-end gap-3">
        <Link href={`/invoices/${params.id}`} className="px-4 py-2 border border-border-default rounded-lg text-sm text-text-secondary hover:bg-surface-sunken">Cancel</Link>
        <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-forest-900 text-white rounded-lg text-sm font-medium hover:bg-forest-900 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </div>
    </div>
  )
}
