'use client'
export const dynamic = 'force-dynamic'

// app/(dashboard)/quotes/new/page.tsx — v1.0
// UI only. Data via lib/api/quotes + lib/api/clients + lib/api/projects + lib/api/users.
// Calculations via lib/logic/quotes.

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { formatCurrency } from '@/lib/tax-calculations'
import { fetchCurrentUser } from '@/lib/api/users'
import { fetchClientsForDropdown, createClientRecord } from '@/lib/api/clients'
import { fetchProjectsForClient, createProject } from '@/lib/api/projects'
import { createQuote, createQuoteLineItems, fetchQuoteCount } from '@/lib/api/quotes'
import { calcQuoteSubtotal, calcQuoteVat, calcQuoteTotal, generateQuoteNumber } from '@/lib/logic/quotes'
import Link from 'next/link'
import { ArrowLeft, Plus, X } from 'lucide-react'

interface LineItem {
  description: string
  quantity: number
  unit_price: number
  vat_rate: number
}

export default function NewQuotePage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const defaultClient = searchParams.get('client') ?? ''

  const [clients, setClients]   = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [clientId, setClientId]   = useState(defaultClient)
  const [projectId, setProjectId] = useState('')
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10))
  const [expiryDate, setExpiryDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().slice(0, 10)
  })
  const [notes, setNotes]   = useState('')
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: '', quantity: 1, unit_price: 0, vat_rate: 20 },
  ])
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  // Inline create client state
  const [showNewClient, setShowNewClient]       = useState(false)
  const [newClientName, setNewClientName]       = useState('')
  const [newClientContact, setNewClientContact] = useState('')
  const [newClientEmail, setNewClientEmail]     = useState('')
  const [creatingClient, setCreatingClient]     = useState(false)

  // Inline create project state
  const [showNewProject, setShowNewProject]   = useState(false)
  const [newProjectTitle, setNewProjectTitle] = useState('')
  const [creatingProject, setCreatingProject] = useState(false)

  useEffect(() => { fetchClientsForDropdown().then(setClients) }, [])

  useEffect(() => {
    if (!clientId) { setProjects([]); return }
    fetchProjectsForClient(clientId).then(setProjects)
  }, [clientId])

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
      }
      setShowNewClient(false)
      setNewClientName(''); setNewClientContact(''); setNewClientEmail('')
    } catch (e) { console.error(e) }
    setCreatingClient(false)
  }

  async function handleCreateProject() {
    if (!newProjectTitle.trim() || !clientId) return
    setCreatingProject(true)
    try {
      const user = await fetchCurrentUser()
      const project = await createProject({
        user_id:   user?.id,
        client_id: clientId,
        title:     newProjectTitle.trim(),
        status:    'active',
      })
      if (project) {
        const updated = await fetchProjectsForClient(clientId)
        setProjects(updated)
        setProjectId(project.id)
      }
      setShowNewProject(false)
      setNewProjectTitle('')
    } catch (e) { console.error(e) }
    setCreatingProject(false)
  }

  function updateLine(i: number, field: keyof LineItem, value: string | number) {
    setLineItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item))
  }

  const selectedClient = clients.find(c => c.id === clientId)
  const clientWarning = selectedClient?.status === 'archived'
    ? `${selectedClient.name} is archived — are you sure you want to create a quote for them?`
    : selectedClient?.status === 'paused'
    ? `${selectedClient.name} is paused — you may want to check before sending this quote.`
    : null

  const subtotal  = calcQuoteSubtotal(lineItems)
  const vatAmount = calcQuoteVat(lineItems)
  const total     = calcQuoteTotal(lineItems)

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const user = await fetchCurrentUser()
      if (!user) return

      const count       = await fetchQuoteCount(user.id)
      const quoteNumber = generateQuoteNumber(count)

      const quote = await createQuote({
        user_id:      user.id,
        client_id:    clientId  || null,
        project_id:   projectId || null,
        quote_number: quoteNumber,
        status:       'draft',
        issue_date:   issueDate,
        expiry_date:  expiryDate,
        notes:        notes || null,
        subtotal,
        vat_amount:   vatAmount,
        total,
      })

      await createQuoteLineItems(
        lineItems.map(l => ({
          quote_id:    quote.id,
          description: l.description,
          quantity:    l.quantity,
          unit_price:  l.unit_price,
          vat_rate:    l.vat_rate,
          line_total:  l.quantity * l.unit_price,
        }))
      )

      router.push(`/quotes/${quote.id}`)
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong')
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-6 pb-12">
      <div>
        <Link href="/quotes" className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-3">
          <ArrowLeft className="w-4 h-4" /> Back to quotes
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">New quote</h1>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}

      {/* Quote details */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <h2 className="font-semibold text-slate-800">Quote details</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Client</label>
            <select
              value={clientId}
              onChange={e => {
                if (e.target.value === '__new__') { setShowNewClient(true) }
                else { setClientId(e.target.value); setShowNewClient(false) }
              }}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="">Select client...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              <option value="__new__">+ Create new client</option>
            </select>
            {showNewClient && (
              <div className="mt-2 border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-2">
                <p className="text-xs font-semibold text-slate-700 mb-1">New client</p>
                <input
                  value={newClientName}
                  onChange={e => setNewClientName(e.target.value)}
                  placeholder="Company / client name *"
                  className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
                />
                <input
                  value={newClientContact}
                  onChange={e => setNewClientContact(e.target.value)}
                  placeholder="Contact name"
                  className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
                />
                <input
                  value={newClientEmail}
                  onChange={e => setNewClientEmail(e.target.value)}
                  placeholder="Email"
                  type="email"
                  className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
                />
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCreateClient}
                    disabled={!newClientName.trim() || creatingClient}
                    className="px-3 py-1.5 bg-slate-900 text-white rounded text-xs font-medium hover:bg-slate-800 disabled:opacity-50"
                  >
                    {creatingClient ? 'Saving...' : 'Save client'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowNewClient(false); setNewClientName(''); setNewClientContact(''); setNewClientEmail('') }}
                    className="px-3 py-1.5 border border-slate-200 rounded text-xs text-slate-600 hover:bg-white"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Project</label>
            <select
              value={projectId}
              onChange={e => {
                if (e.target.value === '__new_project__') { setShowNewProject(true) }
                else { setProjectId(e.target.value); setShowNewProject(false) }
              }}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="">No project</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
              {clientId && <option value="__new_project__">+ Add project</option>}
            </select>
            {showNewProject && (
              <div className="mt-2 border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-2">
                <p className="text-xs font-semibold text-slate-700 mb-1">New project</p>
                <input
                  value={newProjectTitle}
                  onChange={e => setNewProjectTitle(e.target.value)}
                  placeholder="Project name *"
                  className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
                />
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCreateProject}
                    disabled={!newProjectTitle.trim() || creatingProject}
                    className="px-3 py-1.5 bg-slate-900 text-white rounded text-xs font-medium hover:bg-slate-800 disabled:opacity-50"
                  >
                    {creatingProject ? 'Saving...' : 'Save project'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowNewProject(false); setNewProjectTitle('') }}
                    className="px-3 py-1.5 border border-slate-200 rounded text-xs text-slate-600 hover:bg-white"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
          {clientWarning && (
            <div className="col-span-2 px-4 py-3 rounded-lg text-sm font-medium"
              style={{ background: selectedClient?.status === 'archived' ? '#FDECEA' : '#FEF9E7', color: selectedClient?.status === 'archived' ? '#C0392B' : '#9A7B0A', border: `1px solid ${selectedClient?.status === 'archived' ? '#F5C0BB' : '#F5E29B'}` }}>
              {clientWarning}
            </div>
          )}
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
                  <td className="py-1 pr-2"><input type="number" step="0.01" placeholder="0.00" value={item.unit_price || ''} onChange={e => updateLine(i, 'unit_price', parseFloat(e.target.value) || 0)} className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-slate-900" /></td>
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
                      <button type="button" onClick={() => setLineItems(prev => prev.filter((_, idx) => idx !== i))} className="text-slate-300 hover:text-red-500">
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
        <Link href="/quotes" className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancel</Link>
        <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save quote'}
        </button>
      </div>
    </div>
  )
}
