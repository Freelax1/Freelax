'use client'

// app/(dashboard)/clients/[id]/page.tsx — v1.4

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { formatCurrency } from '@/lib/tax-calculations'
import { fetchClientById, fetchClientProjects, fetchClientInvoices } from '@/lib/api/clients'
import { createClient } from '@/lib/supabase/client'
import { calcOutstanding, calcTotalInvoiced, calcTotalPaid } from '@/lib/logic/clients'
import Badge from '@/components/badge'
import ClientForm from '@/components/client-form'
import SlideOver from '@/components/slide-over'
import Button from '@/components/ui/button'
import PageHeader from '@/components/ui/page-header'
import PageLayout from '@/components/page-layout'
import Link from 'next/link'
import StatCard from '@/components/ui/stat-card'
import { ClientDetailSkeleton, CollapsibleSection, DetailSection } from '@/components/ui'
import type { Client, Project, Invoice, Quote } from '@/types/database'

type ClientProject = Pick<Project, 'id' | 'title' | 'status' | 'ir35_status' | 'rate_type' | 'rate_amount'>
type ClientInvoice = Pick<Invoice, 'id' | 'invoice_number' | 'status' | 'total' | 'issue_date' | 'due_date'>
type ClientQuote   = Pick<Quote,   'id' | 'quote_number' | 'issue_date' | 'expiry_date' | 'total' | 'status'>

// Badge component uses bg-surface-sunken/text-text-secondary for "completed" which reads as grey.
// Override it here with a proper blue pill to match the completed project colour.
function ProjectStatusBadge({ status }: { status: string }) {
  if (status === 'completed') {
    return (
      <span className="text-caption font-semibold px-2 py-px rounded-xl bg-forest-50 text-forest-700 inline-flex items-center border border-forest-200">
        Completed
      </span>
    )
  }
  return <Badge status={status} />
}

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>()
  const [client, setClient]     = useState<Client | null>(null)
  const [projects, setProjects] = useState<ClientProject[]>([])
  const [invoices, setInvoices] = useState<ClientInvoice[]>([])
  const [quotes, setQuotes]     = useState<ClientQuote[]>([])
  const [loading, setLoading]   = useState(true)
  const [editOpen, setEditOpen] = useState(false)

  const [projectsOpen, setProjectsOpen] = useState(true)
  const [quotesOpen, setQuotesOpen]     = useState(true)
  const [invoicesOpen, setInvoicesOpen] = useState(true)

  async function load() {
    const supabase = createClient()
    const [cl, proj, inv, { data: qt }] = await Promise.all([
      fetchClientById(params.id),
      fetchClientProjects(params.id),
      fetchClientInvoices(params.id),
      supabase.from('quotes').select('id, quote_number, issue_date, expiry_date, total, status')
        .eq('client_id', params.id).order('issue_date', { ascending: false }),
    ])
    if (!cl) return
    setClient(cl)
    setProjects(proj)
    setInvoices(inv)
    setQuotes(qt ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [params.id])

  if (loading) return <ClientDetailSkeleton />
  if (!client) return null

  const totalInvoiced  = calcTotalInvoiced(invoices)
  const totalPaid      = calcTotalPaid(invoices)
  const outstanding    = calcOutstanding(invoices)
  const quotesPipeline = quotes.filter(q => q.status === 'sent' || q.status === 'accepted').reduce((s, q) => s + Number(q.total), 0)

  const sectionCount = (n: number) => (
    <span className="text-sm text-text-secondary font-normal ml-1.5">({n})</span>
  )

  const projectTable = (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border-subtle">
          <th className="py-2 text-xs font-medium text-text-secondary text-left">Project</th>
          <th className="py-2 text-xs font-medium text-text-secondary text-right">IR35</th>
          <th className="py-2 text-xs font-medium text-text-secondary text-right">Status</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border-subtle">
        {projects.map(p => (
          <tr key={p.id}>
            <td className="py-2">
              <Link href={`/projects/${p.id}`} className="text-forest-600 hover:underline font-medium">{p.title}</Link>
            </td>
            <td className="py-2 text-right"><Badge status={p.ir35_status} /></td>
            <td className="py-2 text-right"><ProjectStatusBadge status={p.status} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  )

  return (
    <PageLayout width="full" className="space-y-6">
      <PageHeader
        back={{ href: '/clients', label: 'Back to clients' }}
        title={client.name}
        meta={
          <div className="flex items-center gap-3 text-sm text-text-muted">
            {client.contact_name && <span>{client.contact_name}</span>}
            {client.email && <a href={`mailto:${client.email}`} className="text-forest-600 hover:underline">{client.email}</a>}
            {client.phone && <span>{client.phone}</span>}
          </div>
        }
        action={
          <div className="flex gap-2 items-center">
            <Badge status={client.status} />
            <Button type="button" intent="secondary" size="sm" onClick={() => setEditOpen(true)}>
              Edit
            </Button>
          </div>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 fd-stat-grid">
        <StatCard
          size="sm"
          label="Total invoiced"
          tooltip="All invoices for this client."
          value={formatCurrency(totalInvoiced)}
        />
        <StatCard
          size="sm"
          label="Total paid"
          tooltip="Paid invoices for this client."
          value={formatCurrency(totalPaid)}
          valueColor="var(--success-700)"
        />
        <StatCard
          size="sm"
          label="Unpaid"
          tooltip="Sent and overdue only."
          value={formatCurrency(outstanding)}
          valueColor={outstanding > 0 ? 'var(--danger-600)' : undefined}
        />
        <StatCard
          size="sm"
          label="Quotes pipeline"
          tooltip="Sent and accepted quotes."
          value={formatCurrency(quotesPipeline)}
        />
      </div>

      {(client.address_line1 || client.notes) && (
        <DetailSection title="Details">
          {client.address_line1 && (
            <div className="text-sm text-text-secondary mb-3">
              <p>{client.address_line1}</p>
              {client.address_line2 && <p>{client.address_line2}</p>}
              {client.city && <p>{client.city}{client.postcode ? `, ${client.postcode}` : ''}</p>}
              <p>{client.country}</p>
            </div>
          )}
          {client.notes && <p className="text-sm text-text-muted mt-2">{client.notes}</p>}
        </DetailSection>
      )}

      <CollapsibleSection
        title={<>Projects{sectionCount(projects.length)}</>}
        open={projectsOpen}
        onOpenChange={setProjectsOpen}
        headerAction={
          <Link href={`/projects/new?client=${client.id}`} className="text-sm text-forest-600 hover:underline">
            Add project
          </Link>
        }
      >
        {!projects.length ? (
          <p className="text-sm text-text-secondary">No projects.</p>
        ) : projects.length > 10 ? (
          <div className="max-h-[420px] overflow-y-auto">{projectTable}</div>
        ) : (
          projectTable
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title={<>Quotes{sectionCount(quotes.length)}</>}
        open={quotesOpen}
        onOpenChange={setQuotesOpen}
        headerAction={
          <Link href={`/quotes/new?client=${client.id}`} className="text-sm text-forest-600 hover:underline">
            New quote
          </Link>
        }
      >
        {(() => {
          const quoteTable = (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-muted border-b border-border-subtle">
                  <th className="pb-2 font-medium">Quote #</th>
                  <th className="pb-2 font-medium">Issued</th>
                  <th className="pb-2 font-medium">Valid until</th>
                  <th className="pb-2 font-medium">Total</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {quotes.map(q => {
                  const expired = q.status === 'sent' && q.expiry_date != null && new Date(q.expiry_date) < new Date()
                  return (
                    <tr key={q.id}>
                      <td className="py-2"><Link href={`/quotes/${q.id}`} className="text-forest-600 hover:underline font-medium">{q.quote_number}</Link></td>
                      <td className="py-2 text-text-muted">{new Date(q.issue_date).toLocaleDateString('en-GB')}</td>
                      <td className={`py-2 ${expired ? 'text-danger-600 font-medium' : 'text-text-muted'}`}>{q.expiry_date ? new Date(q.expiry_date).toLocaleDateString('en-GB') : '—'}</td>
                      <td className="py-2 font-medium">{formatCurrency(q.total)}</td>
                      <td className="py-2"><Badge status={q.status} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )
          if (!quotes.length) return <p className="text-sm text-text-secondary">No quotes yet.</p>
          if (quotes.length > 10) return <div className="max-h-[420px] overflow-y-auto">{quoteTable}</div>
          return quoteTable
        })()}
      </CollapsibleSection>

      <CollapsibleSection
        title={<>Invoices{sectionCount(invoices.length)}</>}
        open={invoicesOpen}
        onOpenChange={setInvoicesOpen}
        headerAction={
          <Link href={`/invoices/new?client=${client.id}`} className="text-sm text-forest-600 hover:underline">
            New invoice
          </Link>
        }
      >
        {(() => {
          const invoiceTable = (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-muted border-b border-border-subtle">
                  <th className="pb-2 font-medium">Invoice</th>
                  <th className="pb-2 font-medium">Issued</th>
                  <th className="pb-2 font-medium">Due</th>
                  <th className="pb-2 font-medium">Total</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {invoices.map(inv => (
                  <tr key={inv.id}>
                    <td className="py-2"><Link href={`/invoices/${inv.id}`} className="text-forest-600 hover:underline font-medium">{inv.invoice_number}</Link></td>
                    <td className="py-2 text-text-muted">{new Date(inv.issue_date).toLocaleDateString('en-GB')}</td>
                    <td className="py-2 text-text-muted">{new Date(inv.due_date).toLocaleDateString('en-GB')}</td>
                    <td className="py-2 font-medium">{formatCurrency(inv.total)}</td>
                    <td className="py-2"><Badge status={inv.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
          if (!invoices.length) return <p className="text-sm text-text-secondary">No invoices.</p>
          if (invoices.length > 10) return <div className="max-h-[420px] overflow-y-auto">{invoiceTable}</div>
          return invoiceTable
        })()}
      </CollapsibleSection>

      <SlideOver open={editOpen} onClose={() => setEditOpen(false)} title="Edit client"
        footer={
          <Button type="submit" form="client-form" intent="primary" size="md" fullWidth>
            Update client
          </Button>
        }
      >
        <ClientForm client={client} hideInlineSubmit onSuccess={() => { setEditOpen(false); load() }} />
      </SlideOver>
    </PageLayout>
  )
}
