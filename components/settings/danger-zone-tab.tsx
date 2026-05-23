'use client'

import { useState } from 'react'

type ExportState = 'idle' | 'loading' | 'success' | 'error'

export default function DangerZoneTab() {
  const [exportState, setExportState] = useState<ExportState>('idle')
  const [exportError, setExportError] = useState<string | null>(null)

  async function handleExport() {
    setExportState('loading')
    setExportError(null)
    try {
      const res = await fetch('/api/export/all')
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      const date = new Date().toISOString().slice(0, 10)
      a.href     = url
      a.download = `freelax-data-export-${date}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
      setExportState('success')
      setTimeout(() => setExportState('idle'), 4000)
    } catch {
      setExportError('Export failed. Please try again or contact support@freelax.co.uk.')
      setExportState('error')
    }
  }

  return (
    <div className="space-y-4">

      {/* Data export — not dangerous, shown separately */}
      <div className="pb-6 border-b border-border-subtle last:border-0 last:pb-0">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-text-primary mb-1">Export your data</h2>
            <p className="text-sm text-text-muted mb-4">
              Download a complete copy of everything Freelax holds about you —
              your legal right under UK GDPR. Opens in Excel or Google Sheets.
            </p>

            {/* What's included */}
            <div className="flex flex-wrap gap-2 mb-4">
              {[
                'Invoices', 'Line items', 'Quotes',
                'Expenses', 'Clients', 'Projects',
                'Mileage', 'Profile',
              ].map(label => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1 text-xs font-medium bg-surface-sunken border border-border-default text-text-secondary px-2.5 py-1 rounded-lg"
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="var(--success-500)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {label}
                </span>
              ))}
            </div>

            <p className="text-xs text-text-secondary">
              Delivered as a ZIP file containing one CSV per data type, plus a README.
              All records, all time — not just the current tax year.
            </p>
          </div>
        </div>

        {exportError && (
          <p className="mt-3 text-sm text-danger-600 bg-danger-50 border border-danger-200 rounded-xl px-4 py-3">
            {exportError}
          </p>
        )}

        <div className="mt-4">
          <button
            onClick={handleExport}
            disabled={exportState === 'loading'}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              exportState === 'success'
                ? 'bg-success-50 text-success-700 border border-success-200 cursor-default'
                : exportState === 'loading'
                ? 'bg-surface-sunken text-text-secondary border border-border-default cursor-not-allowed'
                : 'bg-forest-900 text-white hover:bg-forest-900 border border-transparent'
            }`}
          >
            {exportState === 'loading' && (
              <svg className="animate-spin" width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="5" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2"/>
                <path d="M7 2a5 5 0 0 1 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            )}
            {exportState === 'success' && (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 7l3.5 3.5 6.5-6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
            {exportState === 'loading'  && 'Preparing export…'}
            {exportState === 'success'  && 'Download started'}
            {exportState === 'idle'     && 'Download export'}
            {exportState === 'error'    && 'Try again'}
          </button>
        </div>
      </div>

      {/* Danger zone */}
      <div className="pb-6 border-b border-border-subtle last:border-0 last:pb-0">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-sm font-medium text-danger-700">Delete account</p>
            <p className="text-xs text-text-secondary mt-0.5">
              Permanently delete your account and all associated data. This cannot be undone.
            </p>
          </div>
          <button className="px-4 py-2 border border-danger-200 rounded-lg text-sm text-danger-600 hover:bg-danger-50 transition-colors">
            Delete account
          </button>
        </div>
      </div>

    </div>
  )
}
