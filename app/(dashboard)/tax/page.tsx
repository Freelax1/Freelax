'use client'

import { useState, useEffect } from 'react'
import { fetchCurrentUser, fetchUserProfile } from '@/lib/api/users'
import { fetchPaidInvoicesByUser } from '@/lib/api/invoices'
import { fetchExpensesByUser } from '@/lib/api/expenses'
import {
  formatCurrency,
  calculateTax,
  getCurrentTaxYear,
  getVatThresholdWarning,
} from '@/lib/tax-calculations'
import {
  PageHeader,
  StatCard,
  StatCardSkeleton,
  TaxBriefingBannerSkeleton,
  ActionListSkeleton,
} from '@/components/ui'
import SectionCard from '@/components/ui/section-card'
import BreakdownRow, { BreakdownGroup } from '@/components/ui/breakdown-row'
import ProgressBar from '@/components/ui/progress-bar'
import Button, { ButtonLink } from '@/components/ui/button'
import Alert from '@/components/ui/alert'
import ActionList, { type ActionListItem } from '@/components/ui/action-list'
import PageLayout from '@/components/page-layout'
import TaxDeadlineTimeline from '@/components/ui/tax-deadline-timeline'
import TaxBriefingCard from '@/components/tax-briefing-card'
import { fetchTaxPotTotal, fetchTaxPotEntries, addTaxPotEntry } from '@/lib/api/tax-pot'
import { createClient } from '@/lib/supabase/client'
import { fetchMileageEntries, calcMileageRelief } from '@/lib/api/mileage'
import { DownloadSimple, Warning, Info, X, Lock } from '@phosphor-icons/react'
import { Input } from '@/components/form-fields'
import { getCurrentYearQuartersWithStatus } from '@/lib/logic/mtd-quarters'
import InfoTooltip from '@/components/info-tooltip'
import { IconButton } from '@/components/ui/icon-button'
import Link from 'next/link'
import { cardLabel, sectionTitle, serifStat } from '@/lib/typography'
import { cn } from '@/lib/utils'
import type {
  TaxPotEntry, Invoice, Expense, MileageEntry,
  BusinessType, StudentLoanPlan, TaxDetail,
} from '@/types/database'

type TaxPageData = {
  totalIncomeExVat:  number
  totalVatCollected: number
  totalExpenses:     number
  vatReclaimable:    number
  vatWarning:        string | null
  taxDetail:         TaxDetail
  hasTaxProfile:     boolean
  businessType:      BusinessType
  vatRegistered:     boolean
  mileageRelief:     number
  mileageMiles:      number
  paidInvoiceCount:  number
  expenseCount:      number
}

// ── Main ──────────────────────────────────────────────────────────────────────

function TaxPotCard({
  totalTarget, totalSaved, entries,
  potAmount, setPotAmount,
  potNote, setPotNote,
  savingPot, onAdd, onDelete,
}: {
  totalTarget: number
  totalSaved:  number
  entries:     TaxPotEntry[]
  potAmount:   string; setPotAmount: (v: string) => void
  potNote:     string; setPotNote:   (v: string) => void
  savingPot:   boolean
  onAdd:       () => void
  onDelete:    (id: string) => void
}) {
  return (
    <SectionCard variant="flat" title="Tax Pot" bodyClassName="py-1">
      <div className="py-3">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-text-secondary">Target</span>
          <span className="text-sm font-semibold">{formatCurrency(totalTarget)}</span>
        </div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-text-secondary">Already set aside</span>
          <span className={`text-sm font-semibold ${totalSaved >= totalTarget ? 'text-success-700' : 'text-text-primary'}`}>
            {formatCurrency(totalSaved)}
            {totalSaved >= totalTarget && <span className="text-xs font-normal ml-1">✓ On track</span>}
          </span>
        </div>
        {/* Progress bar */}
        {totalTarget > 0 && (
          <ProgressBar
            className="mb-3"
            trackClassName="bg-black/[0.06]"
            animate
            pct={Math.min(100, Math.round((totalSaved / totalTarget) * 100))}
            color={
              totalSaved >= totalTarget
                ? 'var(--success-500)'
                : totalSaved / totalTarget > 0.6
                  ? 'var(--warning-500)'
                  : 'var(--danger-500)'
            }
          />
        )}
        {entries.map((e: TaxPotEntry) => (
          <div key={e.id} className="flex justify-between items-center text-xs text-text-secondary mb-1.5 group">
            <span>{e.note || 'Contribution'} · {new Date(e.date).toLocaleDateString('en-GB')}</span>
            <div className="flex items-center gap-2">
              <span>+{formatCurrency(e.amount)}</span>
              <IconButton
                label="Remove"
                variant="danger"
                onClick={() => onDelete(e.id)}
                className="opacity-0 group-hover:opacity-100 p-0.5"
                icon={<X weight="regular" className="w-3 h-3" />}
              />
            </div>
          </div>
        ))}
        {totalTarget > totalSaved && (
          <p className="text-xs text-warning-800 mt-2">
            {formatCurrency(totalTarget - totalSaved)} still to set aside
          </p>
        )}
        <div className="grid grid-cols-[minmax(0,7.5rem)_1fr_auto] gap-2 mt-4 items-stretch">
          <Input
            type="number"
            min="0"
            placeholder="Amount (£)"
            value={potAmount}
            onChange={e => setPotAmount(e.target.value)}
            className="min-w-0 py-2"
          />
          <Input
            placeholder="Note (optional)"
            value={potNote}
            onChange={e => setPotNote(e.target.value)}
            className="min-w-0 py-2"
          />
          <Button
            type="button"
            intent="primary"
            size="sm"
            onClick={onAdd}
            disabled={savingPot || !potAmount || Number(potAmount) <= 0}
            className="whitespace-nowrap self-stretch px-4"
          >
            {savingPot ? '…' : '+ Save'}
          </Button>
        </div>
      </div>
    </SectionCard>
  )
}

function VatPositionCard({
  vatWarning,
  totalVatCollected,
  vatReclaimable,
}: {
  vatWarning: string | null
  totalVatCollected: number
  vatReclaimable: number
}) {
  const netVat = totalVatCollected - vatReclaimable
  return (
    <SectionCard
      variant="flat"
      title="VAT position"
      action={
        <ButtonLink href="/tax/vat" intent="secondary" size="sm">
          VAT Returns →
        </ButtonLink>
      }
    >
      {vatWarning && (
        <Alert intent="warning" className="mb-3">
          {vatWarning}
        </Alert>
      )}
      <div className="shrink-0 mb-3">
        <p className={cardLabel}>Net VAT owed</p>
      </div>
      <div className="py-1">
        <p className={cn('text-2xl', serifStat, 'text-text-primary')}>
          {formatCurrency(netVat)}
        </p>
      </div>
      <div className="shrink-0 flex flex-col gap-2 pt-3 text-xs text-text-secondary">
        <div className="flex justify-between gap-4">
          <span>Collected on invoices</span>
          <span className="tabular-nums font-medium text-text-primary">
            {formatCurrency(totalVatCollected)}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span>Reclaimable on expenses</span>
          <span className="tabular-nums font-medium text-success-700">
            −{formatCurrency(vatReclaimable)}
          </span>
        </div>
      </div>
    </SectionCard>
  )
}

function MtdQuartersCard({
  quarters,
  compact,
}: {
  quarters: ReturnType<typeof getCurrentYearQuartersWithStatus>
  compact: boolean
}) {
  return (
    <SectionCard
      variant="flat"
      title="Making Tax Digital"
      action={
        <ButtonLink href="/settings?tab=HMRC" intent="secondary" size="sm">
          Connect HMRC →
        </ButtonLink>
      }
      bodyClassName="space-y-0"
    >
      <p className="text-xs text-text-secondary mb-5">
        ITSA quarterly submission windows for the current tax year. Submissions unlock once your HMRC account is connected.
      </p>

      <div
        className={cn(
          'grid gap-3 fd-stat-grid',
          compact ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4',
        )}
      >
        {quarters.map(q => {
          const isCurrent = q.status === 'current'
          const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
          const fmtShort = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

          const { badgeBg, badgeText, cardBorder } =
            q.status === 'current'  ? { badgeBg: 'bg-warning-50',  badgeText: 'text-warning-800',  cardBorder: 'border-warning-200' } :
            q.status === 'upcoming' ? { badgeBg: 'bg-warning-50',  badgeText: 'text-warning-800',  cardBorder: 'border-warning-200' } :
            q.status === 'overdue'  ? { badgeBg: 'bg-danger-50',    badgeText: 'text-danger-600',    cardBorder: 'border-danger-200'   } :
                                      { badgeBg: 'bg-surface-sunken',  badgeText: 'text-text-secondary',  cardBorder: 'border-border-subtle' }

          const statusLabel =
            q.status === 'current'  ? 'Open now' :
            q.status === 'upcoming' ? 'Submit soon' :
            q.status === 'overdue'  ? 'Overdue' :
                                      'Not started'

          return (
            <div
              key={q.quarter}
              className={`rounded-xl border p-4 h-full flex flex-col ${cardBorder} ${isCurrent ? 'ring-1 ring-amber-300' : ''}`}
            >
              <div className="flex items-center justify-between mb-2.5 shrink-0">
                <span className="text-sm font-semibold text-text-primary">Q{q.quarter}</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-lg ${badgeBg} ${badgeText}`}>
                  {statusLabel}
                </span>
              </div>
              <div className="flex-1 flex flex-col justify-center min-h-0 py-1">
                <p className="text-xs text-text-secondary leading-relaxed">
                  {fmtShort(q.periodStart)} – {fmt(q.periodEnd)}
                </p>
              </div>
              <div className="shrink-0 pt-2 space-y-1.5">
                <p className="text-xs text-text-secondary">
                  Deadline: {fmt(q.deadline)}
                </p>
                <p className="text-xs text-text-secondary font-medium">Not Started</p>
              </div>
            </div>
          )
        })}
      </div>
    </SectionCard>
  )
}

function buildTaxBriefingPrompts(data: TaxPageData): string[] {
  const t = data.taxDetail
  const taxTotal = t.kind === 'sole_trader' ? t.totalTax : t.totalPersonalTax
  const prompts: string[] = []

  if (taxTotal > 0) prompts.push('How much should I set aside for tax?')
  if ((t.paymentsOnAccount ?? 0) > 0) {
    prompts.push(`Why is my January payment ${formatCurrency(t.totalJanuaryPayment)}?`)
  } else {
    prompts.push('When is my Self Assessment deadline?')
  }
  if (data.vatRegistered) prompts.push('How much net VAT will I owe this year?')
  else prompts.push('When do I need to register for VAT?')
  if (data.mileageRelief > 0) prompts.push('How does my mileage relief work?')
  else prompts.push('Can I claim my home office?')

  return prompts.slice(0, 4)
}

export default function TaxPage() {
  const [pageData, setPageData]             = useState<TaxPageData | null>(null)
  const [loading, setLoading]               = useState(true)
  const [narrative, setNarrative]           = useState<string | null>(null)
  const [narrativeLoading, setNarrativeLoading] = useState(false)
  const { start, end, label }               = getCurrentTaxYear()
  const taxYearStart = start.getFullYear()
  const [taxPotTotal, setTaxPotTotal]       = useState(0)
  const [taxPotEntries, setTaxPotEntries]   = useState<TaxPotEntry[]>([])
  const [potAmount, setPotAmount]           = useState('')
  const [potNote, setPotNote]               = useState('')
  const [savingPot, setSavingPot]           = useState(false)
  const [potFeedback, setPotFeedback]       = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [exportLoading, setExportLoading]   = useState(false)
  const [canExport, setCanExport]           = useState(false)
  const [syncedAt, setSyncedAt]             = useState<Date | null>(null)
  useEffect(() => {
    async function load() {
      const user   = await fetchCurrentUser()
      const userId = user?.id ?? ''

      if (user) {
        const supabase = createClient()
        const { data: planProfile } = await supabase
          .from('users')
          .select('subscription_plan')
          .eq('id', userId)
          .single()
        setCanExport(['solo', 'pro', 'studio'].includes(planProfile?.subscription_plan ?? 'free'))
      }

      const [paidInvoices, expenses, profile] = await Promise.all([
        fetchPaidInvoicesByUser(userId, start, end),
        fetchExpensesByUser(userId, start, end),
        fetchUserProfile(userId),
      ])

      type InvRow = { total: number; vat_amount: number }
      type ExpRow = { amount: number; vat_amount: number; vat_reclaimable: boolean }
      const totalIncomeExVat  = paidInvoices?.reduce((s: number, i: InvRow) => s + (Number(i.total) - Number(i.vat_amount)), 0) ?? 0
      const totalVatCollected = paidInvoices?.reduce((s: number, i: InvRow) => s + Number(i.vat_amount), 0) ?? 0
      const totalExpenses     = expenses?.reduce((s: number, e: ExpRow) => s + Number(e.amount), 0) ?? 0
      const vatReclaimable    = expenses?.filter((e: ExpRow) => e.vat_reclaimable).reduce((s: number, e: ExpRow) => s + Number(e.vat_amount), 0) ?? 0

      const baseInputsObj = {
        grossIncome:          totalIncomeExVat,
        totalExpenses,
        businessType:         (profile?.business_type ?? 'sole_trader') as BusinessType,
        pensionContributions: Number(profile?.pension_contributions ?? 0),
        studentLoanPlan:      (profile?.student_loan_plan ?? 'none') as StudentLoanPlan,
        salaryDrawn:          profile?.salary_drawn ? Number(profile.salary_drawn) : undefined,
        dividendsDrawn:       profile?.dividends_drawn ? Number(profile.dividends_drawn) : undefined,
      }

      const otherIncomeVal         = Number((profile as any)?.other_income ?? 0)
      const investmentDividendsVal = Number((profile as any)?.investment_dividends ?? 0)

      const taxDetail = calculateTax({ ...baseInputsObj, otherIncome: otherIncomeVal, investmentDividends: investmentDividendsVal })
      const vatWarning = getVatThresholdWarning(totalIncomeExVat)

      // Banner hides if the user has explicitly set their tax profile (student_loan_plan not null)
      // even if they selected "none" — that means they visited settings and confirmed it
      const hasTaxProfile = profile?.student_loan_plan !== null && profile?.student_loan_plan !== undefined

      const mileageData   = await fetchMileageEntries(userId, taxYearStart)
      const mileageMiles  = mileageData.reduce((s: number, e: MileageEntry) => s + Number(e.miles), 0)
      const mileageRelief = calcMileageRelief(mileageMiles)

      setPageData({
        totalIncomeExVat, totalVatCollected,
        totalExpenses, vatReclaimable, vatWarning,
        taxDetail, hasTaxProfile,
        businessType:  profile?.business_type ?? 'sole_trader',
        vatRegistered: !!profile?.vat_registered,
        mileageRelief,
        mileageMiles,
        paidInvoiceCount: paidInvoices?.length ?? 0,
        expenseCount:     expenses?.length ?? 0,
      })
      // Fetch tax pot
      const [potTotal, potEntries] = await Promise.all([
        fetchTaxPotTotal(userId, taxYearStart),
        fetchTaxPotEntries(userId, taxYearStart),
      ])
      setTaxPotTotal(potTotal)
      setTaxPotEntries(potEntries)

      setLoading(false)
      setSyncedAt(new Date())
    }
    load()
  }, [])

  async function generateNarrative(force = false) {
    if (!force) {
      try {
        const cached = sessionStorage.getItem(`fd_sa_narrative_${taxYearStart}`)
        if (cached) { setNarrative(cached); return }
      } catch {}
    }
    setNarrativeLoading(true)
    setNarrative(null)
    try {
      const res = await fetch('/api/ai/sa-narrative', { method: 'POST' })
      const json = await res.json()
      const text = json.narrative ?? json.error ?? 'Could not generate summary.'
      setNarrative(text)
      try { sessionStorage.setItem(`fd_sa_narrative_${taxYearStart}`, text) } catch {}
    } catch { setNarrative('Failed to connect. Please try again.') }
    setNarrativeLoading(false)
  }

  const mtdQuarters = getCurrentYearQuartersWithStatus()
  const endYear = new Date(end).getFullYear()

  function flashPot(type: 'success' | 'error', text: string) {
    setPotFeedback({ type, text })
    setTimeout(() => setPotFeedback(null), 5000)
  }

  async function addPotContribution() {
    if (!potAmount || Number(potAmount) <= 0) {
      flashPot('error', 'Enter an amount greater than zero')
      return
    }
    setSavingPot(true)
    try {
      const user = await fetchCurrentUser()
      if (!user) {
        flashPot('error', 'You must be signed in to save to your tax pot')
        setSavingPot(false)
        return
      }
      await addTaxPotEntry({
        user_id:        user.id,
        amount:         Number(potAmount),
        note:           potNote.trim() || undefined,
        date:           new Date().toISOString().slice(0, 10),
        tax_year_start: taxYearStart,
      })
      const [newTotal, newEntries] = await Promise.all([
        fetchTaxPotTotal(user.id, taxYearStart),
        fetchTaxPotEntries(user.id, taxYearStart),
      ])
      setTaxPotTotal(newTotal)
      setTaxPotEntries(newEntries)
      setPotAmount('')
      setPotNote('')
      flashPot('success', 'Contribution added to your tax pot')
      window.dispatchEvent(new Event('fd:data-invalidate'))
    } catch (e) {
      flashPot('error', e instanceof Error ? e.message : 'Failed to add contribution')
    }
    setSavingPot(false)
  }

  async function deletePotEntry(id: string) {
    const supabase = createClient()
    const { error } = await supabase.from('tax_pot_entries').delete().eq('id', id)
    if (error) {
      flashPot('error', error.message)
      return
    }
    const user = await fetchCurrentUser()
    if (!user) return
    const [newTotal, newEntries] = await Promise.all([
      fetchTaxPotTotal(user.id, taxYearStart),
      fetchTaxPotEntries(user.id, taxYearStart),
    ])
    setTaxPotTotal(newTotal)
    setTaxPotEntries(newEntries)
    flashPot('success', 'Contribution removed')
    window.dispatchEvent(new Event('fd:data-invalidate'))
  }

  async function downloadSAPack() {
    setExportLoading(true)
    try {
      window.location.href = '/api/tax/export-pack'
      // Give browser a moment to initiate the download before resetting state
      setTimeout(() => setExportLoading(false), 1500)
    } catch (e) {
      console.error(e)
      setExportLoading(false)
    }
  }


  return (
    <div className="space-y-6">
      <PageHeader
        title="Tax"
        subtitle={`Tax year ${label} · 6 Apr – 5 Apr`}
        action={
          <div className="flex gap-2 flex-wrap">
            {canExport ? (
              <Button
                type="button"
                intent="primary"
                size="sm"
                onClick={downloadSAPack}
                disabled={exportLoading || loading}
              >
                <DownloadSimple weight="regular" className="w-3.5 h-3.5" />
                {exportLoading ? 'Preparing…' : `Download ${label} SA pack`}
              </Button>
            ) : (
              <ButtonLink
                href="/settings?tab=billing"
                title="Export is available on the Solo plan and above. Upgrade to unlock."
                intent="secondary"
                size="sm"
              >
                <Lock weight="regular" className="w-3.5 h-3.5" />
                Download {label} SA pack
              </ButtonLink>
            )}
          </div>
        }
      />

      {potFeedback && (
        <Alert intent={potFeedback.type === 'error' ? 'danger' : 'success'}>
          {potFeedback.text}
        </Alert>
      )}

      {loading || !pageData ? (
        <div className="space-y-6" aria-busy aria-label="Loading tax summary">
          <div className="fd-cards-grid">
            <StatCardSkeleton className="h-full w-full" variant="sunken" reserveFooter />
            <StatCardSkeleton className="h-full w-full" reserveFooter showProgress />
            <StatCardSkeleton className="h-full w-full" reserveFooter />
            <StatCardSkeleton className="h-full w-full" reserveFooter showProgress />
          </div>
          <TaxBriefingBannerSkeleton />
          <ActionListSkeleton rows={2} />
        </div>
      ) : (
        <PageLayout className="space-y-6" syncedAt={syncedAt}>
          {/* Tax profile nudge */}
          {!pageData.hasTaxProfile && (
            <Alert intent="info">
              For a precise take-home figure, add your student loan plan and pension contributions in{' '}
              <Link href="/settings" className="underline font-medium">Settings → Tax Profile</Link>.
            </Alert>
          )}

          {/* Empty state — no income data yet */}
          {pageData.taxDetail.grossIncome === 0 && pageData.taxDetail.totalExpenses === 0 && (
            <div className="bg-surface-card rounded-xl border border-border-default p-8 text-center">
              <h2 className={cn(sectionTitle, 'mb-2')}>
                Your tax summary will appear here
              </h2>
              <p className="text-sm text-text-secondary mb-5 max-w-md mx-auto">
                Log some invoices and expenses and we'll calculate your estimated Income Tax, National Insurance, and Corporation Tax — broken down clearly, with every deduction shown.
              </p>
              <ButtonLink href="/invoices/new" intent="primary" size="sm">
                Send your first invoice →
              </ButtonLink>
            </div>
          )}

          {/* ── Tax dashboard — at-a-glance KPIs + next steps ─────────── */}
          {(pageData.taxDetail.grossIncome > 0 || pageData.taxDetail.totalExpenses > 0) && (() => {
            const t        = pageData.taxDetail
            const taxTotal = t.kind === 'sole_trader' ? t.totalTax : t.totalPersonalTax
            const potPct   = taxTotal > 0 ? Math.min(100, Math.round((taxPotTotal / taxTotal) * 100)) : 100
            const remaining= Math.max(0, taxTotal - taxPotTotal)
            const potBar   = potPct >= 100 ? 'var(--success-500)' : potPct >= 60 ? 'var(--warning-500)' : 'var(--danger-500)'

            const today      = new Date()
            const deadline   = new Date(endYear + 1, 0, 31)
            const daysToDue  = Math.max(0, Math.ceil((deadline.getTime() - today.getTime()) / 86400000))
            const weeksLeft  = Math.max(1, Math.round(daysToDue / 7))
            const weeklyNeed = remaining > 0 ? remaining / weeksLeft : 0
            const daysColor  = daysToDue < 30 ? 'var(--danger-500)' : daysToDue < 90 ? 'var(--warning-500)' : 'var(--text-primary)'
            const taxYearEnd = new Date(endYear, 3, 5)
            const filingWindowMs = deadline.getTime() - taxYearEnd.getTime()
            const elapsedMs = Math.max(0, today.getTime() - taxYearEnd.getTime())
            const deadlinePct = filingWindowMs > 0 ? Math.min(100, Math.round((elapsedMs / filingWindowMs) * 100)) : 0
            const deadlineBar = daysToDue < 30 ? 'var(--danger-500)' : daysToDue < 90 ? 'var(--warning-500)' : 'var(--success-500)'

            // Build prioritised action list
            const actions: ActionListItem[] = []

            if (remaining > 0) {
              actions.push({
                kind:     'tax_pot',
                priority: potPct < 60 ? 'red' : 'amber',
                title:    `Save ${formatCurrency(weeklyNeed)} per week to hit your tax target`,
                sub:      `${formatCurrency(remaining)} still to set aside before 31 January ${endYear + 1}`,
                href:     '/tax#tax-pot',
              })
            }

            if (daysToDue <= 60 && daysToDue > 0) {
              actions.push({
                kind:     'filing',
                priority: daysToDue <= 30 ? 'red' : 'amber',
                title:    `File Self Assessment in ${daysToDue} day${daysToDue === 1 ? '' : 's'}`,
                sub:      `Deadline: 31 January ${endYear + 1} · Download the SA pack up top`,
                href:     '/tax',
              })
            }

            if (t.kind === 'sole_trader' && t.paAlert) {
              actions.push({
                kind:     'pension',
                priority: 'red',
                title:    "You're earning over £100k — Personal Allowance is being tapered",
                sub:      'Pension contributions can reclaim up to 60% effective relief in the taper zone',
                href:     '/settings?tab=Personal+tax+inputs',
              })
            } else if (t.kind === 'sole_trader' && t.higherRateAlert) {
              actions.push({
                kind:     'pension',
                priority: 'amber',
                title:    'Some income is taxed at 40%',
                sub:      'Pension contributions can reduce your higher-rate exposure pound-for-pound',
                href:     '/settings?tab=Personal+tax+inputs',
              })
            }

            if (!pageData.hasTaxProfile) {
              actions.push({
                kind:     'profile',
                priority: 'info',
                title:    'Complete your tax profile for a precise figure',
                sub:      'Add student loan plan and pension details in Settings → Tax inputs',
                href:     '/settings?tab=Personal+tax+inputs',
              })
            }

            if (actions.length === 0) {
              actions.push({
                kind:     'on_track',
                priority: 'green',
                title:    "You're on track for January",
                sub:      `Tax pot covers your ${formatCurrency(taxTotal)} liability · ${daysToDue} days until the deadline`,
                href:     '/tax#tax-pot',
              })
            }

            return (
              <>
                <div className="fd-cards-grid mb-0">
                  <StatCard
                    className="h-full w-full"
                    variant="sunken"
                    label="Tax owed"
                    tooltip="Estimate from your data. Confirm with an accountant."
                    value={formatCurrency(taxTotal)}
                    reserveFooter
                    sub={`by 31 January ${endYear + 1}`}
                  />
                  <StatCard
                    className="h-full w-full"
                    label="Set aside"
                    tooltip="Logged in Tax pot — not your bank balance."
                    value={formatCurrency(taxPotTotal)}
                    valueColor={potPct >= 100 ? 'var(--success-500)' : 'var(--text-primary)'}
                    progressBar={{ pct: potPct, color: potBar }}
                    reserveFooter
                    sub={
                      remaining > 0
                        ? `${potPct}% of target · ${formatCurrency(remaining)} to go`
                        : "You're fully covered"
                    }
                  />
                  <StatCard
                    className="h-full w-full"
                    label="Take-home"
                    tooltip="After estimated tax from your profile."
                    value={formatCurrency(t.takeHome)}
                    reserveFooter
                    sub={`${t.effectiveTaxRate}% effective rate · you keep ${Math.round(100 - t.effectiveTaxRate)}%`}
                  />
                  <StatCard
                    className="h-full w-full"
                    label="Deadline"
                    tooltip="Days until Self Assessment deadline."
                    valueColor={daysColor}
                    value={
                      <>
                        {daysToDue}
                        <span className="text-[0.5em] font-medium text-text-secondary ml-1.5">
                          days
                        </span>
                      </>
                    }
                    progressBar={{ pct: deadlinePct, color: deadlineBar }}
                    reserveFooter
                    sub={`31 January ${endYear + 1}`}
                  />
                </div>

                <ActionList
                  title="Suggested next steps"
                  className="mt-1"
                  dismissStorageKey="freelax_dismissed_tax_actions"
                  items={actions.filter(a => a.priority === 'red' || a.priority === 'amber' || a.priority === 'info').slice(0, 3)}
                />
              </>
            )
          })()}

          {(() => {
            const t = pageData.taxDetail
            const taxTotal = t.kind === 'sole_trader' ? t.totalTax : t.totalPersonalTax
            const hasData = t.grossIncome > 0 || t.totalExpenses > 0
            const taxPotGap = Math.max(0, taxTotal - taxPotTotal)
            return (
              <TaxBriefingCard
                hook={{
                  hasData,
                  incomeExVat: pageData.totalIncomeExVat,
                  totalExpenses: pageData.totalExpenses,
                  expenseCount: pageData.expenseCount,
                  taxOwed: taxTotal,
                  taxPotGap,
                  hasTaxProfile: pageData.hasTaxProfile,
                  higherRateAlert: t.kind === 'sole_trader' ? t.higherRateAlert : false,
                  paAlert: t.kind === 'sole_trader' ? t.paAlert : false,
                }}
                narrative={narrative}
                loading={narrativeLoading}
                onGenerate={generateNarrative}
                suggestedPrompts={buildTaxBriefingPrompts(pageData)}
              />
            )
          })()}

          {!pageData.vatRegistered && (
            <MtdQuartersCard quarters={mtdQuarters} compact={false} />
          )}

          {/* ── SOLE TRADER ── */}
          {pageData.taxDetail.kind === 'sole_trader' && (() => {
            const t = pageData.taxDetail
            const gap = t.totalTax - (taxPotTotal)
            return (
              <div className="grid lg:grid-cols-2 gap-5 items-start">
                <div className="space-y-4 min-w-0">
                  {pageData.vatRegistered && (
                    <VatPositionCard
                      vatWarning={pageData.vatWarning}
                      totalVatCollected={pageData.totalVatCollected}
                      vatReclaimable={pageData.vatReclaimable}
                    />
                  )}

                  {t.paAlert && (
                    <Alert intent="danger" title="Personal Allowance is being tapered">
                      <p className="text-xs mt-1">
                        Your income exceeds £100,000. You lose £1 of Personal Allowance for every £2 above £100k, creating an effective 60% tax rate between £100,000–£125,140. Pension contributions can reduce this significantly.
                      </p>
                    </Alert>
                  )}

                  <SectionCard
                    variant="flat"
                    title="Profit & Loss"
                    action={
                      <ButtonLink href="/settings?tab=Personal+tax+inputs" intent="secondary" size="sm">
                        Edit inputs →
                      </ButtonLink>
                    }
                    bodyClassName="space-y-0"
                  >
                    <BreakdownGroup label="Trading profit">
                      <BreakdownRow label="Gross income (ex-VAT)" value={formatCurrency(t.grossIncome)} />
                      <BreakdownRow label="Allowable expenses" value={`−${formatCurrency(t.totalExpenses)}`} red />
                      {pageData.mileageRelief > 0 && (
                        <BreakdownRow
                          label={`Mileage relief (${pageData.mileageMiles.toLocaleString('en-GB')} mi)`}
                          value={`−${formatCurrency(pageData.mileageRelief)}`}
                          red
                          hint="HMRC approved rate · see Mileage"
                        />
                      )}
                      {t.pensionContributions > 0 && (
                        <BreakdownRow
                          label="Pension contributions"
                          value={`−${formatCurrency(t.pensionContributions)}`}
                          red
                          hint={`Tax relief: ${formatCurrency(t.pensionTaxRelief)} (basic rate at source)`}
                        />
                      )}
                      <BreakdownRow label="Net profit" value={formatCurrency(t.netProfit)} bold />
                    </BreakdownGroup>

                    <div className="mt-6 pt-6 border-t border-border-subtle">
                      <BreakdownGroup label="Taxable income">
                        {t.otherIncome > 0 && (
                          <BreakdownRow
                            label="Other income"
                            value={formatCurrency(t.otherIncome)}
                            hint="Employment, rental, savings etc."
                          />
                        )}
                        <BreakdownRow
                          label={
                            <span>
                              Personal Allowance
                              <InfoTooltip>
                                Tax-free up to £12,570. Tapers if income is over £100k.
                              </InfoTooltip>
                            </span>
                          }
                          value={`−${formatCurrency(t.personalAllowance)}`}
                          hint={t.paAlert ? 'Reduced — income over £100k' : undefined}
                        />
                        <BreakdownRow label="Taxable income" value={formatCurrency(t.taxableIncome)} bold />
                      </BreakdownGroup>
                    </div>
                  </SectionCard>

                  <SectionCard variant="flat" title={<span>Income Tax<InfoTooltip>On income above £12,570. 20%, 40%, or 45%.</InfoTooltip></span>} bodyClassName="py-1">
                    {t.basicRateTax > 0     && <BreakdownRow label="Basic rate (20%)"       value={formatCurrency(t.basicRateTax)} />}
                    {t.higherRateTax > 0    && <BreakdownRow label="Higher rate (40%)"      value={formatCurrency(t.higherRateTax)} red />}
                    {t.additionalRateTax > 0 && <BreakdownRow label="Additional rate (45%)" value={formatCurrency(t.additionalRateTax)} red />}
                    <BreakdownRow label="Total Income Tax"        value={formatCurrency(t.incomeTax)} bold />
                  </SectionCard>

                  <SectionCard variant="flat" title="NI & Other Deductions" bodyClassName="py-1">
                    <BreakdownRow label={<span>Class 4 NI (6%/2%)<InfoTooltip>NI on profits over £12,570: 6%, then 2%.</InfoTooltip></span>}   value={formatCurrency(t.classFourNI)}
                      hint="Class 2 NI abolished April 2024" />
                    {t.studentLoanRepayment > 0 && (
                      <BreakdownRow label="Student loan repayment" value={formatCurrency(t.studentLoanRepayment)} />
                    )}
                    {t.investmentDividendTax > 0 && (
                      <BreakdownRow label="Investment dividend tax" value={formatCurrency(t.investmentDividendTax)} />
                    )}
                    <BreakdownRow label="Total deductions"        value={formatCurrency(t.totalTax)} bold />
                  </SectionCard>
                </div>

                <div className="space-y-4 min-w-0" id="tax-pot">
                  {pageData.vatRegistered && (
                    <MtdQuartersCard quarters={mtdQuarters} compact />
                  )}

                  <TaxPotCard
                    totalTarget={t.totalTax}
                    totalSaved={taxPotTotal}
                    entries={taxPotEntries}
                    potAmount={potAmount} setPotAmount={setPotAmount}
                    potNote={potNote}     setPotNote={setPotNote}
                    savingPot={savingPot}
                    onAdd={addPotContribution}
                    onDelete={deletePotEntry}
                  />

                  {/* Payments on account */}
                  {t.paymentsOnAccount > 0 && (
                    <SectionCard
                      variant="flat"
                      title={<span>Payments on Account<InfoTooltip>Bill over £1k? Pre-pay half in Jan and Jul.</InfoTooltip></span>}
                      accent="bg-warning-50 border-warning-200"
                      bodyClassName="py-1"
                    >
                      <div className="py-2 text-xs text-warning-800 leading-relaxed">
                        Your tax bill exceeds £1,000 so HMRC requires advance payments. Many freelancers are caught off guard by these.
                      </div>
                      <BreakdownRow label={`31 Jan ${endYear + 1} (balancing + 1st POA)`} value={formatCurrency(t.totalJanuaryPayment)} bold red />
                      <BreakdownRow label={`31 Jul ${endYear + 1} (2nd POA)`}              value={formatCurrency(t.julyPayment)} red />
                      <p className="text-xs text-text-secondary py-2 leading-relaxed">
                        Each payment on account = 50% of this year's bill, credited against next year's liability.
                      </p>
                    </SectionCard>
                  )}
                </div>
              </div>
            )
          })()}

          {/* ── LIMITED COMPANY ── */}
          {pageData.taxDetail.kind === 'limited_company' && (() => {
            const t = pageData.taxDetail
            return (
              <div className="grid lg:grid-cols-2 gap-5 items-start">
                <div className="space-y-4 min-w-0">
                  {pageData.vatRegistered && (
                    <VatPositionCard
                      vatWarning={pageData.vatWarning}
                      totalVatCollected={pageData.totalVatCollected}
                      vatReclaimable={pageData.vatReclaimable}
                    />
                  )}

                  <SectionCard variant="flat" title="Company — Corporation Tax" bodyClassName="py-1">
                    <BreakdownRow label="Gross income (ex-VAT)"       value={formatCurrency(t.grossIncome)} />
                    <BreakdownRow label="Business expenses"            value={`−${formatCurrency(t.totalExpenses)}`} red />
                    {pageData.mileageRelief > 0 && (
                      <BreakdownRow
                        label={`Mileage relief (${pageData.mileageMiles.toLocaleString('en-GB')} mi)`}
                        value={`−${formatCurrency(pageData.mileageRelief)}`}
                        red
                        hint="HMRC approved rate · see Mileage"
                      />
                    )}
                    <BreakdownRow label="Director salary"              value={`−${formatCurrency(t.salaryDrawn)}`} red />
                    <BreakdownRow label="Company profit"               value={formatCurrency(t.companyProfit)} bold />
                    <BreakdownRow label={<span>Corporation Tax ({t.corporationTaxRate}%)<InfoTooltip>Tax on company profits. 19% or 25% by band.</InfoTooltip></span>} value={formatCurrency(t.corporationTax)} red />
                    <BreakdownRow label="Profit after corp tax"        value={formatCurrency(t.profitAfterCorpTax)} bold />
                    <BreakdownRow label={<span>Dividends drawn<InfoTooltip>Lower tax than salary. £500 free, then band rates.</InfoTooltip></span>}              value={`−${formatCurrency(t.dividendsDrawn)}`} red />
                    <BreakdownRow label="Retained in company"          value={formatCurrency(t.retainedProfit)} bold green />
                  </SectionCard>

                  <SectionCard variant="flat" title="Personal — Director Self Assessment" bodyClassName="py-1">
                    {t.otherIncome > 0 && (
                      <BreakdownRow label="Other income" value={formatCurrency(t.otherIncome)} hint="Employment, rental, savings etc." />
                    )}
                    <BreakdownRow label="Salary"                       value={formatCurrency(t.salaryDrawn)} />
                    <BreakdownRow label="Salary income tax"            value={formatCurrency(t.salaryIncomeTax)} red />
                    <BreakdownRow label={<span>Employee NI (8%)<InfoTooltip>Your NI on salary: 8%, then 2% above £50,270.</InfoTooltip></span>}             value={formatCurrency(t.employeeNI)} red />
                    <BreakdownRow label={<span>Employer NI (company cost)<InfoTooltip>Company NI on salary: 13.8% over £5k.</InfoTooltip></span>}   value={formatCurrency(t.employerNI)} red />
                    <BreakdownRow label={<span>Dividends drawn<InfoTooltip>Lower tax than salary. £500 free, then band rates.</InfoTooltip></span>}              value={formatCurrency(t.dividendsDrawn)} />
                    <BreakdownRow label="Dividend allowance (tax-free)" value={`−${formatCurrency(t.dividendAllowance)}`} green />
                    <BreakdownRow label="Dividend tax"                 value={formatCurrency(t.dividendTax)} red />
                    {t.studentLoanRepayment > 0 && <BreakdownRow label="Student loan" value={formatCurrency(t.studentLoanRepayment)} red />}
                    <BreakdownRow label="Total personal tax"           value={formatCurrency(t.totalPersonalTax)} bold />
                  </SectionCard>
                </div>

                <div className="space-y-4 min-w-0" id="tax-pot">
                  {pageData.vatRegistered && (
                    <MtdQuartersCard quarters={mtdQuarters} compact />
                  )}

                  {/* Ltd summary: compact inline stat row — complements KPI row above */}
                  <SectionCard variant="flat" title="Company summary" accent="bg-surface-sunken" bodyClassName="py-1">
                    <BreakdownRow label="Corp tax + employer NI" value={formatCurrency(t.totalCompanyTax)} red />
                    <BreakdownRow label="Retained in company"    value={formatCurrency(t.retainedProfit)} green bold />
                  </SectionCard>

                  {t.paymentsOnAccount > 0 && (
                    <SectionCard
                      variant="flat"
                      title={<span>Payments on Account<InfoTooltip>Bill over £1k? Pre-pay half in Jan and Jul.</InfoTooltip></span>}
                      accent="bg-warning-50 border-warning-200"
                      bodyClassName="py-1"
                    >
                      <div className="py-2 text-xs text-warning-800">Your SA bill triggers advance payments to HMRC. These figures assume this is your first year of Self Assessment — your January bill will be lower from next year once prior POAs are offset.</div>
                      <BreakdownRow label={`31 Jan ${endYear + 1}`} value={formatCurrency(t.totalJanuaryPayment)} bold red />
                      <BreakdownRow label={`31 Jul ${endYear + 1}`} value={formatCurrency(t.julyPayment)} red />
                    </SectionCard>
                  )}

                  <TaxPotCard
                    totalTarget={t.totalPersonalTax}
                    totalSaved={taxPotTotal}
                    entries={taxPotEntries}
                    potAmount={potAmount} setPotAmount={setPotAmount}
                    potNote={potNote}     setPotNote={setPotNote}
                    savingPot={savingPot}
                    onAdd={addPotContribution}
                    onDelete={deletePotEntry}
                  />

                  <SectionCard variant="flat" title="Optimisation note" bodyClassName="py-1">
                    <div className="py-3 text-xs text-text-secondary space-y-1.5 leading-relaxed">
                      <p>The most tax-efficient structure for a Ltd director is typically:</p>
                      <ul className="list-disc list-inside space-y-1 text-text-secondary ml-1">
                        <li>Salary at the Personal Allowance (£12,570)</li>
                        <li>Remaining income as dividends (10.75% basic rate)</li>
                        <li>Surplus retained in the company (19–25% corp tax)</li>
                        <li>Pension via the company — no NI, and CT-deductible</li>
                      </ul>
                      <p className="text-text-secondary mt-2">Talk to an accountant to optimise your structure.</p>
                    </div>
                  </SectionCard>
                </div>
              </div>
            )
          })()}

          <SectionCard variant="flat" title="Important dates" bodyClassName="pt-0">
            <TaxDeadlineTimeline endYear={endYear} />
          </SectionCard>

        </PageLayout>
      )}
    </div>
  )
}
