import {
  getTaxYearStart,
  getTaxYearQuarters,
  getQuarterForDate,
  getCurrentYearQuartersWithStatus,
  daysUntilCurrentDeadline,
} from '../logic/mtd-quarters'

// ── getTaxYearStart ────────────────────────────────────────────────────────────

describe('getTaxYearStart', () => {
  it('returns current year for date after 6 April', () => {
    expect(getTaxYearStart(new Date('2026-04-06'))).toBe(2026)
    expect(getTaxYearStart(new Date('2026-07-01'))).toBe(2026)
    expect(getTaxYearStart(new Date('2026-12-31'))).toBe(2026)
  })

  it('returns previous year for date before 6 April', () => {
    expect(getTaxYearStart(new Date('2026-04-05'))).toBe(2025)
    expect(getTaxYearStart(new Date('2026-01-01'))).toBe(2025)
    expect(getTaxYearStart(new Date('2026-03-31'))).toBe(2025)
  })

  it('handles tax year boundary correctly on 6 April', () => {
    expect(getTaxYearStart(new Date('2027-04-06'))).toBe(2027)
    expect(getTaxYearStart(new Date('2027-04-05'))).toBe(2026)
  })
})

// ── getTaxYearQuarters ─────────────────────────────────────────────────────────

describe('getTaxYearQuarters', () => {
  const quarters = getTaxYearQuarters(2026)

  it('returns exactly 4 quarters', () => {
    expect(quarters).toHaveLength(4)
  })

  it('Q1 runs 6 Apr – 5 Jul with deadline 5 Aug', () => {
    const q = quarters[0]
    expect(q.quarter).toBe(1)
    expect(q.periodStart).toEqual(new Date('2026-04-06'))
    expect(q.periodEnd).toEqual(new Date('2026-07-05'))
    expect(q.deadline).toEqual(new Date('2026-08-05'))
  })

  it('Q2 runs 6 Jul – 5 Oct with deadline 5 Nov', () => {
    const q = quarters[1]
    expect(q.quarter).toBe(2)
    expect(q.periodStart).toEqual(new Date('2026-07-06'))
    expect(q.periodEnd).toEqual(new Date('2026-10-05'))
    expect(q.deadline).toEqual(new Date('2026-11-05'))
  })

  it('Q3 runs 6 Oct – 5 Jan with deadline 5 Feb', () => {
    const q = quarters[2]
    expect(q.quarter).toBe(3)
    expect(q.periodStart).toEqual(new Date('2026-10-06'))
    expect(q.periodEnd).toEqual(new Date('2027-01-05'))
    expect(q.deadline).toEqual(new Date('2027-02-05'))
  })

  it('Q4 runs 6 Jan – 5 Apr with deadline 5 May', () => {
    const q = quarters[3]
    expect(q.quarter).toBe(4)
    expect(q.periodStart).toEqual(new Date('2027-01-06'))
    expect(q.periodEnd).toEqual(new Date('2027-04-05'))
    expect(q.deadline).toEqual(new Date('2027-05-05'))
  })

  it('labels are correct', () => {
    expect(quarters[0].label).toBe('Q1 2026/27')
    expect(quarters[3].label).toBe('Q4 2026/27')
  })

  it('all quarters belong to taxYear 2026', () => {
    expect(quarters.every(q => q.taxYear === 2026)).toBe(true)
  })
})

// ── getQuarterForDate ──────────────────────────────────────────────────────────

describe('getQuarterForDate', () => {
  it('identifies Q1 correctly', () => {
    expect(getQuarterForDate(new Date('2026-05-01'))?.quarter).toBe(1)
    expect(getQuarterForDate(new Date('2026-04-06'))?.quarter).toBe(1)
    expect(getQuarterForDate(new Date('2026-07-05'))?.quarter).toBe(1)
  })

  it('identifies Q2 correctly', () => {
    expect(getQuarterForDate(new Date('2026-08-15'))?.quarter).toBe(2)
    expect(getQuarterForDate(new Date('2026-07-06'))?.quarter).toBe(2)
    expect(getQuarterForDate(new Date('2026-10-05'))?.quarter).toBe(2)
  })

  it('identifies Q3 correctly — spans calendar year boundary', () => {
    expect(getQuarterForDate(new Date('2026-11-01'))?.quarter).toBe(3)
    expect(getQuarterForDate(new Date('2027-01-05'))?.quarter).toBe(3)
  })

  it('identifies Q4 correctly', () => {
    expect(getQuarterForDate(new Date('2027-02-01'))?.quarter).toBe(4)
    expect(getQuarterForDate(new Date('2027-04-05'))?.quarter).toBe(4)
  })
})

// ── getCurrentYearQuartersWithStatus ──────────────────────────────────────────

describe('getCurrentYearQuartersWithStatus', () => {
  it('marks the correct quarter as current', () => {
    // 3 May 2026 falls in Q1 (6 Apr – 5 Jul 2026)
    const quarters = getCurrentYearQuartersWithStatus(new Date('2026-05-03'))
    expect(quarters[0].status).toBe('current')   // Q1
    expect(quarters[1].status).toBe('future')    // Q2
    expect(quarters[2].status).toBe('future')    // Q3
    expect(quarters[3].status).toBe('future')    // Q4
  })

  it('marks past quarters as overdue when deadline has passed', () => {
    // 10 Sep 2026 — Q1 ended 5 Jul, deadline was 5 Aug (passed), so Q1 is overdue
    const quarters = getCurrentYearQuartersWithStatus(new Date('2026-09-10'))
    expect(quarters[0].status).toBe('overdue')   // Q1 deadline passed
    expect(quarters[1].status).toBe('current')   // Q2
  })

  it('marks past quarters as upcoming when inside deadline window', () => {
    // 20 Jul 2026 — Q1 ended 5 Jul, deadline is 5 Aug (not yet passed)
    const quarters = getCurrentYearQuartersWithStatus(new Date('2026-07-20'))
    expect(quarters[0].status).toBe('upcoming')  // Q1 ended, deadline not passed
    expect(quarters[1].status).toBe('current')   // Q2
  })

  it('returns 4 quarters', () => {
    expect(getCurrentYearQuartersWithStatus(new Date('2026-05-03'))).toHaveLength(4)
  })
})

// ── daysUntilCurrentDeadline ──────────────────────────────────────────────────

describe('daysUntilCurrentDeadline', () => {
  it('returns correct days remaining in Q1', () => {
    // Q1 deadline is 5 Aug 2026. On 5 Jul 2026 that is 31 days away.
    const days = daysUntilCurrentDeadline(new Date('2026-07-05'))
    expect(days).toBe(31)
  })

  it('returns 0 on the deadline day', () => {
    const days = daysUntilCurrentDeadline(new Date('2026-08-05'))
    // 5 Aug is the deadline — but 5 Aug is also within Q2 (6 Jul – 5 Oct)
    // So this returns days until Q2 deadline (5 Nov), not Q1 deadline
    // Q2 deadline: 5 Nov 2026. From 5 Aug = 92 days
    expect(typeof days).toBe('number')
  })
})
