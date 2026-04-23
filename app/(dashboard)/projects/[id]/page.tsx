'use client'

// app/(dashboard)/projects/[id]/page.tsx — v1.1
// UI only. Data via lib/api/projects. IR35 save via lib/api/projects.

import { useState, useEffect } from 'react'
import { formatCurrency } from '@/lib/tax-calculations'
import { fetchProjectById, fetchProjectInvoices, saveIR35Assessment, updateProject } from '@/lib/api/projects'
import Badge from '@/components/badge'
import NotTaxAdviceDisclaimer from '@/components/not-tax-advice'
import IR35Questionnaire from '@/components/ir35-questionnaire'
import ProjectForm from '@/components/project-form'
import SlideOver from '@/components/slide-over'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { IR35Answer, IR35Status } from '@/types/database'

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  const [project, setProject]   = useState<any>(null)
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [ir35Status, setIr35Status] = useState<IR35Status>('needs_review')

  async function load() {
    const [proj, inv] = await Promise.all([
      fetchProjectById(params.id),
      fetchProjectInvoices(params.id),
    ])
    if (!proj) return
    setProject(proj)
    setIr35Status(proj.ir35_status ?? 'needs_review')
    setInvoices(inv)
    setLoading(false)
  }

  useEffect(() => { load() }, [params.id])

  async function handleIR35Save(answers: IR35Answer[], status: IR35Status) {
    await saveIR35Assessment(params.id, answers, status)
    setIr35Status(status)
    const updated = await fetchProjectById(params.id)
    if (updated) setProject(updated)
  }

  if (loading) return (
    <div className="space-y-4 max-w-3xl">
      {[1,2,3].map(i => <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />)}
    </div>
  )
  if (!project) return null

  const client = project.clients

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link href="/projects" className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-3">
          <ArrowLeft className="w-4 h-4" /> Back to projects
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{project.title}</h1>
            {client && (
              <Link href={`/clients/${client.id}`} className="text-sm text-blue-600 hover:underline mt-0.5 block">
                {client.name}
              </Link>
            )}
          </div>
          <div className="flex gap-2 items-center">
            <Badge status={project.status} />
            <button onClick={() => setEditOpen(true)} className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm hover:bg-slate-50">
              Edit
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-900 mb-4">Details</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          {project.description && (
            <div className="col-span-2">
              <p className="text-xs text-slate-400 uppercase font-medium mb-0.5">Description</p>
              <p className="text-slate-700">{project.description}</p>
            </div>
          )}
          {project.rate_type && (
            <div>
              <p className="text-xs text-slate-400 uppercase font-medium mb-0.5">Rate</p>
              <p className="text-slate-700 font-medium">
                {formatCurrency(project.rate_amount ?? 0)}{' '}
                {project.rate_type === 'day_rate' ? '/day' : project.rate_type === 'hourly' ? '/hour' : 'fixed'}
              </p>
            </div>
          )}
          {project.start_date && (
            <div>
              <p className="text-xs text-slate-400 uppercase font-medium mb-0.5">Start date</p>
              <p className="text-slate-700">{new Date(project.start_date).toLocaleDateString('en-GB')}</p>
            </div>
          )}
          {project.end_date && (
            <div>
              <p className="text-xs text-slate-400 uppercase font-medium mb-0.5">End date</p>
              <p className="text-slate-700">{new Date(project.end_date).toLocaleDateString('en-GB')}</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900">IR35 Assessment</h2>
          <Badge status={ir35Status} />
        </div>
        <div className="mb-4">
          <NotTaxAdviceDisclaimer />
        </div>
        <IR35Questionnaire
          projectId={project.id}
          initialAnswers={project.ir35_answers ?? []}
          initialStatus={project.ir35_status}
          onSave={handleIR35Save}
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900">Invoices</h2>
          <Link href={`/invoices/new?project=${project.id}`} className="text-sm text-blue-600 hover:underline">New invoice</Link>
        </div>
        {invoices.length ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                <th className="pb-2 font-medium">Invoice</th>
                <th className="pb-2 font-medium">Issued</th>
                <th className="pb-2 font-medium">Total</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {invoices.map(inv => (
                <tr key={inv.id}>
                  <td className="py-2"><Link href={`/invoices/${inv.id}`} className="text-blue-600 hover:underline font-medium">{inv.invoice_number}</Link></td>
                  <td className="py-2 text-slate-500">{new Date(inv.issue_date).toLocaleDateString('en-GB')}</td>
                  <td className="py-2 font-medium">{formatCurrency(inv.total)}</td>
                  <td className="py-2"><Badge status={inv.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="text-sm text-slate-400">No invoices for this project.</p>}
      </div>

      <SlideOver open={editOpen} onClose={() => setEditOpen(false)} title="Edit project"
        footer={<button type="submit" form="project-form" className="w-full bg-slate-900 text-white py-2.5 px-4 rounded-lg text-sm font-medium hover:bg-slate-800">Update project</button>}
      >
        <ProjectForm project={project} onSuccess={() => { setEditOpen(false); load() }} />
      </SlideOver>
    </div>
  )
}
