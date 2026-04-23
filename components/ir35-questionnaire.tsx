'use client'

import { useState } from 'react'
import { IR35_QUESTIONS, calculateIR35 } from '@/lib/ir35-scoring'
import Badge from '@/components/badge'
import type { IR35Answer, IR35Status } from '@/types/database'
import AIFlag from '@/components/ai-flag'

interface Props {
  projectId: string
  initialAnswers?: IR35Answer[]
  initialStatus?: IR35Status
  onSave?: (answers: IR35Answer[], status: IR35Status) => Promise<void>
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
      <div className="space-y-3">
        {IR35_QUESTIONS.map(q => (
          <div key={q.number} className="bg-slate-50 rounded-lg p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${q.importance === 'HIGH' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                    {q.importance}
                  </span>
                  <span className="text-xs text-slate-500">{q.label}</span>
                </div>
                <p className="text-sm text-slate-700">{q.text}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => setAnswers(prev => ({ ...prev, [q.number]: true }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    answers[q.number] === true
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Yes
                </button>
                <button
                  onClick={() => setAnswers(prev => ({ ...prev, [q.number]: false }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    answers[q.number] === false && answers[q.number] !== undefined
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
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
            <span className="text-sm text-slate-600">Calculated status:</span>
            <Badge status={calculatedStatus} />
          </div>
          <div className="flex gap-2">
            {onSave && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save assessment'}
              </button>
            )}
            <button
              onClick={handleAIAssess}
              disabled={aiLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {aiLoading ? 'Analysing...' : 'Assess with AI'}
            </button>
          </div>
        </div>
      )}

      {aiResult && !aiResult.error && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-slate-900">IR35 Assessment — AI Analysis</h3>
            <AIFlag />
          </div>
          <p className="text-sm text-slate-700">{aiResult.summary}</p>
          {aiResult.risk_factors?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-600 uppercase mb-1">Risk factors</p>
              <ul className="space-y-1">{aiResult.risk_factors.map((r: string, i: number) => (
                <li key={i} className="text-sm text-slate-600 flex gap-2"><span className="text-red-500">•</span>{r}</li>
              ))}</ul>
            </div>
          )}
          {aiResult.protective_factors?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-600 uppercase mb-1">Protective factors</p>
              <ul className="space-y-1">{aiResult.protective_factors.map((r: string, i: number) => (
                <li key={i} className="text-sm text-slate-600 flex gap-2"><span className="text-green-500">•</span>{r}</li>
              ))}</ul>
            </div>
          )}
          {aiResult.recommendations?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-600 uppercase mb-1">Recommendations</p>
              <ul className="space-y-1">{aiResult.recommendations.map((r: string, i: number) => (
                <li key={i} className="text-sm text-slate-600 flex gap-2"><span className="text-blue-500">→</span>{r}</li>
              ))}</ul>
            </div>
          )}
          <p className="text-xs text-slate-400 border-t border-blue-200 pt-3">{aiResult.disclaimer}</p>
        </div>
      )}

      {aiResult?.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-600">{aiResult.error}</p>
        </div>
      )}
    </div>
  )
}
