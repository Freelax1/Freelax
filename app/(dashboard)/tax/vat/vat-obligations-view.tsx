'use client'

// Client view for the VAT obligations page.
// Renders alerts, empty states, and obligation cards. All Supabase / HMRC
// fetching happens on the server in page.tsx — this component receives the
// computed data and only renders.

import type { ReactNode } from 'react'
import Link from 'next/link'
import { CalendarBlank } from '@phosphor-icons/react'
import PageHeader from '@/components/ui/page-header'
import SectionCard from '@/components/ui/section-card'
import Alert from '@/components/ui/alert'
import { ButtonLink } from '@/components/ui/button'
import PageLayout from '@/components/page-layout'
import { cn } from '@/lib/utils'

export type ObligationView = {
  start:     string
  end:       string
  due:       string
  status:    'O' | 'F'
  periodKey: string
}

interface VatObligationsViewProps {
  state:
    | { kind: 'unauthorised' }
    | { kind: 'no-vrn' }
    | { kind: 'no-connection' }
    | { kind: 'error'; message: string }
    | { kind: 'ok'; obligations: ObligationView[] }
}

function fmtDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z')
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

const VAT_SUBTITLE =
  'Open VAT obligations from HMRC. Prepare and submit each return when its window opens.'

export default function VatObligationsView({ state }: VatObligationsViewProps) {
  let content: ReactNode

  if (state.kind === 'unauthorised') {
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
