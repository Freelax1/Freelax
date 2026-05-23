'use client'

import { useState } from 'react'
import { Sparkle, CircleNotch, X, ArrowCounterClockwise } from '@phosphor-icons/react'
import NotTaxAdviceDisclaimer from '@/components/not-tax-advice'

interface IR35ExplainButtonProps {
  projectId: string
  answers: any[]
  calculatedStatus: string
}

interface ExplainResult {
  verdict: string
  risk_level: 'Low' | 'Medium' | 'High'
  risk_level_explanation: string
  next_steps: string[]
}

function RiskBar({ level }: { level: 'Low' | 'Medium' | 'High' }) {
  const segments = [
    { key: 'Low',    activeColor: '#1D6B35', activeBg: '#F0FDF4', activeBorder: '#B8DFC3' },
    { key: 'Medium', activeColor: '#9A7B0A', activeBg: '#FEFCE8', activeBorder: '#F5E29B' },
    { key: 'High',   activeColor: '#C0392B', activeBg: '#FDECEA', activeBorder: '#F5C0BB' },
  ] as const
  return (
    <div className="flex gap-2">
      {segments.map(s => {
        const active = level === s.key
        return (
          <div key={s.key} className="flex-1 py-[7px] rounded-lg text-center" style={{
            border: `1px solid ${active ? s.activeBorder : '#E2E8F0'}`,
            background: active ? s.activeBg : '#F8FAFC',
            opacity: active ? 1 : 0.45,
          }}>
            <span className="text-caption font-semibold tracking-wide" style={{ color: active ? s.activeColor : '#94A3B8' }}>
              {s.key.toUpperCase()}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default function IR35ExplainButton({ projectId, answers, calculatedStatus }: IR35ExplainButtonProps) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ExplainResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  const cacheKey = `fd_ir35_${projectId}_${calculatedStatus}`

  async function handleExplain(force = false) {
    if (!force) {
      try {
        const cached = sessionStorage.getItem(cacheKey)
        if (cached) { setResult(JSON.parse(cached)); setOpen(true); return }
      } catch {}
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ai/ir35-explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, answers, calculatedStatus }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); setLoading(false); return }
      setResult(data)
      setOpen(true)
      try { sessionStorage.setItem(cacheKey, JSON.stringify(data)) } catch {}
    } catch {
      setError('Failed to get AI explanation. Please try again.')
    }
    setLoading(false)
  }

  return (
    <>
      <button
        onClick={() => handleExplain()}
        disabled={loading || !answers?.length}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-forest-900 text-white rounded-xl text-xs font-medium hover:bg-forest-800 disabled:opacity-40 transition-colors"
      >
        {loading
          ? <CircleNotch weight="regular" className="w-3.5 h-3.5 animate-spin" />
          : <Sparkle weight="regular" className="w-3.5 h-3.5" />}
        {loading ? 'Analysing...' : 'AI Explain'}
      </button>

      {error && (
        <p className="text-xs text-danger-500 mt-1">{error}</p>
      )}

      {/* Result panel */}
      {open && result && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
          <div className="bg-surface-card rounded-xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-xl">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle sticky top-0 bg-surface-card rounded-t-2xl">
              <div className="flex items-center gap-2">
                <Sparkle weight="regular" className="w-4 h-4 text-text-secondary" />
                <span className="font-semibold text-text-primary text-sm">IR35 AI Analysis</span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => handleExplain(true)} title="Refresh" className="p-1.5 hover:bg-surface-sunken rounded-full transition-colors">
                  <ArrowCounterClockwise weight="regular" className="w-4 h-4 text-text-secondary" />
                </button>
                <button onClick={() => setOpen(false)} className="p-1.5 hover:bg-surface-sunken rounded-full transition-colors">
                  <X weight="regular" className="w-4 h-4 text-text-secondary" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-5">
              {/* Verdict */}
              <div>
                <p className="text-xs font-semibold text-text-secondary mb-1.5">Verdict</p>
                <p className="text-sm text-text-primary leading-relaxed">{result.verdict}</p>
              </div>

              {/* Risk level */}
              <div>
                <p className="text-xs font-semibold text-text-secondary mb-2">Risk Level</p>
                <RiskBar level={result.risk_level} />
                <p className="text-sm text-text-secondary mt-2">{result.risk_level_explanation}</p>
              </div>

              {/* Next steps */}
              {result.next_steps?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-text-secondary mb-2.5">Next Steps</p>
                  <ol className="space-y-2.5">
                    {result.next_steps.map((step, i) => (
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
          </div>
        </div>
      )}
    </>
  )
}
