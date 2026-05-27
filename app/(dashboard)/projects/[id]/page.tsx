'use client'

// app/(dashboard)/projects/[id]/page.tsx — v1.1
// UI only. Data via lib/api/projects. IR35 save via lib/api/projects.

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { formatCurrency } from '@/lib/tax-calculations'
import { fetchProjectById, fetchProjectInvoices, saveIR35Assessment, updateProject } from '@/lib/api/projects'
import Badge from '@/components/badge'
import NotTaxAdviceDisclaimer from '@/components/not-tax-advice'
import IR35Questionnaire from '@/components/ir35-questionnaire'
import ProjectForm from '@/components/project-form'
import SlideOver from '@/components/slide-over'
import Link from 'next/link'
import Button, { buttonVariants } from '@/components/ui/button'
import { ProjectDetailSkeleton } from '@/components/ui'
import { sectionTitle } from '@/lib/typography'
import { cn } from '@/lib/utils'
import { ArrowLeft, Lock, ArrowRight } from '@phosphor-icons/react'
import type { IR35Answer, IR35Status, Project, Invoice } from '@/types/database'

type ProjectInvoice = Pick<Invoice, 'id' | 'invoice_number' | 'status' | 'total' | 'issue_date'>
import { createClient } from '@/lib/supabase/client'

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>()
  const [project, setProject]   = useState<Project | null>(null)
  const [invoices, setInvoices] = useState<ProjectInvoice[]>([])
  const [loading, setLoading]   = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [projectSaving, setProjectSaving] = useState(false)
  const [ir35Status, setIr35Status] = useState<IR35Status>('needs_review')
  const [canUseIR35, setCanUseIR35] = useState(false)

  async function load() {
    const [proj, inv] = await Promise.all([
      fetchProjectById(params.id),
      fetchProjectInvoices(params.id),
    ])
    if (!proj) return
    setProject(proj)
    setIr35Status(proj.ir35_status ?? 'needs_review')
    setInvoices(inv)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('users')
        .select('subscription_plan')
        .eq('id', user.id)
        .single()
      setCanUseIR35(['pro', 'studio'].includes(profile?.subscription_plan ?? 'free'))
    }

    setLoading(false)
  }

  useEffect(() => { load() }, [params.id])

  async function handleIR35Save(answers: IR35Answer[], status: IR35Status) {
    await saveIR35Assessment(params.id, answers, status)
    setIr35Status(status)
    const updated = await fetchProjectById(params.id)
    if (updated) setProject(updated)
  }

  if (loading) return <ProjectDetailSkeleton />
  if (!project) return null

  const client = project.clients

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link href="/projects" className="flex items-center gap-1 text-sm text-text-muted hover:text-text-secondary mb-3">
          <ArrowLeft weight="regular" className="w-4 h-4" /> Back to projects
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-serif font-normal text-text-primary tracking-normal leading-heading">{project.title}</h1>
            {client && (
              <Link href={`/clients/${client.id}`} className="text-sm text-forest-600 hover:underline mt-0.5 block">
                {client.name}
              </Link>
            )}
          </div>
          <div className="flex gap-2 items-center">
            <Badge status={project.status} />
            <Button type="button" intent="secondary" size="sm" onClick={() => setEditOpen(true)}>
              Edit
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-surface-card rounded-xl border border-border-default p-6">
        <h2 className={cn(sectionTitle, 'mb-4')}>Details</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          {project.description && (
            <div className="col-span-2">
              <p className="text-xs text-text-secondary font-medium mb-0.5">Description</p>
              <p className="text-text-secondary">{project.description}</p>
            </div>
          )}
          {project.rate_type && (
            <div>
              <p className="text-xs text-text-secondary font-medium mb-0.5">Rate</p>
              <p className="text-text-secondary font-medium">
                {formatCurrency(project.rate_amount ?? 0)}{' '}
                {project.rate_type === 'day_rate' ? '/day' : project.rate_type === 'hourly' ? '/hour' : 'fixed'}
              </p>
            </div>
          )}
          {project.start_date && (
            <div>
              <p className="text-xs text-text-secondary font-medium mb-0.5">Start date</p>
              <p className="text-text-secondary">{new Date(project.start_date).toLocaleDateString('en-GB')}</p>
            </div>
          )}
          {project.end_date && (
            <div>
              <p className="text-xs text-text-secondary font-medium mb-0.5">End date</p>
              <p className="text-text-secondary">{new Date(project.end_date).toLocaleDateString('en-GB')}</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-surface-card rounded-xl border border-border-default p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className={sectionTitle}>IR35 assessment</h2>
          {canUseIR35 && <Badge status={ir35Status} />}
        </div>
        {canUseIR35 ? (
          <IR35Questionnaire
            projectId={project.id}
            initialAnswers={project.ir35_answers ?? []}
            initialStatus={project.ir35_status}
            onSave={handleIR35Save}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-10 rounded-xl bg-surface-sunken text-center">
            <div className="w-10 h-10 rounded-lg bg-surface-sunken flex items-center justify-center mb-3">
              <Lock weight="regular" className="w-5 h-5 text-text-secondary" />
            </div>
            <p className="text-sm font-medium text-text-secondary mb-1">
              IR35 assessment is available on the Pro plan
            </p>
            <Link
              href="/settings?tab=billing"
              className={buttonVariants({ intent: 'primary', size: 'sm' })}
            >
              Upgrade to Pro <ArrowRight weight="regular" className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>

      <div className="bg-surface-card rounded-xl border border-border-default p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className={sectionTitle}>Invoices</h2>
          <Link href={`/invoices/new?project=${project.id}`} className="text-sm text-forest-600 hover:underline">New invoice</Link>
        </div>
        {invoices.length ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-muted border-b border-border-subtle">
                <th className="pb-2 font-medium">Invoice</th>
                <th className="pb-2 font-medium">Issued</th>
                <th className="pb-2 font-medium">Total</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {invoices.map(inv => (
                <tr key={inv.id}>
                  <td className="py-2"><Link href={`/invoices/${inv.id}`} className="text-forest-600 hover:underline font-medium">{inv.invoice_number}</Link></td>
                  <td className="py-2 text-text-muted">{new Date(inv.issue_date).toLocaleDateString('en-GB')}</td>
                  <td className="py-2 font-medium">{formatCurrency(inv.total)}</td>
                  <td className="py-2"><Badge status={inv.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="text-sm text-text-secondary">No invoices for this project.</p>}
      </div>

      <SlideOver open={editOpen} onClose={() => setEditOpen(false)} title="Edit project"
        footer={
          <Button type="submit" form="project-form" intent="primary" size="md" fullWidth disabled={projectSaving}>
            {projectSaving ? 'Saving…' : 'Update project'}
          </Button>
        }
      >
        <ProjectForm
          project={project}
          onSavingChange={setProjectSaving}
          onSuccess={() => { setEditOpen(false); setProjectSaving(false); load() }}
        />
      </SlideOver>
    </div>
  )
}
