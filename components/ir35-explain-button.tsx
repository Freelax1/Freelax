'use client'

import { useState } from 'react'
import { Sparkles, Loader2, X, AlertTriangle, ShieldCheck, Info } from 'lucide-react'
import NotTaxAdviceDisclaimer from '@/components/not-tax-advice'

interface IR35ExplainButtonProps {
  projectId: string
  answers: any[]
  calculatedStatus: string
}

interface ExplainResult {
  summary: string
  risk_factors: string[]
  protective_factors: string[]
  recommendations: string[]
  disclaimer: string
}

export default function IR35ExplainButton({ projectId, answers, calculatedStatus }: IR35ExplainButtonProps) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ExplainResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  async function handleExplain() {
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
    } catch {
      setError('Failed to get AI explanation. Please try again.')
    }
    setLoading(false)
  }

  return (
    <>
      <button
        onClick={handleExplain}
        disabled={loading || !answers?.length}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 disabled:opacity-40 transition-colors"
      >
        {loading
          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : <Sparkles className="w-3.5 h-3.5" />}
        {loading ? 'Analysing...' : 'AI Explain'}
      </button>

      {error && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}

      {/* Result panel */}
      {open && result && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-slate-500" />
                <span className="font-semibold text-slate-900 text-sm">IR35 AI Analysis</span>
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Summary */}
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-sm text-slate-700 leading-relaxed">{result.summary}</p>
              </div>

              {/* Risk factors */}
              {result.risk_factors?.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                    <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Risk factors</p>
                  </div>
                  <ul className="space-y-1.5">
                    {result.risk_factors.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                        <span className="text-red-400 mt-0.5 shrink-0">•</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Protective factors */}
              {result.protective_factors?.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
                    <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Working in your favour</p>
                  </div>
                  <ul className="space-y-1.5">
                    {result.protective_factors.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                        <span className="text-green-400 mt-0.5 shrink-0">•</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              {result.recommendations?.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Info className="w-3.5 h-3.5 text-blue-500" />
                    <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Recommendations</p>
                  </div>
                  <ul className="space-y-1.5">
                    {result.recommendations.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                        <span className="text-blue-400 mt-0.5 shrink-0">{i + 1}.</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Disclaimer */}
              <p className="text-xs text-slate-400 border-t border-slate-100 pt-3 leading-relaxed">
                {result.disclaimer}
              </p>
              <NotTaxAdviceDisclaimer />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
