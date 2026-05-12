'use client'
export const dynamic = 'force-dynamic'

// app/(dashboard)/projects/new/page.tsx
// Dedicated new project page — same pattern as invoices/new

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Field, Input, Textarea, Select, SaveButton } from '@/components/form-fields'
import { IR35_QUESTIONS, calculateIR35 } from '@/lib/ir35-scoring'
import Badge from '@/components/badge'
import Link from 'next/link'
import { ArrowLeft, Lock, ArrowRight } from 'lucide-react'
import type { Client, IR35Answer } from '@/types/database'

export default function NewProjectPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const defaultClientId = searchParams.get('client') ?? ''

  const [clients, setClients] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showNewClient, setShowNewClient] = useState(false)
  const [newClientName, setNewClientName] = useState('')
  const [creatingClient, setCreatingClient] = useState(false)
  const [canUseIR35, setCanUseIR35] = useState(false)

  const [form, setForm] = useState({
    title: '',
    client_id: defaultClientId,
    description: '',
    status: 'active',
    rate_type: '',
    rate_amount: '',
    start_date: '',
    end_date: '',
  })

  const [ir35Answers, setIr35Answers] = useState<Record<number, boolean>>({})

  useEffect(() => {
    ;(async () => {
      const supabase = createClient()
      const [{ data: clientsData }, { data: { user } }] = await Promise.all([
        supabase.from('clients').select('id, name').order('name'),
        supabase.auth.getUser(),
      ])
      setClients(clientsData ?? [])
      if (user) {
        const { data: planProfile } = await supabase
          .from('users')
          .select('subscription_plan')
          .eq('id', user.id)
          .single()
        setCanUseIR35(['pro', 'studio'].includes(planProfile?.subscription_plan ?? 'free'))
      }
    })()
  }, [])

  function set(field: string, value: string) {
    setForm(p => ({ ...p, [field]: value }))
  }

  async function handleCreateClient() {
    if (!newClientName.trim()) return
    setCreatingClient(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: client } = await supabase
        .from('clients')
        .insert({ name: newClientName.trim(), user_id: user.id, status: 'active' })
        .select('id, name')
        .single()
      if (client) {
        setClients(prev => [...prev, client].sort((a, b) => a.name.localeCompare(b.name)))
        set('client_id', client.id)
      }
      setShowNewClient(false)
      setNewClientName('')
    } catch (e) { console.error(e) }
    setCreatingClient(false)
  }

  const allAnswered = IR35_QUESTIONS.every(q => ir35Answers[q.number] !== undefined)
  const currentAnswers: IR35Answer[] = IR35_QUESTIONS.map(q => ({
    question_number: q.number,
    value: ir35Answers[q.number] ?? false,
    importance: q.importance,
  }))
  const ir35Status = allAnswered ? calculateIR35(currentAnswers) : 'needs_review'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) { setError('Project title is required'); return }
    setSaving(true)
    setError(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error: err } = await supabase.from('projects').insert({
      title: form.title,
      client_id: form.client_id || null,
      description: form.description || null,
      status: form.status,
      rate_type: form.rate_type || null,
      rate_amount: form.rate_amount ? parseFloat(form.rate_amount) : null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      ir35_status: ir35Status,
      ir35_answers: allAnswered ? currentAnswers : null,
      ir35_assessed_at: allAnswered ? new Date().toISOString() : null,
      user_id: user.id,
      updated_at: new Date().toISOString(),
    }).select().single()

    setSaving(false)
    if (err) { setError(err.message); return }
    router.push(`/projects/${data.id}`)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <div>
        <Link href="/projects" className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-3">
          <ArrowLeft className="w-4 h-4" /> Back to projects
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">New project</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h2 className="font-semibold text-slate-800">Project details</h2>

          <Field label="Project title" required>
            <Input
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="Website redesign"
              autoFocus
            />
          </Field>

          <Field label="Client">
            <Select
              value={form.client_id}
              onChange={e => {
                if (e.target.value === '__new__') { setShowNewClient(true) }
                else { set('client_id', e.target.value); setShowNewClient(false) }
              }}
              options={[
                { value: '', label: 'No client' },
                ...clients.map(c => ({ value: c.id, label: c.name })),
                { value: '__new__', label: '+ Create new client' },
              ]}
            />
            {showNewClient && (
              <div className="mt-2 border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-2">
                <p className="text-xs font-semibold text-slate-700">New client</p>
                <input
                  aria-label="New client name"
                  value={newClientName}
                  onChange={e => setNewClientName(e.target.value)}
                  placeholder="Client name *"
                  className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
                />
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCreateClient}
                    disabled={!newClientName.trim() || creatingClient}
                    className="px-3 py-1.5 bg-slate-900 text-white rounded text-xs font-medium hover:bg-slate-800 disabled:opacity-50"
                  >
                    {creatingClient ? 'Saving...' : 'Create client'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowNewClient(false); setNewClientName('') }}
                    className="px-3 py-1.5 border border-slate-200 rounded text-xs text-slate-600 hover:bg-white"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </Field>

          <Field label="Description">
            <Textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
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
            <Field label="Rate amount (£)">
              <Input type="number" step="0.01" value={form.rate_amount} onChange={e => set('rate_amount', e.target.value)} placeholder="0.00" />
            </Field>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Field label="Start date">
              <Input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
            </Field>
            <Field label="End date">
              <Input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} />
            </Field>
          </div>
        </div>

        {/* IR35 */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-800">IR35 questionnaire</h2>
              {canUseIR35 && <p className="text-xs text-slate-600 mt-0.5">Answer all 8 questions to get a calculated status</p>}
            </div>
            {canUseIR35 && allAnswered && <Badge status={ir35Status} />}
          </div>

          {canUseIR35 ? (
            <div className="space-y-3">
              {IR35_QUESTIONS.map(q => (
                <div key={q.number} className="bg-slate-50 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${q.importance === 'HIGH' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'}`}>
                          {q.importance}
                        </span>
                        <span className="text-xs text-slate-500">{q.label}</span>
                      </div>
                      <p className="text-sm text-slate-700">{q.text}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {[true, false].map(val => (
                        <button
                          key={String(val)}
                          type="button"
                          onClick={() => setIr35Answers(p => ({ ...p, [q.number]: val }))}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            ir35Answers[q.number] === val
                              ? 'bg-blue-600 text-white'
                              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {val ? 'Yes' : 'No'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 rounded-lg bg-slate-50 text-center">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                <Lock className="w-5 h-5 text-slate-600" />
              </div>
              <p className="text-sm font-medium text-slate-700 mb-1">IR35 assessment is available on the Pro plan</p>
              <Link href="/settings?tab=billing" className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800">
                Upgrade to Pro <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Link href="/projects" className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
            Cancel
          </Link>
          <SaveButton loading={saving} label="Add project" />
        </div>
      </form>
    </div>
  )
}
