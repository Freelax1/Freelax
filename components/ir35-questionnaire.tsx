'use client'

import { useState } from 'react'
import { IR35_QUESTIONS, calculateIR35 } from '@/lib/ir35-scoring'
import Badge from '@/components/badge'
import Button from '@/components/ui/button'
import Alert from '@/components/ui/alert'
import type { IR35Answer, IR35Status } from '@/types/database'
import AIFlag from '@/components/ai-flag'
import NotTaxAdviceDisclaimer from '@/components/not-tax-advice'
import { cn } from '@/lib/utils'

interface Props {
  projectId: string
  initialAnswers?: IR35Answer[]
  initialStatus?: IR35Status
  onSave?: (answers: IR35Answer[], status: IR35Status) => Promise<void>
}

const RISK_SEGMENTS = [
  {
    key: 'Low' as const,
    active: 'bg-success-50 border-success-200 text-success-700',
  },
  {
    key: 'Medium' as const,
    active: 'bg-warning-50 border-warning-200 text-warning-800',
  },
  {
    key: 'High' as const,
    active: 'bg-danger-50 border-danger-200 text-danger-700',
  },
]

const sectionLabelClass =
  'text-micro font-semibold text-text-muted uppercase tracking-label mb-1.5'

function IR35RiskBar({ level }: { level: 'Low' | 'Medium' | 'High' }) {
  return (
    <div className="flex gap-2">
      {RISK_SEGMENTS.map(s => {
        const active = level === s.key
        return (
          <div
            key={s.key}
            className={cn(
              'flex-1 py-1.5 rounded-lg text-center border transition-opacity',
              active
                ? s.active
                : 'bg-surface-sunken border-border-subtle text-text-muted opacity-45',
            )}
          >
            <span className="text-caption font-bold tracking-wide">
              {s.key.toUpperCase()}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default function IR35Questionnaire({ projectId, initialAnswers, initialStatus, onSave }: Props) {
  const [answers, setAnswers] = useState<Record<number, boolean>>(
    Object.fromEntries(initialAnswers?.map(a => [a.question_number, a.value]) ?? [])
  )
  const [saving, setSaving] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState<any>(null)

  const allAnswered = IR35_QUESTIONS.every(q => answers[q.number] !== undefined)

  const currentAnswers: IR35Answer[] = IR35_QUESTIONS.map(q => ({
    question_number: q.number,
    value: answers[q.number] ?? false,
    importance: q.importance,
  }))

  const calculatedStatus = allAnswered ? calculateIR35(currentAnswers) : initialStatus

  async function handleSave() {
    if (!onSave || !allAnswered) return
    setSaving(true)
    await onSave(currentAnswers, calculatedStatus!)
    setSaving(false)
  }

  async function handleAIAssess() {
    setAiLoading(true)
    setAiResult(null)
    try {
      const res = await fetch('/api/ai/ir35-explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: currentAnswers, projectId, calculatedStatus }),
      })
      const data = await res.json()
      setAiResult(data)
    } catch {
      setAiResult({ error: 'Failed to get AI assessment. Please try again.' })
    }
    setAiLoading(false)
  }

  return (
    <div className="space-y-6">
      {!aiResult && <NotTaxAdviceDisclaimer />}
      <div className="space-y-3">
        {IR35_QUESTIONS.map(q => (
          <div key={q.number} className="bg-surface-sunken rounded-xl p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn(
                    'text-xs font-medium px-1.5 py-0.5 rounded',
                    q.importance === 'HIGH'
                      ? 'bg-danger-100 text-danger-700'
                      : 'bg-warning-100 text-warning-800',
                  )}>
                    {q.importance}
                  </span>
                  <span className="text-xs text-text-secondary">{q.label}</span>
                </div>
                <p className="text-sm text-text-primary">{q.text}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  type="button"
                  size="xs"
                  intent={answers[q.number] === true ? 'primary' : 'secondary'}
                  onClick={() => setAnswers(prev => ({ ...prev, [q.number]: true }))}
                >
                  Yes
                </Button>
                <Button
                  type="button"
                  size="xs"
                  intent={answers[q.number] === false ? 'primary' : 'secondary'}
                  onClick={() => setAnswers(prev => ({ ...prev, [q.number]: false }))}
                >
                  No
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {allAnswered && calculatedStatus && (
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-3">
            <span className="text-sm text-text-secondary">Calculated status:</span>
            <Badge status={calculatedStatus} />
          </div>
          <div className="flex gap-2">
            {onSave && (
              <Button type="button" intent="secondary" size="sm" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save assessment'}
              </Button>
            )}
            <Button type="button" intent="primary" size="sm" onClick={handleAIAssess} disabled={aiLoading}>
              {aiLoading ? 'Analysing...' : 'Assess with AI'}
            </Button>
          </div>
        </div>
      )}

      {aiResult && !aiResult.error && (
        <div className="bg-surface-card border border-border-default rounded-xl p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-primary">IR35 Assessment</h3>
            <AIFlag />
          </div>

          <div>
            <p className={sectionLabelClass}>Verdict</p>
            <p className="text-sm text-text-primary leading-relaxed">{aiResult.verdict}</p>
          </div>

          {aiResult.risk_level && (
            <div>
              <p className={cn(sectionLabelClass, 'mb-2')}>Risk Level</p>
              <IR35RiskBar level={aiResult.risk_level} />
              <p className="text-sm text-text-secondary mt-2">{aiResult.risk_level_explanation}</p>
            </div>
          )}

          {aiResult.next_steps?.length > 0 && (
            <div>
              <p className={cn(sectionLabelClass, 'mb-2.5')}>Next Steps</p>
              <ol className="space-y-2.5">
                {aiResult.next_steps.map((step: string, i: number) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-text-primary">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-brand-primary text-text-on-dark text-xs font-bold flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="border-t border-border-subtle pt-3">
            <NotTaxAdviceDisclaimer />
          </div>
        </div>
      )}

      {aiResult?.error && (
        <Alert intent="danger">{aiResult.error}</Alert>
      )}
    </div>
  )
}
