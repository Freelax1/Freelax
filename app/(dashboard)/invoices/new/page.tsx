'use client'
export const dynamic = 'force-dynamic'

// app/(dashboard)/invoices/new/page.tsx — v1.3
// Tasks 13 (auto-save draft every 10s) + 16 (inline create client)

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { formatCurrency } from '@/lib/tax-calculations'
import { fetchCurrentUser } from '@/lib/api/users'
import { fetchClientsForDropdown, createClientRecord } from '@/lib/api/clients'
import { fetchProjectsForClient } from '@/lib/api/projects'
import { createInvoice, updateInvoice, createInvoiceLineItems, deleteInvoiceLineItems, fetchMaxInvoiceNumber } from '@/lib/api/invoices'
import { calcSubtotal, calcVatAmount, calcTotal, generateInvoiceNumber } from '@/lib/logic/invoices'
import AIFlag from '@/components/ai-flag'
import { Sparkles, Plus, X, ChevronDown } from 'lucide-react'

interface LineItem {
  description: string
  quantity: number
  unit_price: number
  vat_rate: number
}

export default function NewInvoicePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const defaultClient = searchParams.get('client')

  const [clients, setClients]     = useState<any[]>([])
  const [projects, setProjects]   = useState<any[]>([])
  const [clientId, setClientId]   = useState(defaultClient ?? '')
  const [projectId, setProjectId] = useState('')
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10))
  const [dueDate, setDueDate]     = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().slice(0, 10)
  })
  const [paymentTerms, setPaymentTerms] = useState('Payment due within 30 days')
  const [notes, setNotes]               = useState('')
  const [lineItems, setLineItems]       = useState<LineItem[]>([
    { description: '', quantity: 1, unit_price: 0, vat_rate: 20 },
  ])
  const [saving, setSaving]     = useState(false)
  const [aiInput, setAiInput]   = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [showAI, setShowAI]     = useState(false)
  const [lineItemsFromAI, setLineItemsFromAI] = useState(false)

  // Auto-save state
  const [draftId, setDraftId]           = useState<string | null>(null)
  const [lastSavedAt, setLastSavedAt]   = useState<Date | null>(null)
  const [autoSaving, setAutoSaving]     = useState(false)
  const lastSavedFormRef                = useRef<string>('')

  // Inline create client state
  const [showNewClient, setShowNewClient]   = useState(false)
  const [newClientName, setNewClientName]   = useState('')
  const [newClientContact, setNewClientContact] = useState('')
  const [newClientEmail, setNewClientEmail] = useState('')
  const [creatingClient, setCreatingClient] = useState(false)

  useEffect(() => {
    fetchClientsForDropdown().then(setClients)
  }, [])

  useEffect(() => {
    if (!clientId) { setProjects([]); return }
    fetchProjectsForClient(clientId).then(setProjects)
  }, [clientId])

  // Auto-save every 10s when clientId is set and there are unsaved changes
  useEffect(() => {
    if (!clientId) return
    const interval = setInterval(async () => {
      const formSnapshot = JSON.stringify({ clientId, projectId, issueDate, dueDate, paymentTerms, notes, lineItems })
      if (formSnapshot === lastSavedFormRef.current) return
      setAutoSaving(true)
      await saveDraft()
      lastSavedFormRef.current = formSnapshot
      setAutoSaving(false)
    }, 10000)
    return () => clearInterval(interval)
  }, [clientId, projectId, issueDate, dueDate, paymentTerms, notes, lineItems, draftId])

  async function saveDraft() {
    const user = await fetchCurrentUser()
    if (!user) return
    const subtotal_  = calcSubtotal(lineItems)
    const vatAmount_ = calcVatAmount(lineItems)
    const total_     = calcTotal(lineItems)

    if (draftId) {
      await updateInvoice(draftId, {
        client_id: clientId || null, project_id: projectId || null,
        issue_date: issueDate, due_date: dueDate,
        payment_terms: paymentTerms, notes: notes || null,
        subtotal: subtotal_, vat_amount: vatAmount_, total: total_,
      })
      await deleteInvoiceLineItems(draftId)
      await createInvoiceLineItems(lineItems.map(l => ({
        invoice_id: draftId, description: l.description,
        quantity: l.quantity, unit_price: l.unit_price,
        vat_rate: l.vat_rate, line_total: l.quantity * l.unit_price,
      })))
    } else {
      const maxNumber     = await fetchMaxInvoiceNumber(user.id)
      const invoiceNumber = generateInvoiceNumber(maxNumber)
      const invoice = await createInvoice({
        user_id: user.id, client_id: clientId || null, project_id: projectId || null,
        invoice_number: invoiceNumber, status: 'draft',
        issue_date: issueDate, due_date: dueDate,
        payment_terms: paymentTerms, notes: notes || null,
        subtotal: subtotal_, vat_amount: vatAmount_, total: total_,
      })
      if (invoice) {
        setDraftId(invoice.id)
        await createInvoiceLineItems(lineItems.map(l => ({
          invoice_id: invoice.id, description: l.description,
          quantity: l.quantity, unit_price: l.unit_price,
          vat_rate: l.vat_rate, line_total: l.quantity * l.unit_price,
        })))
      }
    }
    setLastSavedAt(new Date())
    window.dispatchEvent(new Event('fd:data-invalidate'))
  }

  async function handleCreateClient() {
    if (!newClientName.trim()) return
    setCreatingClient(true)
    try {
      const user = await fetchCurrentUser()
      const client = await createClientRecord({
        user_id:      user?.id,
        name:         newClientName.trim(),
        contact_name: newClientContact.trim() || null,
        email:        newClientEmail.trim() || null,
        status:       'active',
      })
      if (client) {
        const updated = await fetchClientsForDropdown()
        setClients(updated)
        setClientId(client.id)
        window.dispatchEvent(new Event('fd:data-invalidate'))
      }
      setShowNewClient(false)
      setNewClientName(''); setNewClientContact(''); setNewClientEmail('')
    } catch (e) { console.error(e) }
    setCreatingClient(false)
  }

  function updateLine(i: number, field: keyof LineItem, value: string | number) {
    setLineItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item))
  }
  function addLine() {
    setLineItems(prev => [...prev, { description: '', quantity: 1, unit_price: 0, vat_rate: 20 }])
  }
  function removeLine(i: number) {
    setLineItems(prev => prev.filter((_, idx) => idx !== i))
  }

  const selectedClient = clients.find(c => c.id === clientId)
  const clientWarning  = selectedClient?.status === 'archived'
    ? `${selectedClient.name} is archived — are you sure you want to invoice them?`
    : selectedClient?.status === 'paused'
    ? `${selectedClient.name} is paused — check before issuing this invoice.`
    : null

  const subtotal  = calcSubtotal(lineItems)
  const vatAmount = calcVatAmount(lineItems)
  const total     = calcTotal(lineItems)

  async function handleAIAssist() {
    setAiLoading(true)
    try {
      const res = await fetch('/api/ai/invoice-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userInput: aiInput, clientId, projectId }),
      })
      const data = await res.json()
      if (data.line_items) {
        setLineItems(data.line_items)
        setLineItemsFromAI(true)
        if (data.suggested_payment_terms) setPaymentTerms(data.suggested_payment_terms)
        if (data.notes) setNotes(data.notes)
      }
      setShowAI(false)
      setAiInput('')
    } catch (e) { console.error(e) }
    setAiLoading(false)
  }

  async function handleSave(sendAfter = false) {
    setSaving(true)
    const user = await fetchCurrentUser()
    if (!user) return

    let invoiceId = draftId
    if (invoiceId) {
      await updateInvoice(invoiceId, {
        client_id: clientId || null, project_id: projectId || null,
        status: sendAfter ? 'sent' : 'draft',
        issue_date: issueDate, due_date: dueDate,
        payment_terms: paymentTerms, notes: notes || null,
        subtotal, vat_amount: vatAmount, total,
      })
      await deleteInvoiceLineItems(invoiceId)
    } else {
      const maxNumber     = await fetchMaxInvoiceNumber(user.id)
      const invoiceNumber = generateInvoiceNumber(maxNumber)
      const invoice = await createInvoice({
        user_id: user.id, client_id: clientId || null, project_id: projectId || null,
        invoice_number: invoiceNumber, status: sendAfter ? 'sent' : 'draft',
        issue_date: issueDate, due_date: dueDate,
        payment_terms: paymentTerms, notes: notes || null,
        subtotal, vat_amount: vatAmount, total,
      })
      invoiceId = invoice?.id ?? null
    }

    if (invoiceId) {
      await createInvoiceLineItems(lineItems.map(l => ({
        invoice_id: invoiceId!, description: l.description,
        quantity: l.quantity, unit_price: l.unit_price,
        vat_rate: l.vat_rate, line_total: l.quantity * l.unit_price,
      })))
      if (sendAfter) {
        await fetch('/api/invoices/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ invoiceId }),
        })
      }
      window.dispatchEvent(new Event('fd:data-invalidate'))
      router.push(`/invoices/${invoiceId}`)
    }
    setSaving(false)
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">New Invoice</h1>
          {lastSavedAt && (
            <p className="text-xs text-slate-400 mt-1">
              {autoSaving ? 'Saving...' : `Draft saved ${lastSavedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`}
            </p>
          )}
          {!lastSavedAt && clientId && (
            <p className="text-xs text-slate-400 mt-1">Auto-saves every 10s once a client is selected</p>
          )}
        </div>
        <button
          onClick={() => setShowAI(!showAI)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-50 border border-purple-200 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-100 transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          AI Invoice Assistant
        </button>
      </div>

      {/* AI Assistant */}
      {showAI && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <p className="text-sm font-medium text-purple-800 mb-2">Describe what you want to invoice for</p>
          <textarea
            value={aiInput}
            onChange={e => setAiInput(e.target.value)}
            placeholder="e.g. 3 days of React development at £600/day, plus a half day for code review"
            className="w-full px-3 py-2 border border-purple-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-400 h-20 resize-none"
          />
          <div className="flex justify-end gap-2 mt-2">
            <button onClick={() => setShowAI(false)} className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-700">Cancel</button>
            <button
              onClick={handleAIAssist}
              disabled={!aiInput.trim() || aiLoading}
              className="px-4 py-1.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
            >
              {aiLoading ? 'Generating...' : 'Generate line items'}
            </button>
          </div>
        </div>
      )}

      {/* Invoice details */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <h2 className="font-semibold text-slate-800">Invoice Details</h2>
        <div className="grid grid-cols-2 gap-4">
          {/* Client with inline create */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Client</label>
            <div className="relative">
              <select
                value={clientId}
                onChange={e => {
                  if (e.target.value === '__new__') { setShowNewClient(true) }
                  else { setClientId(e.target.value); setShowNewClient(false) }
                }}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
              >
                <option value="">Select client...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                <option value="__new__">+ Create new client</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
            {showNewClient && (
              <div className="mt-2 border border-blue-200 rounded-lg p-3 bg-blue-50 space-y-2">
                <p className="text-xs font-semibold text-blue-700 mb-1">New client</p>
                <input
                  value={newClientName}
                  onChange={e => setNewClientName(e.target.value)}
                  placeholder="Company / client name *"
                  className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                />
                <input
                  value={newClientContact}
                  onChange={e => setNewClientContact(e.target.value)}
                  placeholder="Contact name"
                  className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                />
                <input
                  value={newClientEmail}
                  onChange={e => setNewClientEmail(e.target.value)}
                  placeholder="Email"
                  type="email"
                  className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                />
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleCreateClient}
                    disabled={!newClientName.trim() || creatingClient}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {creatingClient ? 'Saving...' : 'Save client'}
                  </button>
                  <button
                    onClick={() => { setShowNewClient(false); setNewClientName(''); setNewClientContact(''); setNewClientEmail('') }}
                    className="px-3 py-1.5 border border-slate-200 rounded text-xs text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Project</label>
            <select value={projectId} onChange={e => setProjectId(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select project...</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>
          {clientWarning && (
            <div className="col-span-2 px-4 py-3 rounded-lg text-sm font-medium bg-amber-50 text-amber-800 border border-amber-200">
              {clientWarning}
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Issue date</label>
            <input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Due date</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-500 mb-1">Payment terms</label>
            <input value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
      </div>

      {/* Line items */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Line Items</h2>
          {lineItemsFromAI && <AIFlag />}
        </div>
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
            <tbody className="space-y-2">
              {lineItems.map((item, i) => (
                <tr key={i}>
                  <td className="py-1 pr-2">
                    <input value={item.description} onChange={e => updateLine(i, 'description', e.target.value)} placeholder="Description" className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </td>
                  <td className="py-1 pr-2">
                    <input type="number" value={item.quantity} onChange={e => updateLine(i, 'quantity', parseFloat(e.target.value) || 0)} className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </td>
                  <td className="py-1 pr-2">
                    <input type="number" value={item.unit_price} onChange={e => updateLine(i, 'unit_price', parseFloat(e.target.value) || 0)} className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </td>
                  <td className="py-1 pr-2">
                    <select value={item.vat_rate} onChange={e => updateLine(i, 'vat_rate', parseFloat(e.target.value))} className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                      <option value={20}>20%</option>
                      <option value={5}>5%</option>
                      <option value={0}>0%</option>
                    </select>
                  </td>
                  <td className="py-1 text-right font-medium">{formatCurrency(item.quantity * item.unit_price)}</td>
                  <td className="py-1 pl-2">
                    {lineItems.length > 1 && (
                      <button onClick={() => removeLine(i)} className="text-slate-300 hover:text-red-500 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button onClick={addLine} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700">
          <Plus className="w-4 h-4" /> Add line item
        </button>

        {/* Totals */}
        <div className="border-t border-slate-100 pt-3 space-y-1 max-w-xs ml-auto text-sm">
          <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span className="font-medium">{formatCurrency(subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">VAT</span><span className="font-medium">{formatCurrency(vatAmount)}</span></div>
          <div className="flex justify-between border-t border-slate-100 pt-1"><span className="font-semibold text-slate-700">Total</span><span className="font-bold text-slate-900 text-base">{formatCurrency(total)}</span></div>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <label className="block text-xs font-medium text-slate-500 mb-1">Notes</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <button onClick={() => router.back()} className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
          Cancel
        </button>
        <button onClick={() => handleSave(false)} disabled={saving} className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          Save as draft
        </button>
        <button onClick={() => handleSave(true)} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'Saving...' : 'Send invoice'}
        </button>
      </div>
    </div>
  )
}
