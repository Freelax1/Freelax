'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { fetchMileageEntries, deleteMileageEntry, calcMileageRelief, calcMileageRate, HMRC_THRESHOLD, HMRC_RATE_FIRST, HMRC_RATE_AFTER } from '@/lib/api/mileage'
import { formatCurrency, getCurrentTaxYear } from '@/lib/tax-calculations'
import { fetchCurrentUser } from '@/lib/api/users'
import { PageHeader, ListMetrics } from '@/components/ui'
import Button, { buttonVariants } from '@/components/ui/button'
import SlideOver from '@/components/slide-over'
import MileageForm from '@/components/mileage-form'
import { Car, Trash, Lock, ArrowRight } from '@phosphor-icons/react'
import type { MileageEntry } from '@/types/database'
import { useUndoDelete } from '@/hooks/use-undo-delete'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

export default function MileagePage() {
  const [mileage, setMileage]           = useState<MileageEntry[]>([])
  const [loading, setLoading]           = useState(true)
  const [slideOpen, setSlideOpen]       = useState(false)
  const [userId, setUserId]             = useState('')
  const [canUseMileage, setCanUseMileage] = useState(false)

  const { start, end, label } = getCurrentTaxYear()
  const taxYearStart = start.getFullYear()

  async function load() {
    const user = await fetchCurrentUser()
    if (user) {
      setUserId(user.id)
      const supabase = createClient()
      const { data: planProfile } = await supabase
        .from('users')
        .select('subscription_plan')
        .eq('id', user.id)
        .single()
      setCanUseMileage(['solo', 'pro', 'studio'].includes(planProfile?.subscription_plan ?? 'free'))
      const entries = await fetchMileageEntries(user.id, taxYearStart)
      setMileage(entries)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const { pendingIds: mileageDeletePending, scheduleDelete: scheduleMileageDelete } = useUndoDelete(
    async (entry: MileageEntry) => deleteMileageEntry(entry.id),
    (entry: MileageEntry) => String(entry.description ?? 'Journey'),
    load,
  )

  const totalMiles         = mileage.reduce((s, e) => s + Number(e.miles), 0)
  const totalMileageRelief = calcMileageRelief(totalMiles)
  const visibleMileage     = mileage.filter(e => !mileageDeletePending.has(e.id))

  return (
    <div>
      <PageHeader
        title="Mileage"
        subtitle={loading ? '' : `${mileage.length} journey${mileage.length !== 1 ? 's' : ''} · ${totalMiles.toLocaleString('en-GB')} mi · ${label}`}
        action={
          canUseMileage && (
            <Button type="button" intent="primary" size="sm" onClick={() => setSlideOpen(true)}>
              Log journey
            </Button>
          )
        }
      />

      {/* Upsell gate */}
      {!loading && !canUseMileage && (
        <div className="flex flex-col items-center justify-center py-16 rounded-xl bg-surface-sunken text-center">
          <div className="w-10 h-10 rounded-full bg-surface-card border border-border-default flex items-center justify-center mb-3">
            <Lock weight="regular" className="w-5 h-5 text-text-secondary" />
          </div>
          <p className="text-sm font-medium text-text-primary mb-1">
            Mileage tracking is available on the Solo plan and above
          </p>
          <Link
            href="/settings?tab=billing"
            className={cn(buttonVariants({ intent: 'primary', size: 'sm' }), 'no-underline mt-3')}
          >
            Upgrade to Solo <ArrowRight weight="regular" className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Stats */}
      {!loading && canUseMileage && (
        <>
          <ListMetrics
            items={[
              { label: 'Total miles', value: `${totalMiles.toLocaleString('en-GB')} mi` },
              { label: 'Tax relief', value: formatCurrency(totalMileageRelief), highlight: 'positive' },
              { label: 'Current rate', value: `${(calcMileageRate(totalMiles) * 100).toFixed(0)}p/mile` },
            ]}
          />
          <div className="bg-surface-sunken border border-border-default rounded-xl px-4 py-3 text-xs text-text-secondary mb-5">
            HMRC approved mileage: <strong className="text-text-primary">{(HMRC_RATE_FIRST * 100).toFixed(0)}p/mile</strong> first {HMRC_THRESHOLD.toLocaleString()} miles,
            then <strong className="text-text-primary">{(HMRC_RATE_AFTER * 100).toFixed(0)}p/mile</strong>.
            {totalMiles > 8000 && totalMiles < HMRC_THRESHOLD && (
              <span className="ml-2 text-warning-800 font-medium">{(HMRC_THRESHOLD - totalMiles).toLocaleString()} miles from the rate change.</span>
            )}
          </div>
        </>
      )}

      {/* Empty state */}
      {!loading && canUseMileage && !mileage.length && (
        <div className="bg-surface-card rounded-xl border border-border-default p-12 text-center">
          <Car weight="regular" className="w-10 h-10 text-text-muted mx-auto mb-3" />
          <p className="text-text-secondary text-sm font-medium mb-1">No journeys logged yet</p>
          <p className="text-text-secondary text-xs">Business mileage at {(HMRC_RATE_FIRST * 100).toFixed(0)}p/mile is tax-deductible.</p>
          <Button type="button" intent="primary" size="sm" className="mt-4" onClick={() => setSlideOpen(true)}>
            Log your first journey
          </Button>
        </div>
      )}

      {/* Desktop table */}
      {!loading && canUseMileage && visibleMileage.length > 0 && (
        <>
          <div className="hidden md:block bg-surface-card rounded-xl border border-border-default">
            <table className="w-full border-separate border-spacing-0">
              <colgroup>
                <col className="w-28" />
                <col />
                <col />
                <col className="w-28" />
                <col className="w-28" />
                <col className="w-10" />
              </colgroup>
              <thead>
                <tr>
                  <th className="px-4 py-2.5 text-left text-caption font-medium text-text-muted bg-surface-sunken border-b border-border-default rounded-tl-xl">Date</th>
                  <th className="px-4 py-2.5 text-left text-caption font-medium text-text-muted bg-surface-sunken border-b border-border-default">Description</th>
                  <th className="px-4 py-2.5 text-left text-caption font-medium text-text-muted bg-surface-sunken border-b border-border-default">Route</th>
                  <th className="px-4 py-2.5 text-right text-caption font-medium text-text-muted bg-surface-sunken border-b border-border-default">Miles</th>
                  <th className="px-4 py-2.5 text-right text-caption font-medium text-text-muted bg-surface-sunken border-b border-border-default">Relief</th>
                  <th className="px-3 py-2.5 bg-surface-sunken border-b border-border-default rounded-tr-xl" aria-label="Actions"></th>
                </tr>
              </thead>
              <tbody>
                {visibleMileage.map((e, idx) => {
                  const milesBefore = visibleMileage.slice(idx + 1).reduce((s, x) => s + Number(x.miles), 0)
                  const rate   = milesBefore >= HMRC_THRESHOLD ? HMRC_RATE_AFTER : HMRC_RATE_FIRST
                  const relief = Number(e.miles) * rate
                  return (
                    <tr key={e.id} className="border-t border-border-subtle hover:bg-surface-sunken transition-colors">
                      <td className="px-4 py-2.5 text-sm text-text-secondary tabular-nums whitespace-nowrap">{new Date(e.date).toLocaleDateString('en-GB')}</td>
                      <td className="px-4 py-2.5 font-medium text-sm text-text-primary">{e.description}</td>
                      <td className="px-4 py-2.5 text-sm text-text-secondary">
                        {e.from_location && e.to_location
                          ? `${e.from_location} → ${e.to_location}`
                          : e.from_location || e.to_location || '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium text-sm tabular-nums">{Number(e.miles).toLocaleString('en-GB', { minimumFractionDigits: 1 })}</td>
                      <td className="px-4 py-2.5 text-right text-success-700 font-semibold text-sm tabular-nums">£{relief.toFixed(2)}</td>
                      <td className="px-3 py-2.5 text-right">
                        <button onClick={() => scheduleMileageDelete(e)}
                          aria-label="Delete entry"
                          className="p-1.5 rounded hover:bg-danger-50 text-text-secondary hover:text-danger-500 transition-colors">
                          <Trash weight="regular" className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="bg-surface-sunken border-t border-border-default">
                <tr>
                  <td colSpan={3} className="px-4 py-2.5 text-caption font-semibold text-text-secondary">Total</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-sm text-text-primary tabular-nums">{totalMiles.toLocaleString('en-GB', { minimumFractionDigits: 1 })} mi</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-sm text-success-700 tabular-nums">£{totalMileageRelief.toFixed(2)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {visibleMileage.map((e, idx) => {
              const milesBefore = visibleMileage.slice(idx + 1).reduce((s, x) => s + Number(x.miles), 0)
              const rate   = milesBefore >= HMRC_THRESHOLD ? HMRC_RATE_AFTER : HMRC_RATE_FIRST
              const relief = Number(e.miles) * rate
              const hasRoute = e.from_location || e.to_location
              return (
                <div key={e.id} className="bg-surface-card rounded-xl border border-border-default p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <span className="font-medium text-text-primary">{e.description}</span>
                    <span className="font-semibold text-text-primary flex-shrink-0">{Number(e.miles).toLocaleString('en-GB', { minimumFractionDigits: 1 })} mi</span>
                  </div>
                  <p className="text-success-700 font-medium text-sm mb-2">{formatCurrency(relief)} tax relief</p>
                  {hasRoute && (
                    <p className="text-xs text-text-secondary mb-2">
                      {e.from_location && e.to_location ? `${e.from_location} → ${e.to_location}` : e.from_location || e.to_location}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-secondary">{new Date(e.date).toLocaleDateString('en-GB')}</span>
                    <button onClick={() => scheduleMileageDelete(e)}
                      className="p-1.5 rounded hover:bg-danger-50 text-text-secondary hover:text-danger-500 transition-colors">
                      <Trash weight="regular" className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      <SlideOver open={slideOpen} onClose={() => setSlideOpen(false)} title="Log journey">
        <MileageForm userId={userId} taxYearStart={taxYearStart} onSuccess={() => { setSlideOpen(false); load() }} />
      </SlideOver>
    </div>
  )
}
