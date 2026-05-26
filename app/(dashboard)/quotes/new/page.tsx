'use client'
export const dynamic = 'force-dynamic'

// app/(dashboard)/quotes/new/page.tsx — v1.0
// UI only. Data via lib/api/quotes + lib/api/clients + lib/api/projects + lib/api/users.
// Calculations via lib/logic/quotes.

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { formatCurrency } from '@/lib/tax-calculations'
import { fetchCurrentUser, fetchUserDefaults } from '@/lib/api/users'
import { fetchClientsForDropdown, createClientRecord } from '@/lib/api/clients'
import { fetchProjectsForClient, createProject } from '@/lib/api/projects'
import { createQuote, createQuoteLineItems, fetchQuoteCount } from '@/lib/api/quotes'
import { calcQuoteSubtotal, calcQuoteVat, calcQuoteTotal, generateQuoteNumber } from '@/lib/logic/quotes'
import Link from 'next/link'
import Button from '@/components/ui/button'
import Alert from '@/components/ui/alert'
import { ArrowLeft, Plus, X } from '@phosphor-icons/react'
import { sectionTitle } from '@/lib/typography'
import type { Client, Project } from '@/types/database'
import { Input, Select, Textarea, Field } from '@/components/form-fields'
import { IconButton } from '@/components/ui/icon-button'

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

  const [clients, setClients]   = useState<Pick<Client, 'id' | 'name' | 'status'>[]>([])
  const [projects, setProjects] = useState<Pick<Project, 'id' | 'title'>[]>([])
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

  const [quotePrefix, setQuotePrefix] = useState('QUO')
  const [defaultsLoaded, setDefaultsLoaded] = useState(false)

  useEffect(() => { fetchClientsForDropdown().then(setClients) }, [])

  useEffect(() => {
    fetchCurrentUser().then(user => {
      if (!user) return
      fetchUserDefaults(user.id).then(defaults => {
        if (!defaults) return
        if (defaults.quote_prefix) setQuotePrefix(defaults.quote_prefix)
        if (defaults.quote_default_notes && !defaultsLoaded) setNotes(defaults.quote_default_notes)
        if (defaults.quote_validity_days && !defaultsLoaded) {
          const d = new Date()
          d.setDate(d.getDate() + defaults.quote_validity_days)
          setExpiryDate(d.toISOString().slice(0, 10))
        }
        setDefaultsLoaded(true)
      })
    })
  }, [])

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
      const quoteNumber = generateQuoteNumber(count, quotePrefix || 'QUO')

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
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div>
        <Link href="/quotes" className="flex items-center gap-1 text-sm text-text-muted hover:text-text-secondary mb-3">
          <ArrowLeft weight="regular" className="w-4 h-4" /> Back to quotes
        </Link>
        <h1 className="text-2xl font-serif font-normal text-text-primary tracking-normal leading-heading">New quote</h1>
      </div>

      {error && <Alert intent="danger">{error}</Alert>}

      {/* Quote details */}
      <div className="bg-surface-card rounded-xl border border-border-default p-6 space-y-4">
        <h2 className={sectionTitle}>Quote details</h2>
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
                <div className="mt-2 border border-border-default rounded-xl p-3 bg-surface-sunken space-y-2">
                  <p className="text-xs font-semibold text-text-secondary mb-1">New client</p>
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
                <option value="">No project</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                {clientId && <option value="__new_project__">+ Add project</option>}
              </Select>
              {showNewProject && (
                <div className="mt-2 border border-border-default rounded-xl p-3 bg-surface-sunken space-y-2">
                  <p className="text-xs font-semibold text-text-secondary mb-1">New project</p>
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
            <div className="col-span-2 px-4 py-3 rounded-xl text-sm font-medium"
              style={{ background: selectedClient?.status === 'archived' ? 'var(--danger-50)' : 'var(--warning-50)', color: selectedClient?.status === 'archived' ? 'var(--danger-600)' : 'var(--warning-600)', border: `1px solid ${selectedClient?.status === 'archived' ? 'var(--danger-200)' : 'var(--warning-200)'}` }}>
              {clientWarning}
            </div>
          )}
          <Field label="Issue date">
            <Input aria-label="Issue date" type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} />
          </Field>
          <Field label="Valid until">
            <Input aria-label="Expiry date" type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} />
          </Field>
        </div>
      </div>

      {/* Line items */}
      <div className="bg-surface-card rounded-xl border border-border-default p-6 space-y-3">
        <h2 className={sectionTitle}>Line items</h2>
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
            <tbody>
              {lineItems.map((item, i) => (
                <tr key={i}>
                  <td className="py-1 pr-2"><Input variant="inline" aria-label="Line item description" value={item.description} onChange={e => updateLine(i, 'description', e.target.value)} placeholder="Description" /></td>
                  <td className="py-1 pr-2"><Input variant="inline" aria-label="Line item quantity" type="number" value={item.quantity} onChange={e => updateLine(i, 'quantity', parseFloat(e.target.value) || 0)} /></td>
                  <td className="py-1 pr-2"><Input variant="inline" aria-label="Line item unit price" type="number" step="0.01" placeholder="0.00" value={item.unit_price || ''} onChange={e => updateLine(i, 'unit_price', parseFloat(e.target.value) || 0)} /></td>
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
                        onClick={() => setLineItems(prev => prev.filter((_, idx) => idx !== i))}
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
        <Button
          type="button"
          intent="ghost"
          size="sm"
          className="-ml-2"
          onClick={() => setLineItems(prev => [...prev, { description: '', quantity: 1, unit_price: 0, vat_rate: 20 }])}
        >
          <Plus weight="regular" className="w-3.5 h-3.5" /> Add line item
        </Button>
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

      <div className="flex justify-end gap-3">
        <Link href="/quotes" className="px-4 py-2 border border-border-default rounded-lg text-sm text-text-secondary hover:bg-surface-sunken">Cancel</Link>
        <Button type="button" intent="primary" size="md" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save quote'}
        </Button>
      </div>
    </div>
  )
}
