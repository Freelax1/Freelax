// lib/logic/mtd-quarters.ts
// Pure date-arithmetic functions for MTD ITSA quarterly submission windows.
// No database, no API dependencies.

export type QuarterNumber = 1 | 2 | 3 | 4

export interface MtdQuarter {
  quarter:     QuarterNumber   // 1–4
  label:       string          // e.g. "Q1 2026/27"
  periodStart: Date            // inclusive
  periodEnd:   Date            // inclusive
  deadline:    Date            // HMRC submission deadline
  taxYear:     number          // the April start year, e.g. 2026 for 2026/27
}

export type QuarterStatus = 'upcoming' | 'current' | 'overdue' | 'future'

export interface MtdQuarterWithStatus extends MtdQuarter {
  status: QuarterStatus
}

// ── helpers ───────────────────────────────────────────────────────────────────

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

// Construct a UTC-midnight Date from year/month(1-indexed)/day.
// Using ISO strings avoids local-timezone ambiguity in date comparisons.
function d(year: number, month: number, day: number): Date {
  return new Date(`${year}-${pad(month)}-${pad(day)}`)
}

// ── Core functions ─────────────────────────────────────────────────────────────

/**
 * Returns the tax year start year (the April year) for a given date.
 * e.g. 1 Jan 2027 → 2026 (because 2026/27 tax year)
 *      1 May 2026 → 2026 (because 2026/27 tax year)
 *      1 Mar 2026 → 2025 (because 2025/26 tax year)
 */
export function getTaxYearStart(date: Date): number {
  const y = date.getFullYear()
  const m = date.getMonth() + 1  // 1-indexed
  const day = date.getDate()
  const isAfterApril6 = m > 4 || (m === 4 && day >= 6)
  return isAfterApril6 ? y : y - 1
}

/**
 * Returns all 4 MTD quarters for a given tax year start year.
 * e.g. getTaxYearQuarters(2026) returns Q1–Q4 for the 2026/27 tax year.
 *
 * Quarter boundaries (fixed calendar windows):
 *   Q1: 6 Apr – 5 Jul  · deadline 5 Aug
 *   Q2: 6 Jul – 5 Oct  · deadline 5 Nov
 *   Q3: 6 Oct – 5 Jan  · deadline 5 Feb  (spans calendar year)
 *   Q4: 6 Jan – 5 Apr  · deadline 5 May
 */
export function getTaxYearQuarters(taxYearStart: number): MtdQuarter[] {
  const y0 = taxYearStart        // e.g. 2026
  const y1 = taxYearStart + 1   // e.g. 2027
  const shortYear = String(y1).slice(2)
  const label = (q: number) => `Q${q} ${y0}/${shortYear}`

  return [
    {
      quarter: 1,
      label: label(1),
      periodStart: d(y0, 4,  6),
      periodEnd:   d(y0, 7,  5),
      deadline:    d(y0, 8,  5),
      taxYear: y0,
    },
    {
      quarter: 2,
      label: label(2),
      periodStart: d(y0, 7,  6),
      periodEnd:   d(y0, 10, 5),
      deadline:    d(y0, 11, 5),
      taxYear: y0,
    },
    {
      quarter: 3,
      label: label(3),
      periodStart: d(y0, 10, 6),  // Oct — still in y0
      periodEnd:   d(y1, 1,  5),  // Jan — crosses into y1
      deadline:    d(y1, 2,  5),  // Feb — y1
      taxYear: y0,
    },
    {
      quarter: 4,
      label: label(4),
      periodStart: d(y1, 1,  6),  // Jan y1
      periodEnd:   d(y1, 4,  5),  // Apr 5 y1 (last day before new tax year)
      deadline:    d(y1, 5,  5),  // May y1
      taxYear: y0,
    },
  ]
}

/**
 * Returns which quarter a given date falls in, or null if the date is
 * outside all quarters for its tax year (shouldn't happen in normal use).
 */
export function getQuarterForDate(date: Date): MtdQuarter | null {
  const taxYearStart = getTaxYearStart(date)
  const quarters = getTaxYearQuarters(taxYearStart)
  return quarters.find(q => date >= q.periodStart && date <= q.periodEnd) ?? null
}

/**
 * Returns all 4 quarters for the current tax year with their status
 * relative to today.
 *
 * Status rules:
 * - 'current'  — today falls within this quarter's period
 * - 'overdue'  — period has ended and deadline has passed
 * - 'upcoming' — period has ended but deadline is still in the future
 * - 'future'   — period hasn't started yet
 */
export function getCurrentYearQuartersWithStatus(today: Date = new Date()): MtdQuarterWithStatus[] {
  const taxYearStart = getTaxYearStart(today)
  const quarters = getTaxYearQuarters(taxYearStart)

  return quarters.map(q => {
    let status: QuarterStatus

    if (today >= q.periodStart && today <= q.periodEnd) {
      status = 'current'
    } else if (today > q.periodEnd && today > q.deadline) {
      status = 'overdue'
    } else if (today > q.periodEnd && today <= q.deadline) {
      status = 'upcoming'
    } else {
      status = 'future'
    }

    return { ...q, status }
  })
}

/**
 * Returns the days remaining until the deadline of the current quarter,
 * or null if there is no current quarter (between tax years — shouldn't happen).
 */
export function daysUntilCurrentDeadline(today: Date = new Date()): number | null {
  const quarter = getQuarterForDate(today)
  if (!quarter) return null
  const msPerDay = 86_400_000
  // Math.max(…, 0) prevents a negative result if called with a date that somehow
  // falls past the deadline (shouldn't happen in normal use since getQuarterForDate
  // only returns a quarter whose periodEnd ≥ today, but defensive here).
  return Math.max(Math.ceil((quarter.deadline.getTime() - today.getTime()) / msPerDay), 0)
}
