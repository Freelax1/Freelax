'use client'

import { useState, useEffect } from 'react'
import { calculateTax, getCurrentTaxYear, type StudentLoanPlan } from '@/lib/tax-calculations'
import { fetchDashboardData } from '@/lib/api/dashboard'
import { fetchCurrentUser, fetchUserProfile } from '@/lib/api/users'
import { fetchTaxPotTotal } from '@/lib/api/tax-pot'
import {
  calcMonthlyChart, calcUnpaidTotal, hasOverdue,
  calcTaxDeadline, calcActionItems,
} from '@/lib/logic/dashboard'
import OnboardingChecklist from '@/components/onboarding-checklist'
import PageLayout from '@/components/page-layout'
import {
  PageHeader,
  IconButton,
  StatCardSkeleton,
  StatusLineSkeleton,
  PanelCardSkeleton,
  WhatsComingSkeleton,
  ActionListSkeleton,
  QuietRowSkeleton,
} from '@/components/ui'
import AiLauncher  from './components/ai-launcher'
import StatusLine  from './components/status-line'
import ThreePots   from './components/three-pots'
import ThisMonth   from './components/this-month'
import WhatsComing from './components/whats-coming'
import QuietRow    from './components/quiet-row'
import Link from 'next/link'
import { ButtonLink } from '@/components/ui/button'
import ActionList from '@/components/ui/action-list'
import { Plus, Question } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

// ── Local types ────────────────────────────────────────────────────────
type ComingItem = {
  id:       string
  label:    string
  amount:   number
  dueDate:  string
  href:     string
  type:     'invoice' | 'overdue' | 'tax'
}

type DashboardAction = {
  type:     string
  priority: 'red' | 'amber'
  title:    string
  sub?:     string
  href:     string
}

type DashboardData = {
  hasOverdue:              boolean
  actionCount:             number
  taxProgress:             number
  isNewUser:               boolean
  taxTotal:                number
  actions:                 DashboardAction[]
  netProfit:               number
  taxPotSaved:             number
  taxDeadline:             { days: number; label: string }
  safeToSpend:             number | null
  safeToSpendMissingInput: boolean
  monthlyAvg:              number
  weeklySaveNeeded:        number
  thisMonthIncome:         number
  thisMonthIdx:            number
  monthlyChart:            { month: string; income: number; expenses: number; profit: number }[]
  comingItems:             ComingItem[]
  activeClients:           number
  liveProjects:            number
  openInvoices:            number
  openInvoicesTotal:       number
  expensesThisMonth:       number
  hasClients:              boolean
  hasProjects:             boolean
  hasInvoices:             boolean
  hasExpenses:             boolean
  hasProfileComplete:      boolean
  taxYearLabel:            string
}

// Top-of-page progress bar for loading
function LoadingBar({ active }: { active: boolean }) {
  const [width, setWidth] = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (active) {
      setVisible(true); setWidth(0)
      const t1 = setTimeout(() => setWidth(35), 20)
      const t2 = setTimeout(() => setWidth(65), 400)
      const t3 = setTimeout(() => setWidth(80), 900)
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
    } else {
      setWidth(100)
      const t = setTimeout(() => setVisible(false), 300)
      return () => clearTimeout(t)
    }
  }, [active])

  if (!visible) return null
  return (
    <div className="fixed top-0 left-0 right-0 z-progress h-[2px] bg-black/[0.04]">
      <div style={{
        height: '100%', background: 'var(--brand-primary)',
        width: `${width}%`,
        transition: active ? 'width 800ms cubic-bezier(0.22,1,0.36,1)' : 'width 250ms cubic-bezier(0.22,1,0.36,1)',
      }} />
    </div>
  )
}

// Keyboard shortcuts hint
function ShortcutHint() {
  const [open, setOpen] = useState(false)
  return (
    <div className="fd-shortcut-hint fixed bottom-5 right-5 z-dropdown">
      <IconButton
        variant="hint"
        label="Keyboard shortcuts"
        onClick={() => setOpen(o => !o)}
        icon={<Question weight="regular" className="w-[13px] h-[13px] text-text-secondary" />}
      />
      {open && (
        <div className="absolute bottom-9 right-0 bg-surface-card border border-border-default rounded-lg px-3.5 py-2.5 min-w-[200px] shadow-popover">
          {[
            ['N', 'New invoice'],
            ['T', 'Tax page'],
            ['E', 'Expenses'],
            ['⌘K', 'Command menu'],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between items-center py-1 border-b border-border-subtle last:border-0">
              <span className="text-xs text-text-secondary">{v}</span>
              <kbd className="text-micro text-text-primary rounded-sm px-1.5 py-px bg-surface-sunken border border-border-default">{k}</kbd>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const [data, setData]           = useState<DashboardData | null>(null)
  const [loading, setLoading]     = useState(true)
  const [syncedAt, setSyncedAt]   = useState<Date | null>(null)
  const { start, end, label }     = getCurrentTaxYear()

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'n' || e.key === 'N') { window.location.href = '/invoices/new'; return }
      if (e.key === 't' || e.key === 'T') { window.location.href = '/tax'; return }
      if (e.key === 'e' || e.key === 'E') { window.location.href = '/expenses'; return }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    let active = true

    async function load() {
      if (!active) return
      const user = await fetchCurrentUser()
      const uid  = user?.id ?? ''
      const raw  = await fetchDashboardData(uid, start, end)

      // TASK B: fetch profile first so we can use full calculateTax API
      const profile = await fetchUserProfile(uid)

      const totalIncome   = raw.paidInvoices.reduce((s: number, i: { total: number; vat_amount?: number | null }) => s + (Number(i.total) - Number(i.vat_amount ?? 0)), 0)
      const totalExpenses = raw.expenses.reduce((s: number, e: { amount: number }) => s + Number(e.amount), 0)
      const netProfit     = totalIncome - totalExpenses

      // TASK B: use full calculateTax API so Ltd users get correct personal tax figure
      const taxResult = calculateTax({
        grossIncome:          totalIncome,
        totalExpenses,
        businessType:         (profile?.business_type ?? 'sole_trader') as 'sole_trader' | 'limited_company' | 'partnership',
        pensionContributions: Number(profile?.pension_contributions ?? 0),
        studentLoanPlan:      (profile?.student_loan_plan ?? 'none') as StudentLoanPlan,
        salaryDrawn:          profile?.salary_drawn ? Number(profile.salary_drawn) : undefined,
        dividendsDrawn:       profile?.dividends_drawn ? Number(profile.dividends_drawn) : undefined,
        otherIncome:          Number((profile as any)?.other_income ?? 0),
        investmentDividends:  Number((profile as any)?.investment_dividends ?? 0),
      })
      const taxTotal = taxResult.kind === 'sole_trader' ? taxResult.totalTax : taxResult.totalPersonalTax
      const tax = { total: taxTotal }

      const taxDeadline   = calcTaxDeadline(end)
      const monthlyChart  = calcMonthlyChart(raw.paidInvoices, raw.expenses, start)
      const taxPotSaved   = await fetchTaxPotTotal(uid, start.getFullYear())

      // Personal outgoings — needed for nudge and Safe to Spend
      const personalOutgoings = profile?.monthly_personal_outgoings
        ? Number(profile.monthly_personal_outgoings)
        : null

      const isNewUser = (raw.activeClients ?? 0) === 0 && raw.recentInvoices.length === 0

      // Profile considered complete if business_type is set (fetchUserProfile returns limited fields)
      const hasProfileComplete = !!(profile?.business_type)

      const rawActions = calcActionItems({
        unpaidInvoices: raw.upcomingInvoices ?? [],
        ir35Projects:   raw.ir35Projects,
        expiringQuotes: raw.expiringQuotes ?? [],
      })

      // Nudge existing users to set up personal outgoings (disappears once set)
      if (personalOutgoings === null && !isNewUser) {
        rawActions.unshift({
          type:     'setup',
          priority: 'amber' as const,
          title:    'Set up Safe to Spend',
          sub:      'Takes 30 seconds — tell us your monthly personal outgoings',
          href:     '/settings',
        })
      }

      const actions = rawActions.slice(0, 3)

      // TASK D: Safe to Spend — proper formula, no double-counting
      const now             = new Date()
      const daysIntoMonth   = now.getDate()
      const thisMonthIdx    = ((now.getMonth() - 3) + 12) % 12

      // Net profit this month (income minus expenses for the month) — not gross income
      const thisMonthProfit = (monthlyChart[thisMonthIdx]?.profit ?? 0) as number

      // Monthly net profit average — net profit ÷ months elapsed (never gross income)
      const monthsElapsed    = Math.max(1,
        ((now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()) + 1)
      )
      const monthlyNetAvg    = Math.round(netProfit / monthsElapsed)

      // 1. Net income this month — use actuals if month is mature (14+ days), else monthly net avg
      const monthlyIncome = (daysIntoMonth >= 14 && thisMonthProfit > 0)
        ? thisMonthProfit
        : monthlyNetAvg

      // 2. Tax still to save — remaining liability ÷ months to deadline
      const taxRemaining       = Math.max(0, taxTotal - taxPotSaved)
      const monthsToDeadline   = Math.max(1, Math.ceil(taxDeadline.days / 30))
      const monthlyTaxStillToSet = taxRemaining / monthsToDeadline

      const safeToSpend: number | null = personalOutgoings !== null
        ? Math.round(monthlyIncome - monthlyTaxStillToSet - personalOutgoings)
        : null

      const weeksLeft        = Math.max(1, Math.round(taxDeadline.days / 7))
      const weeklySaveNeeded = taxRemaining > 0 ? taxRemaining / weeksLeft : 0

      // Expenses this month — sourced from monthlyChart which already filters correctly by
      // calendar month + year (same approach as thisMonthProfit above). The previous
      // raw.expenses.filter(e => e.date >= monthStart) had no upper bound and used string
      // comparison that breaks across month/year boundaries.
      const expensesThisMonth = monthlyChart[thisMonthIdx]?.expenses ?? 0

      const in30  = new Date(); in30.setDate(in30.getDate() + 30)
      const today = now.toISOString().slice(0, 10)

      type UpcomingInv = {
        id: string; invoice_number: string; status: string; total: number;
        due_date: string; clients: { name: string } | { name: string }[] | null
      }
      const clientName = (c: UpcomingInv['clients']): string | undefined =>
        Array.isArray(c) ? c[0]?.name : c?.name

      const comingItems: ComingItem[] = [
        ...(raw.upcomingInvoices ?? [])
          .filter((inv: UpcomingInv) => inv.due_date < today)
          .map((inv: UpcomingInv): ComingItem => ({
            id: `od-${inv.id}`,
            label: `${inv.invoice_number}${clientName(inv.clients) ? ` · ${clientName(inv.clients)}` : ''}`,
            amount: Number(inv.total), dueDate: inv.due_date,
            href: `/invoices/${inv.id}`, type: 'overdue',
          })),
        ...(raw.upcomingInvoices ?? [])
          .filter((inv: UpcomingInv) => inv.due_date >= today && new Date(inv.due_date) <= in30)
          .map((inv: UpcomingInv): ComingItem => ({
            id: inv.id,
            label: `${inv.invoice_number}${clientName(inv.clients) ? ` · ${clientName(inv.clients)}` : ''}`,
            amount: Number(inv.total), dueDate: inv.due_date,
            href: `/invoices/${inv.id}`, type: 'invoice',
          })),
      ]

      if (taxDeadline.days <= 30) {
        const d = new Date(); d.setDate(d.getDate() + taxDeadline.days)
        comingItems.push({
          id: 'tax-deadline', label: 'Tax return due',
          amount: tax.total, dueDate: d.toISOString().slice(0, 10),
          href: '/tax', type: 'tax',
        })
      }
      comingItems.sort((a, b) => a.dueDate.localeCompare(b.dueDate))

      setData({
        // Status
        hasOverdue: hasOverdue(raw.unpaidInvoices), actionCount: rawActions.filter((a: DashboardAction) => a.type !== 'setup').length,
        taxProgress: tax.total > 0 ? taxPotSaved / tax.total : 1,
        isNewUser, taxTotal: tax.total,
        // Actions
        actions,
        // Pots
        netProfit, taxPotSaved, taxDeadline, safeToSpend,
        safeToSpendMissingInput: personalOutgoings === null,
        monthlyAvg: monthlyNetAvg, weeklySaveNeeded,
        // Month — store thisMonthIdx so the chart slice is correct
        thisMonthIncome: thisMonthProfit, thisMonthIdx, monthlyChart,
        // Coming
        comingItems,
        // Quiet row
        activeClients: raw.activeClients ?? 0,
        liveProjects:  raw.liveProjects ?? 0,
        openInvoices:  (raw.unpaidInvoices ?? []).length,
        openInvoicesTotal: calcUnpaidTotal(raw.unpaidInvoices),
        expensesThisMonth,
        // Onboarding
        hasClients:  (raw.activeClients ?? 0) > 0,
        hasProjects: (raw.liveProjects ?? 0) > 0,
        hasInvoices: raw.recentInvoices.length > 0,
        hasExpenses: raw.expenses.length > 0,
        hasProfileComplete,
        taxYearLabel: label,
      })
      setLoading(false)
      setSyncedAt(new Date())
    }
    load()

    let lastLoadAt = Date.now()
    function onVisible() {
      if (document.visibilityState === 'visible' && Date.now() - lastLoadAt > 30_000) {
        lastLoadAt = Date.now()
        load()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      active = false
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  const todayLabel = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
  const headerSubtitle = data
    ? `${todayLabel} · Tax year ${data.taxYearLabel}`
    : todayLabel

  const newInvoiceAction = (
    <ButtonLink href="/invoices/new" intent="primary" size="sm">
      <Plus weight="regular" className="w-[13px] h-[13px]" />
      New invoice
    </ButtonLink>
  )

  return (
    <>
      <LoadingBar active={loading} />
      <ShortcutHint />

      <PageHeader
        title="Dashboard"
        subtitle={headerSubtitle}
        action={newInvoiceAction}
        className="mb-0"
      />

      {loading || !data ? (
        <div className="flex flex-col gap-8 mt-8" aria-busy aria-label="Loading dashboard">
          <StatusLineSkeleton />
          <div className="fd-cards-grid">
            <StatCardSkeleton className="flex-1 w-full" reserveFooter />
            <StatCardSkeleton className="flex-1 w-full" reserveFooter showProgress />
            <StatCardSkeleton className="flex-1 w-full" reserveFooter />
          </div>
          <QuietRowSkeleton />
          <ActionListSkeleton rows={2} />
          <div className="flex flex-col lg:flex-row gap-4 items-stretch">
            <PanelCardSkeleton showChart className="flex-1 min-w-0" />
            <WhatsComingSkeleton className="flex-1 min-w-0 lg:max-w-sm" />
          </div>
        </div>
      ) : (
        <PageLayout className="flex flex-col gap-8 mt-8" syncedAt={syncedAt}>

          {/* Onboarding checklist — top of page for brand new users */}
          {data.isNewUser && (
            <OnboardingChecklist
              hasClients={data.hasClients}
              hasProjects={data.hasProjects}
              hasInvoices={data.hasInvoices}
              hasExpenses={data.hasExpenses}
              hasProfile={data.hasProfileComplete}
            />
          )}

          {/* A. The Line */}
          <StatusLine
            actionCount={data.actionCount}
            hasOverdue={data.hasOverdue}
            taxProgress={data.taxProgress}
            isNewUser={data.isNewUser}
            taxTotal={data.taxTotal}
          />

          {/* B. The Three Pots */}
          <ThreePots
            earnedThisYear={data.netProfit}
            taxSetAside={data.taxPotSaved}
            taxTarget={data.taxTotal}
            taxDeadline={data.taxDeadline}
            safeToSpend={data.safeToSpend}
            safeToSpendMissingInput={data.safeToSpendMissingInput}
            weeklySaveNeeded={data.weeklySaveNeeded}
            isNewUser={data.isNewUser}
          />

          <ActionList items={data.actions} />

          <AiLauncher />

          {/* D+E. This Month + What's Coming — stack on mobile */}
          <div className="flex flex-col lg:flex-row gap-4 items-stretch">
            <div className="flex-[2] min-w-0">
              <ThisMonth
                thisMonthIncome={data.thisMonthIncome}
                monthlyAvg={data.monthlyAvg}
                chartData={data.monthlyChart.slice(
                  Math.max(0, data.thisMonthIdx - 5),
                  data.thisMonthIdx + 1
                )}
                expensesThisMonth={data.expensesThisMonth}
                isNewUser={data.isNewUser}
              />
            </div>
            <div className="flex-[1] min-w-0">
              <WhatsComing items={data.comingItems} />
            </div>
          </div>

          {/* F. The Quiet Row */}
          <QuietRow
            activeClients={data.activeClients}
            openInvoices={data.openInvoices}
            openInvoicesTotal={data.openInvoicesTotal}
            expensesThisMonth={data.expensesThisMonth}
            liveProjects={data.liveProjects}
          />

          {/* Onboarding — bottom of page for returning users */}
          {!data.isNewUser && (
            <OnboardingChecklist
              hasClients={data.hasClients}
              hasProjects={data.hasProjects}
              hasInvoices={data.hasInvoices}
              hasExpenses={data.hasExpenses}
              hasProfile={data.hasProfileComplete}
            />
          )}

        </PageLayout>
      )}
    </>
  )
}
