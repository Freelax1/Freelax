'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Field, Input, Textarea, Select, SaveButton } from '@/components/form-fields'
import Button from '@/components/ui/button'
import { IR35_QUESTIONS, calculateIR35 } from '@/lib/ir35-scoring'
import Badge from '@/components/badge'
import type { Project, Client, IR35Answer } from '@/types/database'

interface ProjectFormProps {
  project?: Partial<Project>
  defaultClientId?: string
  onSuccess?: () => void
}

export default function ProjectForm({ project, defaultClientId, onSuccess }: ProjectFormProps) {
  const router = useRouter()
  const isEdit = !!project?.id

  const [clients, setClients] = useState<any[]>([])
  const [form, setForm] = useState({
    title: project?.title ?? '',
    client_id: project?.client_id ?? defaultClientId ?? '',
    description: project?.description ?? '',
    status: project?.status ?? 'active',
    rate_type: project?.rate_type ?? '',
    rate_amount: project?.rate_amount?.toString() ?? '',
    start_date: project?.start_date ?? '',
    end_date: project?.end_date ?? '',
  })
  const [ir35Answers, setIr35Answers] = useState<Record<number, boolean>>(
    Object.fromEntries(project?.ir35_answers?.map(a => [a.question_number, a.value]) ?? [])
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('clients').select('id, name').order('name').then(({ data }) => setClients(data ?? []))
  }, [])

  function set(field: string, value: string) {
    setForm(p => ({ ...p, [field]: value }))
    if (errors[field]) setErrors(p => { const n = { ...p }; delete n[field]; return n })
  }

  const allAnswered = IR35_QUESTIONS.every(q => ir35Answers[q.number] !== undefined)
  const currentAnswers: IR35Answer[] = IR35_QUESTIONS.map(q => ({
    question_number: q.number,
    value: ir35Answers[q.number] ?? false,
    importance: q.importance,
  }))
  const ir35Status = allAnswered ? calculateIR35(currentAnswers) : (project?.ir35_status ?? 'needs_review')

  function validate() {
    const e: Record<string, string> = {}
    if (!form.title.trim()) e.title = 'Project title is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const payload = {
      title: form.title,
      client_id: form.client_id || null,
      description: form.description || null,
      status: form.status,
      rate_type: form.rate_type || null,
      rate_amount: form.rate_amount ? parseFloat(form.rate_amount) : null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      ir35_status: ir35Status,
      ir35_answers: allAnswered ? currentAnswers : (project?.ir35_answers ?? null),
      ir35_assessed_at: allAnswered ? new Date().toISOString() : project?.ir35_assessed_at,
      updated_at: new Date().toISOString(),
    }

    const { error } = isEdit
      ? await supabase.from('projects').update(payload).eq('id', project!.id!)
      : await supabase.from('projects').insert({ ...payload, user_id: user.id })

    setSaving(false)
    if (error) { setErrors({ _: error.message }); return }
    onSuccess?.()
    router.refresh()
  }

  return (
    <form id="project-form" onSubmit={handleSubmit} className="space-y-4">
      {errors._ && <p className="text-sm text-danger-600 bg-danger-50 px-3 py-2 rounded-xl">{errors._}</p>}

      <Field label="Project title" required error={errors.title}>
        <Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Website redesign" error={!!errors.title} />
      </Field>

      <Field label="Client">
        <Select
          value={form.client_id}
          onChange={e => set('client_id', e.target.value)}
          options={[{ value: '', label: 'No client' }, ...clients.map(c => ({ value: c.id, label: c.name }))]}
        />
      </Field>

      <Field label="Description">
        <Textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Status">
          <Select value={form.status} onChange={e => set('status', e.target.value)} options={[
            { value: 'active', label: 'Active' },
            { value: 'completed', label: 'Completed' },
            { value: 'on_hold', label: 'On hold' },
            { value: 'cancelled', label: 'Cancelled' },
          ]} />
        </Field>
        <Field label="Rate type">
          <Select value={form.rate_type} onChange={e => set('rate_type', e.target.value)} options={[
            { value: '', label: 'Not set' },
            { value: 'fixed', label: 'Fixed price' },
            { value: 'day_rate', label: 'Day rate' },
            { value: 'hourly', label: 'Hourly' },
          ]} />
        </Field>
      </div>

      {form.rate_type && (
        <Field label={`Rate amount (£)`}>
          <Input type="number" step="0.01" value={form.rate_amount} onChange={e => set('rate_amount', e.target.value)} placeholder="0.00" />
        </Field>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Start date">
          <Input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
        </Field>
        <Field label="End date">
          <Input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} />
        </Field>
      </div>

      {/* IR35 */}
      <div className="border-t border-border-subtle pt-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-text-primary">IR35 Questionnaire</p>
          {allAnswered && <Badge status={ir35Status} />}
        </div>
        <div className="space-y-3">
          {IR35_QUESTIONS.map(q => (
            <div key={q.number} className="bg-surface-sunken rounded-xl p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${q.importance === 'HIGH' ? 'bg-danger-100 text-danger-700' : 'bg-warning-100 text-warning-800'}`}>{q.importance}</span>
                    <span className="text-xs text-text-secondary">{q.label}</span>
                  </div>
                  <p className="text-xs text-text-secondary">{q.text}</p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  {[true, false].map(val => (
                    <Button
                      key={String(val)}
                      type="button"
                      size="xs"
                      intent={ir35Answers[q.number] === val ? 'primary' : 'secondary'}
                      onClick={() => setIr35Answers(p => ({ ...p, [q.number]: val }))}
                    >
                      {val ? 'Yes' : 'No'}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>


    </form>
  )
}
