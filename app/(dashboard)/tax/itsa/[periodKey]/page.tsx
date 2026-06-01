'use client'

// MTD for Income Tax — quarterly update form.
// Three steps managed locally:
//   1. 'form'        — pre-filled income + expense buckets, user can amend
//   2. 'declaration' — read-only summary + legal declaration checkbox
//   3. 'success'     — confirmation
//
// The periodKey is part of the URL — never rendered.

import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CircleNotch } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import { fetchPaidInvoicesByUser } from '@/lib/api/invoices'
import { formatCurrency } from '@/lib/tax-calculations'
import PageHeader from '@/components/ui/page-header'
import PageLayout from '@/components/page-layout'
import { PanelCardSkeleton } from '@/components/ui/content-skeletons'
import SectionCard from '@/components/ui/section-card'
import BreakdownRow from '@/components/ui/breakdown-row'
import Alert from '@/components/ui/alert'
import Button, { ButtonLink } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import type { ExpenseCategory } from '@/types/database'

type IncomeBuckets = {
  turnover: number
  other:    number
}

type ExpenseBuckets = {
  costOfGoodsBought:    number
  staffCosts:           number
  travelCosts:          number
  premisesRunningCosts: number
  maintenanceCosts:     number
  adminCosts:           number
  advertisingCosts:     number
  professionalFees:     number
  interest:             number
  other:                number
}

type Step = 'form' | 'declaration' | 'success'

// Map Freelax expense categories onto MTD ITSA expense buckets.
// Categories without a clear MTD analogue fall into `other`.
function bucketFor(category: ExpenseCategory | null | undefined): keyof ExpenseBuckets {
  switch (category) {
    case 'equipment':         return 'costOfGoodsBought'
    case 'travel':            return 'travelCosts'
    case 'office_supplies':
    case 'software':
    case 'phone_internet':    return 'adminCosts'
    case 'marketing':         return 'advertisingCosts'
    case 'professional_fees': return 'professionalFees'
    case 'training':
    case 'meals':
    case 'other':
    default:                  return 'other'
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function parseAmount(v: string): number {
  const n = Number(v)
  if (!Number.isFinite(n) || n < 0) return 0
  return n
}

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
  return {
    timezone:     Intl.DateTimeFormat().resolvedOptions().timeZone,
    screenWidth:  window.screen.width,
    screenHeight: window.screen.height,
    windowWidth:  window.innerWidth,
    windowHeight: window.innerHeight,
    doNotTrack:   navigator.doNotTrack ?? 'not-set',
    deviceId,
  }
}

const EMPTY_INCOME: IncomeBuckets = { turnover: 0, other: 0 }
const EMPTY_EXPENSES: ExpenseBuckets = {
  costOfGoodsBought:    0,
  staffCosts:           0,
  travelCosts:          0,
  premisesRunningCosts: 0,
  maintenanceCosts:     0,
  adminCosts:           0,
  advertisingCosts:     0,
  professionalFees:     0,
  interest:             0,
  other:                0,
}

export default function ItsaQuarterlyPage() {
  const params       = useParams<{ periodKey: string }>()
  const searchParams = useSearchParams()
  const periodKey    = decodeURIComponent(params.periodKey)

  const startStr = searchParams.get('start') ?? ''
  const endStr   = searchParams.get('end')   ?? ''
  const dueStr   = searchParams.get('due')   ?? ''

  const periodLabel = useMemo(() => {
    if (!startStr || !endStr) return ''
    const fmt = (iso: string) =>
      new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
      })
    return `${fmt(startStr)} – ${fmt(endStr)}`
  }, [startStr, endStr])

  const [step, setStep]           = useState<Step>('form')
  const [loading, setLoading]     = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [income, setIncome]       = useState<IncomeBuckets>(EMPTY_INCOME)
  const [expenses, setExpenses]   = useState<ExpenseBuckets>(EMPTY_EXPENSES)
  const [declared, setDeclared]   = useState(false)
  const [submitting, setSubmitting]   = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!startStr || !endStr) {
        setLoading(false)
        setLoadError('Missing period dates. Return to the MTD overview and try again.')
        return
      }
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setLoadError('You need to be signed in to prepare a quarterly update.')
          setLoading(false)
          return
        }
        const start = new Date(startStr + 'T00:00:00Z')
        const end   = new Date(endStr   + 'T23:59:59Z')

        const [paidInvoices, expensesRes] = await Promise.all([
          fetchPaidInvoicesByUser(user.id, start, end),
          supabase
            .from('expenses')
            .select('amount, vat_amount, category')
            .eq('user_id', user.id)
            .gte('date', startStr)
            .lte('date', endStr),
        ])

        if (cancelled) return

        type InvRow = { total: number; vat_amount: number }
        const invList = (paidInvoices ?? []) as unknown as InvRow[]
        const turnover = round2(
          invList.reduce((s, i) => s + (Number(i.total ?? 0) - Number(i.vat_amount ?? 0)), 0),
        )

        type ExpRow = { amount: number; vat_amount: number; category: ExpenseCategory | null }
        const expList = (expensesRes.data ?? []) as unknown as ExpRow[]
        const nextExpenses: ExpenseBuckets = { ...EMPTY_EXPENSES }
        for (const e of expList) {
          const netAmount = Number(e.amount ?? 0) - Number(e.vat_amount ?? 0)
          const bucket = bucketFor(e.category)
          nextExpenses[bucket] = round2(nextExpenses[bucket] + netAmount)
        }

        setIncome({ turnover, other: 0 })
        setExpenses(nextExpenses)
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : 'Could not load period data.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [startStr, endStr])

  function setIncomeKey(key: keyof IncomeBuckets, value: number) {
    setIncome(prev => ({ ...prev, [key]: value }))
  }
  function setExpenseKey(key: keyof ExpenseBuckets, value: number) {
    setExpenses(prev => ({ ...prev, [key]: value }))
  }

  const totalIncome   = round2(income.turnover + income.other)
  const totalExpenses = round2(
    Object.values(expenses).reduce((s, v) => s + Number(v ?? 0), 0),
  )
  const netProfit = round2(totalIncome - totalExpenses)

  async function handleSubmit() {
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await fetch('/api/hmrc/itsa/submit-quarterly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodKey,
          periodStart: startStr,
          periodEnd:   endStr,
          income,
          expenses,
          _fp: collectFp(),
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || json?.error) {
        setSubmitError(json?.error ?? `Submission failed (${res.status}).`)
        setSubmitting(false)
        return
      }
      setStep('success')
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Submission failed.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <PageLayout className="space-y-6">
        <PageHeader title="Quarterly Update" subtitle={periodLabel || undefined} />
        <PanelCardSkeleton className="min-h-[280px]" />
      </PageLayout>
    )
  }

  if (loadError) {
    return (
      <PageLayout className="space-y-6">
        <PageHeader title="Quarterly Update" subtitle={periodLabel || undefined} />
        <Alert intent="danger">{loadError}</Alert>
        <ButtonLink href="/tax/itsa" intent="secondary" size="sm">
          ← Back to MTD overview
        </ButtonLink>
      </PageLayout>
    )
  }

  if (step === 'success') {
    return (
      <PageLayout className="space-y-6">
        <PageHeader title="Quarterly Update" subtitle={periodLabel || undefined} />
        <Alert intent="success">Quarterly update submitted successfully.</Alert>
        {periodLabel && (
          <p className="text-sm text-text-secondary">
            Period covered: <span className="font-medium text-text-primary">{periodLabel}</span>
            {dueStr && (
              <> · Was due{' '}
                <span className="font-medium text-text-primary">
                  {new Date(dueStr + 'T00:00:00Z').toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
                  })}
                </span>
              </>
            )}
          </p>
        )}
        <ButtonLink href="/tax/itsa" intent="secondary" size="sm">
          Back to MTD overview
        </ButtonLink>
      </PageLayout>
    )
  }

  if (step === 'declaration') {
    return (
      <PageLayout className="space-y-6">
        <PageHeader title="Quarterly Update" subtitle={periodLabel || undefined} />

        <SectionCard title="Summary — please review">
          <BreakdownRow label="Turnover"     value={formatCurrency(income.turnover)} />
          <BreakdownRow label="Other income" value={formatCurrency(income.other)} />
          <BreakdownRow label="Total income" value={formatCurrency(totalIncome)} bold />
          <BreakdownRow label="Cost of goods bought"     value={formatCurrency(expenses.costOfGoodsBought)} />
          <BreakdownRow label="Staff costs"              value={formatCurrency(expenses.staffCosts)} />
          <BreakdownRow label="Travel costs"             value={formatCurrency(expenses.travelCosts)} />
          <BreakdownRow label="Premises running costs"   value={formatCurrency(expenses.premisesRunningCosts)} />
          <BreakdownRow label="Maintenance costs"        value={formatCurrency(expenses.maintenanceCosts)} />
          <BreakdownRow label="Admin costs"              value={formatCurrency(expenses.adminCosts)} />
          <BreakdownRow label="Advertising costs"        value={formatCurrency(expenses.advertisingCosts)} />
          <BreakdownRow label="Professional fees"        value={formatCurrency(expenses.professionalFees)} />
          <BreakdownRow label="Interest"                 value={formatCurrency(expenses.interest)} />
          <BreakdownRow label="Other expenses"           value={formatCurrency(expenses.other)} />
          <BreakdownRow label="Total expenses"           value={formatCurrency(totalExpenses)} bold />
          <BreakdownRow label="Net profit"               value={formatCurrency(netProfit)} bold />
        </SectionCard>

        <SectionCard variant="flat" title="Declaration">
          <p className="py-3 text-sm text-text-primary leading-relaxed">
            When you submit this information you are making a legal declaration that the information is true and complete to the best of your knowledge. A false declaration can result in prosecution.
          </p>
        </SectionCard>

        <label className="flex items-start gap-3 text-sm text-text-primary cursor-pointer select-none">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-border-default text-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-strong"
            checked={declared}
            onChange={e => setDeclared(e.target.checked)}
          />
          <span>I confirm this declaration is true and complete.</span>
        </label>

        {submitError && <Alert intent="danger">{submitError}</Alert>}

        <div className="flex items-center justify-between gap-3 pt-2">
          <Button
            type="button"
            intent="ghost"
            size="sm"
            onClick={() => { setStep('form'); setSubmitError(null) }}
            disabled={submitting}
            className="underline"
          >
            Go back
          </Button>
          <Button
            type="button"
            intent="primary"
            size="md"
            onClick={handleSubmit}
            disabled={!declared || submitting}
          >
            {submitting && <CircleNotch weight="regular" className="w-4 h-4 animate-spin" />}
            {submitting ? 'Submitting…' : 'Submit to HMRC'}
          </Button>
        </div>
      </PageLayout>
    )
  }

  // ── Step: 'form' ──
  return (
    <PageLayout className="space-y-6">
      <PageHeader title="Quarterly Update" subtitle={periodLabel || undefined} />

      <SectionCard title="Income">
        <div className="py-3 space-y-4">
          <AmountField
            label="Turnover"
            hint="Sum of paid invoice totals (excluding VAT) in the period."
            value={income.turnover}
            onChange={v => setIncomeKey('turnover', parseAmount(v))}
          />
          <AmountField
            label="Other income"
            hint="Other self-employment income not covered above."
            value={income.other}
            onChange={v => setIncomeKey('other', parseAmount(v))}
          />
        </div>
      </SectionCard>

      <SectionCard title="Expenses">
        <div className="py-3 space-y-4">
          <AmountField
            label="Cost of goods bought"
            hint="Materials, cost of sales, equipment for resale."
            value={expenses.costOfGoodsBought}
            onChange={v => setExpenseKey('costOfGoodsBought', parseAmount(v))}
          />
          <AmountField
            label="Staff costs"
            hint="Staff and wages."
            value={expenses.staffCosts}
            onChange={v => setExpenseKey('staffCosts', parseAmount(v))}
          />
          <AmountField
            label="Travel costs"
            hint="Travel and mileage."
            value={expenses.travelCosts}
            onChange={v => setExpenseKey('travelCosts', parseAmount(v))}
          />
          <AmountField
            label="Premises running costs"
            hint="Office rent, utilities, premises overheads."
            value={expenses.premisesRunningCosts}
            onChange={v => setExpenseKey('premisesRunningCosts', parseAmount(v))}
          />
          <AmountField
            label="Maintenance costs"
            hint="Maintenance and repairs."
            value={expenses.maintenanceCosts}
            onChange={v => setExpenseKey('maintenanceCosts', parseAmount(v))}
          />
          <AmountField
            label="Admin costs"
            hint="Office supplies, software, phone, internet."
            value={expenses.adminCosts}
            onChange={v => setExpenseKey('adminCosts', parseAmount(v))}
          />
          <AmountField
            label="Advertising costs"
            hint="Marketing and advertising."
            value={expenses.advertisingCosts}
            onChange={v => setExpenseKey('advertisingCosts', parseAmount(v))}
          />
          <AmountField
            label="Professional fees"
            hint="Accountancy, legal, and other professional services."
            value={expenses.professionalFees}
            onChange={v => setExpenseKey('professionalFees', parseAmount(v))}
          />
          <AmountField
            label="Interest"
            hint="Loan and finance interest."
            value={expenses.interest}
            onChange={v => setExpenseKey('interest', parseAmount(v))}
          />
          <AmountField
            label="Other expenses"
            hint="Anything else not captured above."
            value={expenses.other}
            onChange={v => setExpenseKey('other', parseAmount(v))}
          />
        </div>
      </SectionCard>

      <SectionCard variant="flat" title="Profit summary">
        <BreakdownRow label="Total income"   value={formatCurrency(totalIncome)} />
        <BreakdownRow label="Total expenses" value={formatCurrency(totalExpenses)} />
        <BreakdownRow label="Net profit"     value={formatCurrency(netProfit)} bold />
      </SectionCard>

      <div className="flex items-center justify-between gap-3">
        <Link
          href="/tax/itsa"
          className="text-sm text-text-secondary hover:text-text-primary underline"
        >
          Cancel
        </Link>
        <Button
          type="button"
          intent="primary"
          size="md"
          onClick={() => setStep('declaration')}
        >
          Review and submit
        </Button>
      </div>
    </PageLayout>
  )
}

function AmountField({
  label, hint, value, onChange,
}: {
  label:    string
  hint?:    string
  value:    number
  onChange: (v: string) => void
}) {
  return (
    <Field label={label} hint={hint}>
      <Input
        type="number"
        inputMode="decimal"
        min={0}
        step="0.01"
        value={String(value)}
        onChange={e => onChange(e.target.value)}
      />
    </Field>
  )
}
