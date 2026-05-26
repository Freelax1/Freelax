'use client'
export const dynamic = 'force-dynamic'

// app/(dashboard)/invoices/new/page.tsx — v1.3
// Tasks 13 (auto-save draft every 10s) + 16 (inline create client)

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { formatCurrency } from '@/lib/tax-calculations'
import { fetchCurrentUser, fetchUserDefaults } from '@/lib/api/users'
import { fetchClientsForDropdown, createClientRecord } from '@/lib/api/clients'
import { fetchProjectsForClient, createProject } from '@/lib/api/projects'
import { createInvoice, updateInvoice, createInvoiceLineItems, deleteInvoiceLineItems, fetchMaxInvoiceNumber } from '@/lib/api/invoices'
import { calcSubtotal, calcVatAmount, calcTotal, generateInvoiceNumber } from '@/lib/logic/invoices'
import AIFlag from '@/components/ai-flag'
import Button from '@/components/ui/button'
import Alert from '@/components/ui/alert'
import { Sparkle, Plus, X, ArrowLeft } from '@phosphor-icons/react'
import type { Client, Project } from '@/types/database'
import { Input, Select, Textarea, Field } from '@/components/form-fields'
import { IconButton } from '@/components/ui/icon-button'
import Link from 'next/link'
import { sectionTitle } from '@/lib/typography'

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

  const [clients, setClients]     = useState<Pick<Client, 'id' | 'name' | 'status'>[]>([])
  const [projects, setProjects]   = useState<Pick<Project, 'id' | 'title'>[]>([])
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
  const [aiCooldown, setAiCooldown] = useState(false)
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

  // Inline create project state
  const [showNewProject, setShowNewProject]   = useState(false)
  const [newProjectTitle, setNewProjectTitle] = useState('')
  const [creatingProject, setCreatingProject] = useState(false)

  const [invoicePrefix, setInvoicePrefix] = useState('INV')
  const [defaultsLoaded, setDefaultsLoaded] = useState(false)

  useEffect(() => {
    fetchClientsForDropdown().then(setClients)
  }, [])

  useEffect(() => {
    fetchCurrentUser().then(user => {
      if (!user) return
      fetchUserDefaults(user.id).then(defaults => {
        if (!defaults) return
        if (defaults.invoice_prefix) setInvoicePrefix(defaults.invoice_prefix)
        if (defaults.invoice_default_notes && !defaultsLoaded) {
          setNotes(defaults.invoice_default_notes)
        }
        setDefaultsLoaded(true)
      })
    })
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
      try {
        await saveDraft()
        lastSavedFormRef.current = formSnapshot
      } finally {
        setAutoSaving(false)
      }
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
      const invoiceNumber = generateInvoiceNumber(maxNumber, invoicePrefix || 'INV')
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
        window.dispatchEvent(new Event('fd:data-invalidate'))
      }
      setShowNewProject(false)
      setNewProjectTitle('')
    } catch (e) { console.error(e) }
    setCreatingProject(false)
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
    setAiCooldown(true)
    setTimeout(() => setAiCooldown(false), 15000)
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
      const invoiceNumber = generateInvoiceNumber(maxNumber, invoicePrefix || 'INV')
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
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div>
        <Link href="/invoices" className="flex items-center gap-1 text-sm text-text-muted hover:text-text-secondary mb-3">
          <ArrowLeft weight="regular" className="w-4 h-4" /> Back to invoices
        </Link>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-serif font-normal text-text-primary tracking-normal leading-heading">New invoice</h1>
            {lastSavedAt && (
              <p className="text-xs text-text-secondary mt-1">
                {autoSaving ? 'Saving...' : `Draft saved ${lastSavedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`}
              </p>
            )}
            {!lastSavedAt && clientId && (
              <p className="text-xs text-text-secondary mt-1">Auto-saves every 10s once a client is selected</p>
            )}
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => setShowAI(!showAI)}
            aria-expanded={showAI}
            className="bg-forest-50 border border-forest-200 text-forest-700 hover:bg-forest-100 hover:border-forest-300 focus-visible:ring-forest-500/30 shrink-0"
          >
            <Sparkle weight="regular" className="w-4 h-4" />
            AI Invoice Assistant
          </Button>
        </div>
      </div>

      {/* AI Assistant */}
      {showAI && (
        <Alert intent="info" className="p-4">
          <Field label="Describe what you want to invoice for">
            <Textarea
              value={aiInput}
              onChange={e => setAiInput(e.target.value)}
              placeholder="e.g. 3 days of React development at £600/day, plus a half day for code review"
              className="h-20"
            />
          </Field>
          <div className="flex justify-end gap-2 mt-3">
            <Button type="button" intent="ghost" size="sm" onClick={() => setShowAI(false)}>Cancel</Button>
            <Button type="button" intent="primary" size="sm" onClick={handleAIAssist} disabled={!aiInput.trim() || aiLoading || aiCooldown}>
              {aiLoading ? 'Generating...' : 'Generate line items'}
            </Button>
          </div>
        </Alert>
      )}

      {/* Invoice details */}
      <div className="bg-surface-card rounded-xl border border-border-default p-6 space-y-4">
        <h2 className={sectionTitle}>Invoice details</h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Client">
            <>
              <Select
                aria-label="Client"
                value={clientId}
                onChange={e => {
                  if (e.target.value === '__new__') { setShowNewClient(true) }
                  else { setClientId(e.target.value); setShowNewClient(false) }
                }}
              >
                <option value="">Select client...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                <option value="__new__">+ Create new client</option>
              </Select>
              {showNewClient && (
                <div className="mt-2 border border-forest-200 rounded-xl p-3 bg-forest-50 space-y-2">
                  <p className="text-xs font-semibold text-forest-700 mb-1">New client</p>
                  <Input variant="inline" aria-label="New client name" value={newClientName} onChange={e => setNewClientName(e.target.value)} placeholder="Company / client name *" />
                  <Input variant="inline" aria-label="New client contact name" value={newClientContact} onChange={e => setNewClientContact(e.target.value)} placeholder="Contact name" />
                  <Input variant="inline" aria-label="New client email" value={newClientEmail} onChange={e => setNewClientEmail(e.target.value)} placeholder="Email" type="email" />
                  <div className="flex gap-2 pt-1">
                    <Button type="button" intent="primary" size="xs" onClick={handleCreateClient} disabled={!newClientName.trim() || creatingClient}>
                      {creatingClient ? 'Saving...' : 'Save client'}
                    </Button>
                    <Button
                      type="button"
                      intent="secondary"
                      size="xs"
                      onClick={() => { setShowNewClient(false); setNewClientName(''); setNewClientContact(''); setNewClientEmail('') }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </>
          </Field>
          <Field label="Project">
            <>
              <Select
                aria-label="Project"
                value={projectId}
                onChange={e => {
                  if (e.target.value === '__new_project__') { setShowNewProject(true) }
                  else { setProjectId(e.target.value); setShowNewProject(false) }
                }}
              >
                <option value="">Select project...</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                {clientId && <option value="__new_project__">+ Add project</option>}
              </Select>
              {showNewProject && (
                <div className="mt-2 border border-forest-200 rounded-xl p-3 bg-forest-50 space-y-2">
                  <p className="text-xs font-semibold text-forest-700 mb-1">New project</p>
                  <Input variant="inline" aria-label="New project name" value={newProjectTitle} onChange={e => setNewProjectTitle(e.target.value)} placeholder="Project name *" />
                  <div className="flex gap-2 pt-1">
                    <Button type="button" intent="primary" size="xs" onClick={handleCreateProject} disabled={!newProjectTitle.trim() || creatingProject}>
                      {creatingProject ? 'Saving...' : 'Save project'}
                    </Button>
                    <Button type="button" intent="secondary" size="xs" onClick={() => { setShowNewProject(false); setNewProjectTitle('') }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </>
          </Field>
          {clientWarning && (
            <div className="col-span-2 px-4 py-3 rounded-xl text-sm font-medium bg-warning-50 text-warning-800 border border-warning-200">
              {clientWarning}
            </div>
          )}
          <Field label="Issue date">
            <Input aria-label="Issue date" type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} />
          </Field>
          <Field label="Due date">
            <Input aria-label="Due date" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </Field>
          <Field label="Payment terms" className="col-span-2">
            <Input aria-label="Payment terms" value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} />
          </Field>
        </div>
      </div>

      {/* Line items */}
      <div className="bg-surface-card rounded-xl border border-border-default p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className={sectionTitle}>Line items</h2>
          {lineItemsFromAI && <AIFlag />}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-muted border-b border-border-subtle">
                <th className="pb-2 font-medium w-1/2">Description</th>
                <th className="pb-2 font-medium w-16">Qty</th>
                <th className="pb-2 font-medium w-24">Price (£)</th>
                <th className="pb-2 font-medium w-16">VAT%</th>
                <th className="pb-2 font-medium w-20 text-right">Total</th>
                <th className="pb-2 w-8"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="space-y-2">
              {lineItems.map((item, i) => (
                <tr key={i}>
                  <td className="py-1 pr-2">
                    <Input variant="inline" aria-label="Line item description" value={item.description} onChange={e => updateLine(i, 'description', e.target.value)} placeholder="Description" />
                  </td>
                  <td className="py-1 pr-2">
                    <Input variant="inline" aria-label="Line item quantity" type="number" value={item.quantity} onChange={e => updateLine(i, 'quantity', parseFloat(e.target.value) || 0)} />
                  </td>
                  <td className="py-1 pr-2">
                    <Input variant="inline" aria-label="Line item unit price" type="number" placeholder="0.00" value={item.unit_price || ''} onChange={e => updateLine(i, 'unit_price', parseFloat(e.target.value) || 0)} />
                  </td>
                  <td className="py-1 pr-2">
                    <Select variant="inline" aria-label="Line item VAT rate" value={item.vat_rate} onChange={e => updateLine(i, 'vat_rate', parseFloat(e.target.value))}>
                      <option value={20}>20%</option>
                      <option value={5}>5%</option>
                      <option value={0}>0%</option>
                    </Select>
                  </td>
                  <td className="py-1 text-right font-medium">{formatCurrency(item.quantity * item.unit_price)}</td>
                  <td className="py-1 pl-2">
                    {lineItems.length > 1 && (
                      <IconButton
                        label="Remove line"
                        onClick={() => removeLine(i)}
                        className="hover:bg-transparent text-text-muted hover:text-danger-500"
                        icon={<X weight="regular" className="w-4 h-4" />}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Button type="button" intent="ghost" size="sm" className="-ml-2" onClick={addLine}>
          <Plus weight="regular" className="w-3.5 h-3.5" /> Add line item
        </Button>

        {/* Totals */}
        <div className="border-t border-border-subtle pt-3 space-y-1 max-w-xs ml-auto text-sm">
          <div className="flex justify-between"><span className="text-text-muted">Subtotal</span><span className="font-medium">{formatCurrency(subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-text-muted">VAT</span><span className="font-medium">{formatCurrency(vatAmount)}</span></div>
          <div className="flex justify-between border-t border-border-subtle pt-1"><span className="font-semibold text-text-secondary">Total</span><span className="font-semibold text-text-primary text-base">{formatCurrency(total)}</span></div>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-surface-card rounded-xl border border-border-default p-6">
        <Field label="Notes">
          <Textarea aria-label="Notes" value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
        </Field>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button type="button" intent="secondary" size="md" onClick={() => router.back()}>Cancel</Button>
        <Button type="button" intent="outline" size="md" onClick={() => handleSave(false)} disabled={saving}>
          Save as draft
        </Button>
        <Button type="button" intent="primary" size="md" onClick={() => handleSave(true)} disabled={saving}>
          {saving ? 'Saving...' : 'Send invoice'}
        </Button>
      </div>
    </div>
  )
}
