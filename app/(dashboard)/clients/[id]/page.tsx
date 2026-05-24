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
import Link from 'next/link'
import { ArrowLeft, CaretDown } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { serifStat, sectionTitle } from '@/lib/typography'
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

  if (loading) return (
    <div className="space-y-4">
      {[1,2,3].map(i => <div key={i} className="h-24 bg-surface-sunken rounded-xl animate-pulse" />)}
    </div>
  )
  if (!client) return null

  const totalInvoiced  = calcTotalInvoiced(invoices)
  const totalPaid      = calcTotalPaid(invoices)
  const outstanding    = calcOutstanding(invoices)
  const quotesPipeline = quotes.filter(q => q.status === 'sent' || q.status === 'accepted').reduce((s, q) => s + Number(q.total), 0)

  const chevron = (open: boolean) => (
    <CaretDown weight="regular" className={cn('w-4 h-4 text-text-secondary shrink-0 transition-transform duration-200', open ? 'rotate-0' : 'rotate-180')} />
  )

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
    <div className="space-y-6">
      <div>
        <Link href="/clients" className="flex items-center gap-1 text-sm text-text-muted hover:text-text-secondary mb-3">
          <ArrowLeft weight="regular" className="w-4 h-4" /> Back to clients
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-serif font-normal text-text-primary tracking-normal leading-heading">{client.name}</h1>
            <div className="flex items-center gap-3 mt-1 text-sm text-text-muted">
              {client.contact_name && <span>{client.contact_name}</span>}
              {client.email && <a href={`mailto:${client.email}`} className="text-forest-600 hover:underline">{client.email}</a>}
              {client.phone && <span>{client.phone}</span>}
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <Badge status={client.status} />
            <Button type="button" intent="secondary" size="sm" onClick={() => setEditOpen(true)}>
              Edit
            </Button>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface-card rounded-xl border border-border-default p-4">
          <p className="text-caption text-text-muted">Total invoiced</p>
          <p className={cn('text-2xl text-text-primary mt-1', serifStat)}>{formatCurrency(totalInvoiced)}</p>
        </div>
        <div className="bg-surface-card rounded-xl border border-border-default p-4">
          <p className="text-caption text-text-muted">Total paid</p>
          <p className={cn('text-2xl text-success-700 mt-1', serifStat)}>{formatCurrency(totalPaid)}</p>
        </div>
        <div className="bg-surface-card rounded-xl border border-border-default p-4">
          <p className="text-caption text-text-muted">Outstanding</p>
          <p className={cn('text-2xl mt-1', serifStat, outstanding > 0 ? 'text-danger-600' : 'text-text-primary')}>{formatCurrency(outstanding)}</p>
        </div>
        <div className="bg-surface-card rounded-xl border border-border-default p-4">
          <p className="text-caption text-text-muted">Quotes pipeline</p>
          <p className={cn('text-2xl text-text-primary mt-1', serifStat)}>{formatCurrency(quotesPipeline)}</p>
        </div>
      </div>

      {(client.address_line1 || client.notes) && (
        <div className="bg-surface-card rounded-xl border border-border-default p-6">
          <h2 className={cn(sectionTitle, 'mb-3')}>Details</h2>
          {client.address_line1 && (
            <div className="text-sm text-text-secondary mb-3">
              <p>{client.address_line1}</p>
              {client.address_line2 && <p>{client.address_line2}</p>}
              {client.city && <p>{client.city}{client.postcode ? `, ${client.postcode}` : ''}</p>}
              <p>{client.country}</p>
            </div>
          )}
          {client.notes && <p className="text-sm text-text-muted mt-2">{client.notes}</p>}
        </div>
      )}

      {/* Projects */}
      <div className="bg-surface-card rounded-xl border border-border-default p-6">
        <div className={cn('flex items-center justify-between cursor-pointer', projectsOpen && 'mb-4')}
          onClick={() => setProjectsOpen(o => !o)}>
          <h2 className={sectionTitle}>Projects{sectionCount(projects.length)}</h2>
          <div className="flex items-center gap-4">
            <Link href={`/projects/new?client=${client.id}`} onClick={e => e.stopPropagation()}
              className="text-sm text-forest-600 hover:underline">Add project</Link>
            {chevron(projectsOpen)}
          </div>
        </div>
        {projectsOpen && (() => {
          if (!projects.length) return <p className="text-sm text-text-secondary">No projects.</p>
          if (projects.length > 10) return <div className="max-h-[420px] overflow-y-auto">{projectTable}</div>
          return projectTable
        })()}
      </div>

      {/* Quotes */}
      <div className="bg-surface-card rounded-xl border border-border-default p-6">
        <div className={cn('flex items-center justify-between cursor-pointer', quotesOpen && 'mb-4')}
          onClick={() => setQuotesOpen(o => !o)}>
          <h2 className={sectionTitle}>Quotes{sectionCount(quotes.length)}</h2>
          <div className="flex items-center gap-4">
            <Link href={`/quotes/new?client=${client.id}`} onClick={e => e.stopPropagation()}
              className="text-sm text-forest-600 hover:underline">New quote</Link>
            {chevron(quotesOpen)}
          </div>
        </div>
        {quotesOpen && (() => {
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
      </div>

      {/* Invoices */}
      <div className="bg-surface-card rounded-xl border border-border-default p-6">
        <div className={cn('flex items-center justify-between cursor-pointer', invoicesOpen && 'mb-4')}
          onClick={() => setInvoicesOpen(o => !o)}>
          <h2 className={sectionTitle}>Invoices{sectionCount(invoices.length)}</h2>
          <div className="flex items-center gap-4">
            <Link href={`/invoices/new?client=${client.id}`} onClick={e => e.stopPropagation()}
              className="text-sm text-forest-600 hover:underline">New invoice</Link>
            {chevron(invoicesOpen)}
          </div>
        </div>
        {invoicesOpen && (() => {
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
      </div>

      <SlideOver open={editOpen} onClose={() => setEditOpen(false)} title="Edit client"
        footer={
          <Button type="submit" form="client-form" intent="primary" size="md" fullWidth>
            Update client
          </Button>
        }
      >
        <ClientForm client={client} onSuccess={() => { setEditOpen(false); load() }} />
      </SlideOver>
    </div>
  )
}
