'use client'

// Client view + data fetcher for the ITSA obligations page.
// Collects browser fraud-prevention context on mount, then fetches obligations
// from /api/hmrc/itsa/obligations (which forwards _fp to HMRC with the request).

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

export type ItsaObligationView = {
  periodKey: string
  start:     string
  end:       string
  due:       string
  status:    'Open' | 'Fulfilled'
  quarter:   1 | 2 | 3 | 4 | null
}

type ViewState =
  | { kind: 'loading' }
  | { kind: 'unauthorised' }
  | { kind: 'no-nino' }
  | { kind: 'no-connection' }
  | { kind: 'no-business' }
  | { kind: 'error'; message: string }
  | { kind: 'obligations'; obligations: ItsaObligationView[] }

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

const ITSA_SUBTITLE = 'Quarterly updates for self-employment income.'

export default function ItsaObligationsView() {
  const [state, setState] = useState<ViewState>({ kind: 'loading' })

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/hmrc/itsa/obligations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ _fp: collectFp() }),
        })
        const json = await res.json().catch(() => ({}))
        if (cancelled) return
        if (res.status === 401)              { setState({ kind: 'unauthorised' }); return }
        if (json?.kind === 'no-nino')        { setState({ kind: 'no-nino' }); return }
        if (json?.kind === 'no-connection')  { setState({ kind: 'no-connection' }); return }
        if (json?.kind === 'no-business')    { setState({ kind: 'no-business' }); return }
        if (!res.ok || json?.error) {
          setState({ kind: 'error', message: json?.error ?? `HTTP ${res.status}` })
          return
        }
        setState({ kind: 'obligations', obligations: json.obligations ?? [] })
      } catch (e) {
        if (!cancelled) {
          setState({ kind: 'error', message: e instanceof Error ? e.message : 'Could not load ITSA obligations.' })
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
        <PageHeader title="MTD for Income Tax" />
        <div role="status" aria-live="polite">
          <span className="sr-only">Loading MTD obligations.</span>
          <PanelCardSkeleton className="min-h-[200px]" />
        </div>
      </>
    )
  } else if (state.kind === 'unauthorised') {
    content = (
      <>
        <PageHeader title="MTD for Income Tax" />
        <Alert intent="warning">You need to be signed in to view MTD submissions.</Alert>
      </>
    )
  } else if (state.kind === 'no-nino') {
    content = (
      <>
        <PageHeader title="MTD for Income Tax" />
        <Alert intent="warning">
          Add your National Insurance Number in{' '}
          <Link href="/settings?tab=HMRC" className="underline font-medium">Settings → HMRC</Link>
          {' '}to enable MTD submissions.
        </Alert>
      </>
    )
  } else if (state.kind === 'no-connection') {
    content = (
      <>
        <PageHeader title="MTD for Income Tax" />
        <Alert intent="warning">
          Connect your HMRC account in{' '}
          <Link href="/settings?tab=HMRC" className="underline font-medium">Settings → HMRC</Link>.
        </Alert>
      </>
    )
  } else if (state.kind === 'no-business') {
    content = (
      <>
        <PageHeader title="MTD for Income Tax" subtitle={ITSA_SUBTITLE} />
        <Alert intent="warning">No self-employment business found on your HMRC account.</Alert>
      </>
    )
  } else if (state.kind === 'error') {
    content = (
      <>
        <PageHeader title="MTD for Income Tax" subtitle={ITSA_SUBTITLE} />
        <Alert intent="danger" title="Could not load MTD obligations">
          {state.message}
        </Alert>
      </>
    )
  } else {
    const { obligations } = state
    const open = obligations.filter(o => o.status === 'Open')

    content = (
      <>
        <PageHeader title="MTD for Income Tax" subtitle={ITSA_SUBTITLE} />

        {open.length === 0 && (
          <SectionCard title="MTD obligations">
            <div className="py-10 flex flex-col items-center text-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-surface-sunken flex items-center justify-center">
                <CalendarBlank weight="regular" className="w-5 h-5 text-text-secondary" aria-hidden="true" />
              </div>
              <p className="text-sm text-text-secondary">No MTD submissions currently due.</p>
            </div>
          </SectionCard>
        )}

        {open.length > 0 && (
          <div className="grid lg:grid-cols-2 gap-5">
            {open.map(ob => {
              const periodLabel = ob.quarter
                ? `Q${ob.quarter} — ${fmtDate(ob.start)} to ${fmtDate(ob.end)}`
                : `${fmtDate(ob.start)} – ${fmtDate(ob.end)}`
              const dueLabel  = fmtDate(ob.due)
              const today     = new Date()
              const isOverdue = new Date(ob.due + 'T23:59:59Z') < today
              return (
                <SectionCard key={ob.periodKey} title={periodLabel}>
                  <div className="py-4 flex items-start justify-between gap-4">
                    <div className="space-y-1.5">
                      <span className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                        isOverdue
                          ? 'bg-danger-50 text-danger-600'
                          : 'bg-warning-50 text-warning-800',
                      )}>
                        {isOverdue ? 'Overdue' : 'Open'}
                      </span>
                      <p className="text-xs text-text-secondary">
                        Due {dueLabel}
                      </p>
                    </div>
                    <ButtonLink
                      href={{
                        pathname: `/tax/itsa/${encodeURIComponent(ob.periodKey)}`,
                        query: { start: ob.start, end: ob.end, due: ob.due },
                      }}
                      intent="secondary"
                      size="sm"
                      aria-label={`Prepare submission for ${periodLabel}`}
                    >
                      Prepare submission
                    </ButtonLink>
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
