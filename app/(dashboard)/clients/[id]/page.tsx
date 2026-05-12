'use client'

// app/(dashboard)/clients/[id]/page.tsx — v1.4

import { useState, useEffect } from 'react'
import { formatCurrency } from '@/lib/tax-calculations'
import { fetchClientById, fetchClientProjects, fetchClientInvoices } from '@/lib/api/clients'
import { createClient } from '@/lib/supabase/client'
import { calcOutstanding, calcTotalInvoiced, calcTotalPaid } from '@/lib/logic/clients'
import Badge from '@/components/badge'
import ClientForm from '@/components/client-form'
import SlideOver from '@/components/slide-over'
import Link from 'next/link'
import { ArrowLeft, ChevronDown } from 'lucide-react'

// Badge component uses bg-slate-100/text-slate-700 for "completed" which reads as grey.
// Override it here with a proper blue pill to match the completed project colour.
function ProjectStatusBadge({ status }: { status: string }) {
  if (status === 'completed') {
    return (
      <span style={{
        fontSize: 11, fontWeight: 600,
        padding: '2px 8px', borderRadius: 20,
        background: '#EFF6FF', color: '#1A5E8A',
        border: '1px solid rgba(26,94,138,0.2)',
        display: 'inline-flex', alignItems: 'center',
      }}>
        Completed
      </span>
    )
  }
  return <Badge status={status} />
}

export default function ClientDetailPage({ params }: { params: { id: string } }) {
  const [client, setClient]     = useState<any>(null)
  const [projects, setProjects] = useState<any[]>([])
  const [invoices, setInvoices] = useState<any[]>([])
  const [quotes, setQuotes]     = useState<any[]>([])
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
      {[1,2,3].map(i => <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />)}
    </div>
  )
  if (!client) return null

  const totalInvoiced  = calcTotalInvoiced(invoices)
  const totalPaid      = calcTotalPaid(invoices)
  const outstanding    = calcOutstanding(invoices)
  const quotesPipeline = quotes.filter(q => q.status === 'sent' || q.status === 'accepted').reduce((s, q) => s + Number(q.total), 0)

  const chevron = (open: boolean) => (
    <ChevronDown className="w-4 h-4 text-slate-600" style={{ transform: `rotate(${open ? '0deg' : '180deg'})`, transition: 'transform 200ms', flexShrink: 0 }} />
  )

  const sectionCount = (n: number) => (
    <span style={{ fontSize: 13, color: '#475569', fontWeight: 400, marginLeft: 6 }}>({n})</span>
  )

  const projectTable = (
    <table className="w-full text-sm">
      <thead>
        <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
          <th style={{ padding: '8px 0', fontSize: 12, fontWeight: 500, color: '#475569', textAlign: 'left' }}>Project</th>
          <th style={{ padding: '8px 0', fontSize: 12, fontWeight: 500, color: '#475569', textAlign: 'right' }}>IR35</th>
          <th style={{ padding: '8px 0', fontSize: 12, fontWeight: 500, color: '#475569', textAlign: 'right' }}>Status</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-50">
        {projects.map(p => (
          <tr key={p.id}>
            <td className="py-2">
              <Link href={`/projects/${p.id}`} className="text-blue-600 hover:underline font-medium">{p.title}</Link>
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
        <Link href="/clients" className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-3">
          <ArrowLeft className="w-4 h-4" /> Back to clients
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{client.name}</h1>
            <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
              {client.contact_name && <span>{client.contact_name}</span>}
              {client.email && <a href={`mailto:${client.email}`} className="text-blue-600 hover:underline">{client.email}</a>}
              {client.phone && <span>{client.phone}</span>}
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <Badge status={client.status} />
            <button onClick={() => setEditOpen(true)} className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm hover:bg-slate-50">
              Edit
            </button>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Total invoiced</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totalInvoiced)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Total paid</p>
          <p className="text-2xl font-bold text-green-700 mt-1">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Outstanding</p>
          <p className={`text-2xl font-bold mt-1 ${outstanding > 0 ? 'text-red-600' : 'text-slate-900'}`}>{formatCurrency(outstanding)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Quotes pipeline</p>
          <p className="text-2xl font-bold mt-1" style={{ color: '#0F172A' }}>{formatCurrency(quotesPipeline)}</p>
        </div>
      </div>

      {(client.address_line1 || client.notes) && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900 mb-3">Details</h2>
          {client.address_line1 && (
            <div className="text-sm text-slate-600 mb-3">
              <p>{client.address_line1}</p>
              {client.address_line2 && <p>{client.address_line2}</p>}
              {client.city && <p>{client.city}{client.postcode ? `, ${client.postcode}` : ''}</p>}
              <p>{client.country}</p>
            </div>
          )}
          {client.notes && <p className="text-sm text-slate-500 mt-2">{client.notes}</p>}
        </div>
      )}

      {/* Projects */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between" style={{ cursor: 'pointer', marginBottom: projectsOpen ? 16 : 0 }}
          onClick={() => setProjectsOpen(o => !o)}>
          <h2 className="font-semibold text-slate-900">Projects{sectionCount(projects.length)}</h2>
          <div className="flex items-center" style={{ gap: 16 }}>
            <Link href={`/projects/new?client=${client.id}`} onClick={e => e.stopPropagation()}
              className="text-sm text-blue-600 hover:underline">Add project</Link>
            {chevron(projectsOpen)}
          </div>
        </div>
        {projectsOpen && (() => {
          if (!projects.length) return <p className="text-sm text-slate-600">No projects.</p>
          if (projects.length > 10) return <div style={{ maxHeight: 420, overflowY: 'auto' }}>{projectTable}</div>
          return projectTable
        })()}
      </div>

      {/* Quotes */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between" style={{ cursor: 'pointer', marginBottom: quotesOpen ? 16 : 0 }}
          onClick={() => setQuotesOpen(o => !o)}>
          <h2 className="font-semibold text-slate-900">Quotes{sectionCount(quotes.length)}</h2>
          <div className="flex items-center" style={{ gap: 16 }}>
            <Link href={`/quotes/new?client=${client.id}`} onClick={e => e.stopPropagation()}
              className="text-sm text-blue-600 hover:underline">New quote</Link>
            {chevron(quotesOpen)}
          </div>
        </div>
        {quotesOpen && (() => {
          const quoteTable = (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                  <th className="pb-2 font-medium">Quote #</th>
                  <th className="pb-2 font-medium">Issued</th>
                  <th className="pb-2 font-medium">Valid until</th>
                  <th className="pb-2 font-medium">Total</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {quotes.map(q => {
                  const expired = q.status === 'sent' && new Date(q.expiry_date) < new Date()
                  return (
                    <tr key={q.id}>
                      <td className="py-2"><Link href={`/quotes/${q.id}`} className="text-blue-600 hover:underline font-medium">{q.quote_number}</Link></td>
                      <td className="py-2 text-slate-500">{new Date(q.issue_date).toLocaleDateString('en-GB')}</td>
                      <td className={`py-2 ${expired ? 'text-red-600 font-medium' : 'text-slate-500'}`}>{new Date(q.expiry_date).toLocaleDateString('en-GB')}</td>
                      <td className="py-2 font-medium">{formatCurrency(q.total)}</td>
                      <td className="py-2"><Badge status={q.status} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )
          if (!quotes.length) return <p className="text-sm text-slate-600">No quotes yet.</p>
          if (quotes.length > 10) return <div style={{ maxHeight: 420, overflowY: 'auto' }}>{quoteTable}</div>
          return quoteTable
        })()}
      </div>

      {/* Invoices */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between" style={{ cursor: 'pointer', marginBottom: invoicesOpen ? 16 : 0 }}
          onClick={() => setInvoicesOpen(o => !o)}>
          <h2 className="font-semibold text-slate-900">Invoices{sectionCount(invoices.length)}</h2>
          <div className="flex items-center" style={{ gap: 16 }}>
            <Link href={`/invoices/new?client=${client.id}`} onClick={e => e.stopPropagation()}
              className="text-sm text-blue-600 hover:underline">New invoice</Link>
            {chevron(invoicesOpen)}
          </div>
        </div>
        {invoicesOpen && (() => {
          const invoiceTable = (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                  <th className="pb-2 font-medium">Invoice</th>
                  <th className="pb-2 font-medium">Issued</th>
                  <th className="pb-2 font-medium">Due</th>
                  <th className="pb-2 font-medium">Total</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {invoices.map(inv => (
                  <tr key={inv.id}>
                    <td className="py-2"><Link href={`/invoices/${inv.id}`} className="text-blue-600 hover:underline font-medium">{inv.invoice_number}</Link></td>
                    <td className="py-2 text-slate-500">{new Date(inv.issue_date).toLocaleDateString('en-GB')}</td>
                    <td className="py-2 text-slate-500">{new Date(inv.due_date).toLocaleDateString('en-GB')}</td>
                    <td className="py-2 font-medium">{formatCurrency(inv.total)}</td>
                    <td className="py-2"><Badge status={inv.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
          if (!invoices.length) return <p className="text-sm text-slate-600">No invoices.</p>
          if (invoices.length > 10) return <div style={{ maxHeight: 420, overflowY: 'auto' }}>{invoiceTable}</div>
          return invoiceTable
        })()}
      </div>

      <SlideOver open={editOpen} onClose={() => setEditOpen(false)} title="Edit client"
        footer={<button type="submit" form="client-form" className="w-full bg-slate-900 text-white py-2.5 px-4 rounded-lg text-sm font-medium hover:bg-slate-800">Update client</button>}
      >
        <ClientForm client={client} onSuccess={() => { setEditOpen(false); load() }} />
      </SlideOver>
    </div>
  )
}
