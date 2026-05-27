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
import Button from '@/components/ui/button'
import Alert from '@/components/ui/alert'
import { Plus, X } from '@phosphor-icons/react'
import type { Client, Project, QuoteLineItem } from '@/types/database'
import { Input, Select, Textarea, Field } from '@/components/form-fields'
import { IconButton } from '@/components/ui/icon-button'
import PageHeader from '@/components/ui/page-header'
import { FormPageSkeleton, FormSection, FormFooter, FormCancelLink } from '@/components/ui'
import PageLayout from '@/components/page-layout'

interface LineItem {
  description: string
  quantity: number
  unit_price: number
  vat_rate: number
}

export default function EditQuotePage() {
  const params = useParams<{ id: string }>()
  const router  = useRouter()

  const [clients, setClients]   = useState<Pick<Client, 'id' | 'name' | 'status'>[]>([])
  const [projects, setProjects] = useState<Pick<Project, 'id' | 'title'>[]>([])
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
    fetchQuoteById(params.id)
      .then(q => {
        if (!q) {
          setError('Quote not found')
          return
        }
        setClientId(q.client_id ?? '')
        setProjectId(q.project_id ?? '')
        setIssueDate(q.issue_date)
        setExpiryDate(q.expiry_date)
        setNotes(q.notes ?? '')
        setLineItems((q.quote_line_items as QuoteLineItem[] | undefined ?? []).map((l) => ({
          description: l.description,
          quantity:    l.quantity,
          unit_price:  l.unit_price,
          vat_rate:    l.vat_rate,
        })))
      })
      .catch(() => setError('Failed to load quote'))
      .finally(() => setLoading(false))
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

  if (loading) {
    return (
      <PageLayout width="document">
        <FormPageSkeleton />
      </PageLayout>
    )
  }

  return (
    <PageLayout width="document" className="space-y-6">
      <PageHeader
        back={{ href: `/quotes/${params.id}`, label: 'Back to quote' }}
        title="Edit quote"
      />

      {error && <Alert intent="danger">{error}</Alert>}

      <FormSection title="Quote details">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Client">
            <Select value={clientId} onChange={e => setClientId(e.target.value)}>
              <option value="">Select client...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Project">
            <Select value={projectId} onChange={e => setProjectId(e.target.value)}>
              <option value="">No project</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </Select>
          </Field>
          <Field label="Issue date">
            <Input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} />
          </Field>
          <Field label="Valid until">
            <Input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Line items" density="compact">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-muted border-b border-border-subtle">
                <th className="pb-2 font-medium w-1/2">Description</th>
                <th className="pb-2 font-medium w-16">Qty</th>
                <th className="pb-2 font-medium w-24">Price (£)</th>
                <th className="pb-2 font-medium w-[5.5rem]">VAT%</th>
                <th className="pb-2 font-medium w-20 text-right">Total</th>
                <th className="pb-2 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item, i) => (
                <tr key={i}>
                  <td className="py-1 pr-2"><Input variant="inline" value={item.description} onChange={e => updateLine(i, 'description', e.target.value)} placeholder="Description" /></td>
                  <td className="py-1 pr-2"><Input variant="inline" type="number" value={item.quantity} onChange={e => updateLine(i, 'quantity', parseFloat(e.target.value) || 0)} /></td>
                  <td className="py-1 pr-2"><Input variant="inline" type="number" step="0.01" value={item.unit_price} onChange={e => updateLine(i, 'unit_price', parseFloat(e.target.value) || 0)} /></td>
                  <td className="py-1 pr-2 w-[5.5rem]">
                    <Select variant="inline" className="w-full" aria-label="Line item VAT rate" value={item.vat_rate} onChange={e => updateLine(i, 'vat_rate', parseFloat(e.target.value))}>
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
      </FormSection>

      <FormSection density="none">
        <Field label="Notes">
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
        </Field>
      </FormSection>

      <FormFooter>
        <FormCancelLink href={`/quotes/${params.id}`} />
        <Button type="button" intent="primary" size="md" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save changes'}
        </Button>
      </FormFooter>
    </PageLayout>
  )
}
