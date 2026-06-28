'use client'

// Client view + data fetcher for the VAT obligations page.
// Collects browser fraud-prevention context on mount, then fetches obligations
// from /api/hmrc/vat/obligations (which forwards _fp to HMRC with the request).

import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { CalendarBlank } from '@phosphor-icons/react'
import PageHeader from '@/components/ui/page-header'
import SectionCard from '@/components/ui/section-card'
import Alert from '@/components/ui/alert'
import { ButtonLink } from '@/components/ui/button'
import PageLayout from '@/components/page-layout'
import { PanelCardSkeleton } from '@/components/ui/content-skeletons'
import { cn } from '@/lib/utils'

export type ObligationView = {
  start:     string
  end:       string
  due:       string
  status:    'O' | 'F'
  periodKey: string
}

type ViewState =
  | { kind: 'loading' }
  | { kind: 'unauthorised' }
  | { kind: 'no-vrn' }
  | { kind: 'no-connection' }
  | { kind: 'error'; message: string }
  | { kind: 'ok'; obligations: ObligationView[] }

function collectFp() {
  if (typeof window === 'undefined') return {}
  let deviceId = ''
  try {
    deviceId = localStorage.getItem('freelax_device_id') ?? ''
    if (!deviceId) {
      deviceId = crypto.randomUUID()
      localStorage.setItem('freelax_device_id', deviceId)
    }
  } catch {}
  const plugins = Array.from(navigator.plugins).map(p => p.name).filter(Boolean).join(',')
  return {
    timezone:       Intl.DateTimeFormat().resolvedOptions().timeZone,
    screenWidth:    window.screen.width,
    screenHeight:   window.screen.height,
    scalingFactor:  window.devicePixelRatio,
    colourDepth:    window.screen.colorDepth,
    windowWidth:    window.innerWidth,
    windowHeight:   window.innerHeight,
    doNotTrack:     navigator.doNotTrack ?? 'not-set',
    userAgent:      navigator.userAgent,
    browserPlugins: plugins || undefined,
    deviceId,
  }
}

function fmtDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z')
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

const VAT_SUBTITLE =
  'Open VAT obligations from HMRC. Prepare and submit each return when its window opens.'

export default function VatObligationsView() {
  const [state, setState] = useState<ViewState>({ kind: 'loading' })

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/hmrc/vat/obligations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ _fp: collectFp() }),
        })
        const json = await res.json().catch(() => ({}))
        if (cancelled) return
        if (res.status === 401)               { setState({ kind: 'unauthorised' }); return }
        if (json?.kind === 'no-vrn')          { setState({ kind: 'no-vrn' }); return }
        if (json?.kind === 'no-connection')   { setState({ kind: 'no-connection' }); return }
        if (!res.ok || json?.error) {
          setState({ kind: 'error', message: json?.error ?? `HTTP ${res.status}` })
          return
        }
        setState({ kind: 'ok', obligations: json.obligations ?? [] })
      } catch (e) {
        if (!cancelled) {
          setState({ kind: 'error', message: e instanceof Error ? e.message : 'Could not load VAT obligations.' })
        }
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  let content: ReactNode

  if (state.kind === 'loading') {
    content = (
      <>
        <PageHeader title="VAT Returns" />
        <div role="status" aria-live="polite">
          <span className="sr-only">Loading VAT obligations.</span>
          <PanelCardSkeleton className="min-h-[200px]" />
        </div>
      </>
    )
  } else if (state.kind === 'unauthorised') {
    content = (
      <>
        <PageHeader title="VAT Returns" />
        <Alert intent="warning">You need to be signed in to view VAT returns.</Alert>
      </>
    )
  } else if (state.kind === 'no-vrn') {
    content = (
      <>
        <PageHeader title="VAT Returns" />
        <Alert intent="warning">
          Add your VAT Registration Number in{' '}
          <Link href="/settings?tab=HMRC" className="underline font-medium">Settings → HMRC</Link>
          {' '}to enable VAT submissions.
        </Alert>
      </>
    )
  } else if (state.kind === 'no-connection') {
    content = (
      <>
        <PageHeader title="VAT Returns" />
        <Alert intent="warning">
          Connect your HMRC account in{' '}
          <Link href="/settings?tab=HMRC" className="underline font-medium">Settings → HMRC</Link>.
        </Alert>
      </>
    )
  } else if (state.kind === 'error') {
    content = (
      <>
        <PageHeader title="VAT Returns" subtitle={VAT_SUBTITLE} />
        <Alert intent="danger" title="Could not load VAT obligations">
          {state.message}
        </Alert>
      </>
    )
  } else {
    const { obligations } = state
    content = (
      <>
        <PageHeader title="VAT Returns" subtitle={VAT_SUBTITLE} />

        {obligations.length === 0 && (
          <SectionCard title="VAT obligations">
            <div className="py-10 flex flex-col items-center text-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-surface-sunken flex items-center justify-center">
                <CalendarBlank weight="regular" className="w-5 h-5 text-text-secondary" aria-hidden="true" />
              </div>
              <p className="text-sm text-text-secondary">No VAT returns due.</p>
            </div>
          </SectionCard>
        )}

        {obligations.length > 0 && (
          <div className="grid lg:grid-cols-2 gap-5">
            {obligations.map(ob => {
              const periodLabel = `${fmtDate(ob.start)} – ${fmtDate(ob.end)}`
              const dueLabel    = fmtDate(ob.due)
              const isOpen      = ob.status === 'O'
              return (
                <SectionCard key={ob.periodKey} title={periodLabel}>
                  <div className="py-4 flex items-start justify-between gap-4">
                    <div className="space-y-1.5">
                      <span className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                        isOpen
                          ? 'bg-warning-50 text-warning-800'
                          : 'bg-success-50 text-success-700',
                      )}>
                        {isOpen ? 'Open' : 'Fulfilled'}
                      </span>
                      <p className="text-xs text-text-secondary">
                        Due {dueLabel}
                      </p>
                    </div>
                    {isOpen && (
                      <ButtonLink
                        href={{
                          pathname: `/tax/vat/${encodeURIComponent(ob.periodKey)}`,
                          query: { start: ob.start, end: ob.end, due: ob.due },
                        }}
                        intent="secondary"
                        size="sm"
                        aria-label={`Prepare return for ${periodLabel}`}
                      >
                        Prepare return
                      </ButtonLink>
                    )}
                  </div>
                </SectionCard>
              )
            })}
          </div>
        )}
      </>
    )
  }

  return (
    <PageLayout className="space-y-6">
      {content}
    </PageLayout>
  )
}
