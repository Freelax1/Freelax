// lib/logic/mtd-vat.ts
// Pure VAT return box calculations for MTD VAT submissions.
// No database, no API dependencies.

import type { Invoice, Expense } from '@/types/database'

export interface VatReturnBoxes {
  box1: number   // VAT due on sales (output VAT)
  box2: number   // VAT due on EC acquisitions (manual, usually 0)
  box3: number   // Total VAT due (box1 + box2)
  box4: number   // VAT reclaimable on purchases (input VAT)
  box5: number   // Net VAT payable/reclaimable (box3 - box4)
  box6: number   // Net sales ex-VAT
  box7: number   // Net purchases ex-VAT
  box8: number   // EC goods supplied (manual, usually 0)
  box9: number   // EC goods acquired (manual, usually 0)
}

export interface VatReturnInput {
  invoices:    Invoice[]
  expenses:    Expense[]
  periodStart: Date
  periodEnd:   Date
  // Manual overrides — default to 0 for most post-Brexit UK sole traders
  box2Override?: number
  box8Override?: number
  box9Override?: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const VAT_INVOICE_STATUSES = ['sent', 'paid'] as const

function isInPeriod(dateStr: string, periodStart: Date, periodEnd: Date): boolean {
  const d = new Date(dateStr)
  // Strip time component for comparison — compare date only
  const date  = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const start = new Date(periodStart.getFullYear(), periodStart.getMonth(), periodStart.getDate())
  const end   = new Date(periodEnd.getFullYear(),   periodEnd.getMonth(),   periodEnd.getDate())
  return date >= start && date <= end
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

// ── Core function ─────────────────────────────────────────────────────────────

/**
 * Calculates all 9 VAT return boxes for a given period.
 *
 * Invoices are filtered by issue_date and status (sent or paid).
 * Expenses are filtered by date (all expenses for Box 7, reclaimable only for Box 4).
 * All monetary values are rounded to 2 decimal places.
 */
export function calcVatReturn(input: VatReturnInput): VatReturnBoxes {
  const { invoices, expenses, periodStart, periodEnd } = input
  const box2 = input.box2Override ?? 0
  const box8 = input.box8Override ?? 0
  const box9 = input.box9Override ?? 0

  // Filter invoices in period with correct status
  const periodInvoices = invoices.filter(inv =>
    VAT_INVOICE_STATUSES.includes(inv.status as typeof VAT_INVOICE_STATUSES[number]) &&
    isInPeriod(inv.issue_date, periodStart, periodEnd)
  )

  // Filter expenses in period
  const periodExpenses = expenses.filter(exp =>
    isInPeriod(exp.date, periodStart, periodEnd)
  )

  // Box 1: output VAT on sales
  const box1 = round2(
    periodInvoices.reduce((sum, inv) => sum + Number(inv.vat_amount), 0)
  )

  // Box 3: total VAT due
  const box3 = round2(box1 + box2)

  // Box 4: input VAT reclaimable
  const box4 = round2(
    periodExpenses
      .filter(exp => exp.vat_reclaimable)
      .reduce((sum, exp) => sum + Number(exp.vat_amount), 0)
  )

  // Box 5: net VAT payable (positive = owe HMRC, negative = reclaim from HMRC)
  const box5 = round2(box3 - box4)

  // Box 6: net sales ex-VAT
  const box6 = round2(
    periodInvoices.reduce((sum, inv) => sum + Number(inv.subtotal), 0)
  )

  // Box 7: net purchases ex-VAT (all expenses, not just reclaimable)
  const box7 = round2(
    periodExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0)
  )

  return { box1, box2, box3, box4, box5, box6, box7, box8, box9 }
}

/**
 * Returns a human-readable label for Box 5.
 * Positive = you owe HMRC. Negative = HMRC owes you.
 */
export function box5Label(box5: number): string {
  if (box5 > 0) return `Pay HMRC £${box5.toFixed(2)}`
  if (box5 < 0) return `Reclaim £${Math.abs(box5).toFixed(2)} from HMRC`
  return 'Nothing to pay or reclaim'
}
