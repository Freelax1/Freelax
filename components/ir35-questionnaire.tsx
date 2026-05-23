'use client'

import { useState } from 'react'
import { IR35_QUESTIONS, calculateIR35 } from '@/lib/ir35-scoring'
import Badge from '@/components/badge'
import type { IR35Answer, IR35Status } from '@/types/database'
import AIFlag from '@/components/ai-flag'
import NotTaxAdviceDisclaimer from '@/components/not-tax-advice'

interface Props {
  projectId: string
  initialAnswers?: IR35Answer[]
  initialStatus?: IR35Status
  onSave?: (answers: IR35Answer[], status: IR35Status) => Promise<void>
}

function IR35RiskBar({ level }: { level: 'Low' | 'Medium' | 'High' }) {
  const segments: { key: 'Low' | 'Medium' | 'High'; bg: string; border: string; color: string }[] = [
    { key: 'Low',    bg: 'var(--success-50)', border: 'var(--success-200)', color: 'var(--success-600)' },
    { key: 'Medium', bg: 'var(--warning-50)', border: 'var(--warning-200)', color: 'var(--warning-600)' },
    { key: 'High',   bg: 'var(--danger-50)',  border: 'var(--danger-200)',  color: 'var(--danger-600)'  },
  ]
  return (
    <div className="flex gap-2">
      {segments.map(s => {
        const active = level === s.key
        return (
          <div key={s.key} className="py-1.5 text-center" style={{
            flex: 1, borderRadius: 8,
            border: `1px solid ${active ? s.border : 'var(--border-default)'}`,
            background: active ? s.bg : 'var(--surface-sunken)',
            opacity: active ? 1 : 0.45,
          }}>
            <span style={{ fontSize: 'var(--text-caption)', fontWeight: 600, letterSpacing: '0', color: active ? s.color : 'var(--text-muted)' }}>
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
    } catch (e) {
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
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${q.importance === 'HIGH' ? 'bg-danger-100 text-danger-700' : 'bg-warning-100 text-warning-800'}`}>
                    {q.importance}
                  </span>
                  <span className="text-xs text-text-secondary">{q.label}</span>
                </div>
                <p className="text-sm text-text-primary">{q.text}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => setAnswers(prev => ({ ...prev, [q.number]: true }))}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                    answers[q.number] === true
                      ? 'bg-forest-600 text-white'
                      : 'bg-surface-card border border-border-default text-text-secondary hover:bg-surface-sunken'
                  }`}
                >
                  Yes
                </button>
                <button
                  onClick={() => setAnswers(prev => ({ ...prev, [q.number]: false }))}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                    answers[q.number] === false && answers[q.number] !== undefined
                      ? 'bg-forest-600 text-white'
                      : 'bg-surface-card border border-border-default text-text-secondary hover:bg-surface-sunken'
                  }`}
                >
                  No
                </button>
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
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-forest-900 text-white rounded-xl text-sm font-medium hover:bg-forest-800 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save assessment'}
              </button>
            )}
            <button
              onClick={handleAIAssess}
              disabled={aiLoading}
              className="px-4 py-2 bg-forest-600 text-white rounded-xl text-sm font-medium hover:bg-forest-700 disabled:opacity-50"
            >
              {aiLoading ? 'Analysing...' : 'Assess with AI'}
            </button>
          </div>
        </div>
      )}

      {aiResult && !aiResult.error && (
        <div className="bg-surface-card border border-border-default rounded-xl p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-text-primary">IR35 Assessment</h3>
            <AIFlag />
          </div>

          {/* Verdict */}
          <div>
            <p className="text-xs font-semibold text-text-secondary mb-1.5">Verdict</p>
            <p className="text-sm text-text-primary leading-relaxed">{aiResult.verdict}</p>
          </div>

          {/* Risk level */}
          {aiResult.risk_level && (
            <div>
              <p className="text-xs font-semibold text-text-secondary mb-2">Risk Level</p>
              <IR35RiskBar level={aiResult.risk_level} />
              <p className="text-sm text-text-secondary mt-2">{aiResult.risk_level_explanation}</p>
            </div>
          )}

          {/* Next steps */}
          {aiResult.next_steps?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-text-secondary mb-2.5">Next Steps</p>
              <ol className="space-y-2.5">
                {aiResult.next_steps.map((step: string, i: number) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-text-primary">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-forest-900 text-white text-xs font-semibold flex items-center justify-center mt-0.5">{i + 1}</span>
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
        <div className="bg-danger-50 border border-danger-200 rounded-xl p-4">
          <p className="text-sm text-danger-600">{aiResult.error}</p>
        </div>
      )}
    </div>
  )
}
