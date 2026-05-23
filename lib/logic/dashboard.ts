// lib/logic/dashboard.ts — v1.0
// Pure dashboard calculations. No Supabase, no React.

export const MONTHS_TY = ['Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar']

export function calcMonthlyChart(
  paidInvoices: { total: number; vat_amount: number; paid_date: string }[],
  expenses:     { amount: number; date: string }[],
  start: Date,
) {
  return MONTHS_TY.map((month, idx) => {
    const calMonth = ((idx + 3) % 12) + 1
    const calYear  = idx < 9 ? start.getFullYear() : start.getFullYear() + 1
    const income = paidInvoices
      .filter(i => { if (!i.paid_date) return false; const d = new Date(i.paid_date); return d.getMonth() + 1 === calMonth && d.getFullYear() === calYear })
      .reduce((s, i) => s + (Number(i.total) - Number(i.vat_amount ?? 0)), 0)
    const exp = expenses
      .filter(e => { const d = new Date(e.date); return d.getMonth() + 1 === calMonth && d.getFullYear() === calYear })
      .reduce((s, e) => s + Number(e.amount), 0)
    return { month, income: Math.round(income), expenses: Math.round(exp), profit: Math.round(income - exp) }
  })
}

export function calcExpenseCategoryData(expenses: { category: string; amount: number }[]) {
  const catMap: Record<string, number> = {}
  expenses.forEach(e => { catMap[e.category] = (catMap[e.category] ?? 0) + Number(e.amount) })
  return Object.entries(catMap)
    .map(([name, value]) => ({ name: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), value: Math.round(value) }))
    .sort((a, b) => b.value - a.value).slice(0, 6)
}

export function calcUnpaidTotal(invoices: { total: number; status: string }[]): number {
  return invoices.filter(i => i.status === 'sent' || i.status === 'overdue').reduce((s, i) => s + Number(i.total), 0)
}

export function hasOverdue(invoices: { status: string }[]): boolean {
  return invoices.some(i => i.status === 'overdue')
}

export function calcYearOnYear(
  currentIncome: number,
  currentExpenses: number,
  lastYearInvoices: { total: number; vat_amount: number }[],
  lastYearExpenses: { amount: number }[],
): { incomeChange: number; profitChange: number; lastYearIncome: number; lastYearProfit: number } {
  const lastYearIncome  = lastYearInvoices.reduce((s, i) => s + (Number(i.total) - Number(i.vat_amount ?? 0)), 0)
  const lastYearExp     = lastYearExpenses.reduce((s, e) => s + Number(e.amount), 0)
  const lastYearProfit  = lastYearIncome - lastYearExp
  const currentProfit   = currentIncome - currentExpenses
  const incomeChange    = lastYearIncome > 0 ? Math.round(((currentIncome - lastYearIncome) / lastYearIncome) * 100) : 0
  const profitChange    = lastYearProfit > 0 ? Math.round(((currentProfit - lastYearProfit) / lastYearProfit) * 100) : 0
  return { incomeChange, profitChange, lastYearIncome, lastYearProfit }
}

export function calcMonthlyAverage(
  paidInvoices: { total: number; vat_amount: number; paid_date: string }[],
  start: Date,
): number {
  if (!paidInvoices.length) return 0
  const now = new Date()
  const monthsElapsed = Math.max(1,
    (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()) + 1
  )
  const total = paidInvoices.reduce((s, i) => s + (Number(i.total) - Number(i.vat_amount ?? 0)), 0)
  return Math.round(total / monthsElapsed)
}

// Self Assessment deadline for a given tax year.
// UK rule: tax year N to N+1 (6 Apr N → 5 Apr N+1) has SA filing + payment due on 31 January N+2.
// Pass the tax year's end date (5 Apr …) — the deadline is 31 January of the year AFTER that.
export function calcTaxDeadline(taxYearEnd?: Date): { days: number; label: string } {
  const now = new Date()
  let deadline: Date
  if (taxYearEnd) {
    deadline = new Date(taxYearEnd.getFullYear() + 1, 0, 31)
  } else {
    // Fallback (legacy) — pick the next upcoming 31 Jan. Prefer passing taxYearEnd.
    deadline = new Date(now.getFullYear(), 0, 31)
    if (now > deadline) deadline = new Date(now.getFullYear() + 1, 0, 31)
  }
  const days = Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / 86400000))
  return { days, label: deadline.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) }
}

export function calcRunway(cashOnHand: number, unpaidInvoices: number, avgMonthlyExpenses: number): { months: number | null; label: string } {
  if (avgMonthlyExpenses <= 0) return { months: null, label: 'Log expenses to see runway' }
  const total = cashOnHand + unpaidInvoices
  const months = total / avgMonthlyExpenses
  return {
    months: Math.round(months * 10) / 10,
    label: months >= 3 ? 'Comfortable' : months >= 1.5 ? 'Tight' : 'Low',
  }
}

export function calcActionItems(data: {
  unpaidInvoices: { id: string; invoice_number: string; status: string; total: number; due_date: string; clients: any }[]
  ir35Projects:   { id: string; title: string; ir35_status: string; ir35_assessed_at?: string }[]
  expiringQuotes: { id: string; quote_number: string; expiry_date: string; clients: any }[]
}): { type: string; priority: 'red' | 'amber'; title: string; sub: string; href: string }[] {
  const today = new Date()
  const actions: { type: string; priority: 'red' | 'amber'; title: string; sub: string; href: string }[] = []

  data.unpaidInvoices
    .filter(i => i.status === 'overdue')
    .forEach(i => {
      const days = Math.floor((today.getTime() - new Date(i.due_date).getTime()) / 86400000)
      actions.push({ type: 'overdue', priority: 'red', title: `${i.invoice_number} is overdue`, sub: `${i.clients?.name ?? ''} · ${days}d late`, href: `/invoices/${i.id}` })
    })

  data.unpaidInvoices
    .filter(i => i.status === 'sent')
    .forEach(i => {
      const days = Math.floor((new Date(i.due_date).getTime() - today.getTime()) / 86400000)
      if (days >= 0 && days <= 7) {
        actions.push({ type: 'due_soon', priority: 'amber', title: `${i.invoice_number} due in ${days === 0 ? 'today' : `${days}d`}`, sub: i.clients?.name ?? '', href: `/invoices/${i.id}` })
      }
    })

  data.ir35Projects
    .filter(p => p.ir35_status === 'needs_review' || p.ir35_status === 'inside_ir35')
    .slice(0, 2)
    .forEach(p => {
      actions.push({ type: 'ir35', priority: p.ir35_status === 'inside_ir35' ? 'red' : 'amber', title: `${p.title} — IR35 ${p.ir35_status === 'inside_ir35' ? 'risk' : 'needs review'}`, sub: 'Review contract assessment', href: `/projects/${p.id}` })
    })

  data.expiringQuotes.forEach(q => {
    const days = Math.floor((new Date(q.expiry_date).getTime() - today.getTime()) / 86400000)
    if (days >= 0 && days <= 3) {
      actions.push({ type: 'quote', priority: 'amber', title: `${q.quote_number} expires in ${days === 0 ? 'today' : `${days}d`}`, sub: q.clients?.name ?? '', href: `/quotes/${q.id}` })
    }
  })

  return actions.sort((a, b) => (a.priority === 'red' ? -1 : 1) - (b.priority === 'red' ? -1 : 1)).slice(0, 5)
}
