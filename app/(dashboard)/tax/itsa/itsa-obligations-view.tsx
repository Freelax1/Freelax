'use client'

// Client view for the ITSA obligations page.
// Renders alerts, empty states, and obligation cards. All Supabase / HMRC
// fetching happens on the server in page.tsx.

import type { ReactNode } from 'react'
import Link from 'next/link'
import { CalendarBlank } from '@phosphor-icons/react'
import PageHeader from '@/components/ui/page-header'
import SectionCard from '@/components/ui/section-card'
import Alert from '@/components/ui/alert'
import { ButtonLink } from '@/components/ui/button'
import PageLayout from '@/components/page-layout'
import { cn } from '@/lib/utils'

export type ItsaObligationView = {
  periodKey: string
  start:     string  // ISO YYYY-MM-DD
  end:       string
  due:       string
  status:    'Open' | 'Fulfilled'
  quarter:   1 | 2 | 3 | 4 | null
}

interface ItsaObligationsViewProps {
  state:
    | { kind: 'unauthorised' }
    | { kind: 'no-nino' }
    | { kind: 'no-connection' }
    | { kind: 'no-business' }
    | { kind: 'error'; message: string }
    | { kind: 'obligations'; obligations: ItsaObligationView[] }
}

function fmtDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z')
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

const ITSA_SUBTITLE = 'Quarterly updates for self-employment income.'

export default function ItsaObligationsView({ state }: ItsaObligationsViewProps) {
  let content: ReactNode

  if (state.kind === 'unauthorised') {
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
              const dueLabel = fmtDate(ob.due)
              const today    = new Date()
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
