'use client'

// app/(dashboard)/quotes/[id]/edit/page.tsx — v1.0
// UI only. Data via lib/api/quotes + lib/api/clients + lib/api/projects.
// Calculations via lib/logic/quotes.

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { formatCurrency } from '@/lib/tax-calculations'
import { fetchQuoteById, updateQuote, deleteQuoteLineItems, createQuoteLineItems } from '@/lib/api/quotes'
import { fetchClientsForDropdown } from '@/lib/api/clients'
import { fetchProjectsForClient } from '@/lib/api/projects'
import { calcQuoteSubtotal, calcQuoteVat, calcQuoteTotal } from '@/lib/logic/quotes'
import Link from 'next/link'
import { ArrowLeft, Plus, X } from 'lucide-react'

interface LineItem {
  description: string
  quantity: number
  unit_price: number
  vat_rate: number
}

export default function EditQuotePage() {
  const params = useParams<{ id: string }>()
  const router  = useRouter()

  const [clients, setClients]   = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [clientId, setClientId]   = useState('')
  const [projectId, setProjectId] = useState('')
  const [issueDate, setIssueDate] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [notes, setNotes]   = useState('')
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: '', quantity: 1, unit_price: 0, vat_rate: 20 },
  ])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState<string | null>(null)

  useEffect(() => {
    fetchClientsForDropdown().then(setClients)
    fetchQuoteById(params.id).then(q => {
      if (!q) return
      setClientId(q.client_id ?? '')
      setProjectId(q.project_id ?? '')
      setIssueDate(q.issue_date)
      setExpiryDate(q.expiry_date)
      setNotes(q.notes ?? '')
      setLineItems((q.quote_line_items ?? []).map((l: any) => ({
        description: l.description,
        quantity:    l.quantity,
        unit_price:  l.unit_price,
        vat_rate:    l.vat_rate,
      })))
      setLoading(false)
    })
  }, [params.id])

  useEffect(() => {
    if (!clientId) { setProjects([]); return }
    fetchProjectsForClient(clientId).then(setProjects)
  }, [clientId])

  function updateLine(i: number, field: keyof LineItem, value: string | number) {
    setLineItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item))
  }

  const subtotal  = calcQuoteSubtotal(lineItems)
  const vatAmount = calcQuoteVat(lineItems)
  const total     = calcQuoteTotal(lineItems)

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      await updateQuote(params.id, {
        client_id:   clientId  || null,
        project_id:  projectId || null,
        issue_date:  issueDate,
        expiry_date: expiryDate,
        notes:       notes || null,
        subtotal,
        vat_amount:  vatAmount,
        total,
      })

      // Replace line items
      await deleteQuoteLineItems(params.id)
      await createQuoteLineItems(
        lineItems.map(l => ({
          quote_id:    params.id,
          description: l.description,
          quantity:    l.quantity,
          unit_price:  l.unit_price,
          vat_rate:    l.vat_rate,
          line_total:  l.quantity * l.unit_price,
        }))
      )

      router.push(`/quotes/${params.id}`)
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong')
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="space-y-4 max-w-3xl">
      {[1,2,3].map(i => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}
    </div>
  )

  return (
    <div className="max-w-3xl space-y-6 pb-12">
      <div>
        <Link href={`/quotes/${params.id}`} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-3">
          <ArrowLeft className="w-4 h-4" /> Back to quote
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Edit quote</h1>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}

      {/* Quote details */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <h2 className="font-semibold text-slate-800">Quote details</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Client</label>
            <select value={clientId} onChange={e => setClientId(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900">
              <option value="">Select client...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Project</label>
            <select value={projectId} onChange={e => setProjectId(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900">
              <option value="">No project</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Issue date</label>
            <input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Valid until</label>
            <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900" />
          </div>
        </div>
      </div>

      {/* Line items */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3">
        <h2 className="font-semibold text-slate-800">Line items</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
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
                  <td className="py-1 pr-2"><input value={item.description} onChange={e => updateLine(i, 'description', e.target.value)} placeholder="Description" className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-slate-900" /></td>
                  <td className="py-1 pr-2"><input type="number" value={item.quantity} onChange={e => updateLine(i, 'quantity', parseFloat(e.target.value) || 0)} className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-slate-900" /></td>
                  <td className="py-1 pr-2"><input type="number" step="0.01" value={item.unit_price} onChange={e => updateLine(i, 'unit_price', parseFloat(e.target.value) || 0)} className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-slate-900" /></td>
                  <td className="py-1 pr-2">
                    <select value={item.vat_rate} onChange={e => updateLine(i, 'vat_rate', parseFloat(e.target.value))} className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-slate-900">
                      <option value={20}>20%</option>
                      <option value={5}>5%</option>
                      <option value={0}>0%</option>
                    </select>
                  </td>
                  <td className="py-1 text-right font-medium">{formatCurrency(item.quantity * item.unit_price)}</td>
                  <td className="py-1 pl-2">
                    {lineItems.length > 1 && (
                      <button type="button" onClick={() => setLineItems(prev => prev.filter((_, idx) => idx !== i))} className="text-slate-500 hover:text-red-500">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" onClick={() => setLineItems(prev => [...prev, { description: '', quantity: 1, unit_price: 0, vat_rate: 20 }])} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700">
          <Plus className="w-4 h-4" /> Add line item
        </button>
        <div className="border-t border-slate-100 pt-3 space-y-1 max-w-xs ml-auto text-sm">
          <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span className="font-medium">{formatCurrency(subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">VAT</span><span className="font-medium">{formatCurrency(vatAmount)}</span></div>
          <div className="flex justify-between border-t border-slate-100 pt-1"><span className="font-semibold text-slate-700">Total</span><span className="font-bold text-slate-900 text-base">{formatCurrency(total)}</span></div>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <label className="block text-xs font-medium text-slate-500 mb-1">Notes</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none" />
      </div>

      <div className="flex justify-end gap-3">
        <Link href={`/quotes/${params.id}`} className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancel</Link>
        <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </div>
    </div>
  )
}
