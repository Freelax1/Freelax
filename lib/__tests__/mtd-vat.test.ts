import { calcVatReturn, box5Label } from '../logic/mtd-vat'
import type { Invoice, Expense } from '@/types/database'

// ── Test fixtures ──────────────────────────────────────────────────────────────

const periodStart = new Date('2026-04-06')
const periodEnd   = new Date('2026-07-05')

function makeInvoice(overrides: Partial<Invoice>): Invoice {
  return {
    id: 'inv-1',
    user_id: 'user-1',
    client_id: null,
    project_id: null,
    invoice_number: 'INV-0001',
    status: 'paid',
    issue_date: '2026-05-01',
    due_date: '2026-05-31',
    paid_date: '2026-05-15',
    subtotal: 1000,
    vat_amount: 200,
    total: 1200,
    notes: null,
    payment_terms: 'Payment due within 30 days',
    stripe_payment_link: null,
    sent_at: null,
    chase_log: null,
    public_token: null,
    business_id: null,
    created_at: '2026-05-01T00:00:00Z',
    updated_at: '2026-05-01T00:00:00Z',
    ...overrides,
  }
}

function makeExpense(overrides: Partial<Expense>): Expense {
  return {
    id: 'exp-1',
    user_id: 'user-1',
    date: '2026-05-10',
    merchant: 'Test Merchant',
    description: null,
    category: 'software',
    amount: 100,
    vat_amount: 20,
    vat_reclaimable: true,
    receipt_url: null,
    ai_scanned: false,
    business_id: null,
    created_at: '2026-05-10T00:00:00Z',
    updated_at: '2026-05-10T00:00:00Z',
    ...overrides,
  }
}

// ── calcVatReturn ──────────────────────────────────────────────────────────────

describe('calcVatReturn', () => {
  it('calculates all boxes correctly for a simple case', () => {
    const invoices = [makeInvoice({ subtotal: 1000, vat_amount: 200, total: 1200 })]
    const expenses = [makeExpense({ amount: 100, vat_amount: 20, vat_reclaimable: true })]

    const result = calcVatReturn({ invoices, expenses, periodStart, periodEnd })

    expect(result.box1).toBe(200)    // output VAT
    expect(result.box2).toBe(0)      // EC acquisitions (default)
    expect(result.box3).toBe(200)    // box1 + box2
    expect(result.box4).toBe(20)     // input VAT reclaimable
    expect(result.box5).toBe(180)    // net owed to HMRC
    expect(result.box6).toBe(1000)   // net sales ex-VAT
    expect(result.box7).toBe(100)    // net purchases ex-VAT
    expect(result.box8).toBe(0)
    expect(result.box9).toBe(0)
  })

  it('excludes draft invoices from boxes 1 and 6', () => {
    const invoices = [
      makeInvoice({ status: 'paid', subtotal: 1000, vat_amount: 200 }),
      makeInvoice({ id: 'inv-2', status: 'draft', subtotal: 500, vat_amount: 100 }),
    ]
    const result = calcVatReturn({ invoices, expenses: [], periodStart, periodEnd })

    expect(result.box1).toBe(200)   // draft excluded
    expect(result.box6).toBe(1000)  // draft excluded
  })

  it('includes sent invoices (VAT due on issue, not payment)', () => {
    const invoices = [makeInvoice({ status: 'sent', subtotal: 800, vat_amount: 160 })]
    const result = calcVatReturn({ invoices, expenses: [], periodStart, periodEnd })

    expect(result.box1).toBe(160)
    expect(result.box6).toBe(800)
  })

  it('excludes invoices outside the period', () => {
    const invoices = [
      makeInvoice({ issue_date: '2026-05-01', subtotal: 1000, vat_amount: 200 }),  // in period
      makeInvoice({ id: 'inv-2', issue_date: '2026-08-01', subtotal: 500, vat_amount: 100 }),  // Q2, out
    ]
    const result = calcVatReturn({ invoices, expenses: [], periodStart, periodEnd })

    expect(result.box1).toBe(200)
    expect(result.box6).toBe(1000)
  })

  it('excludes non-reclaimable expense VAT from box 4 but includes amount in box 7', () => {
    const expenses = [
      makeExpense({ amount: 100, vat_amount: 20, vat_reclaimable: true }),
      makeExpense({ id: 'exp-2', amount: 50, vat_amount: 10, vat_reclaimable: false }),
    ]
    const result = calcVatReturn({ invoices: [], expenses, periodStart, periodEnd })

    expect(result.box4).toBe(20)    // only reclaimable VAT
    expect(result.box7).toBe(150)   // all expenses ex-VAT
  })

  it('excludes expenses outside the period', () => {
    const expenses = [
      makeExpense({ date: '2026-05-10', amount: 100, vat_amount: 20, vat_reclaimable: true }),
      makeExpense({ id: 'exp-2', date: '2026-08-01', amount: 50, vat_amount: 10, vat_reclaimable: true }),
    ]
    const result = calcVatReturn({ invoices: [], expenses, periodStart, periodEnd })

    expect(result.box4).toBe(20)
    expect(result.box7).toBe(100)
  })

  it('returns negative box5 when input VAT exceeds output VAT (reclaim scenario)', () => {
    const invoices = [makeInvoice({ subtotal: 100, vat_amount: 20 })]
    const expenses = [makeExpense({ amount: 500, vat_amount: 100, vat_reclaimable: true })]

    const result = calcVatReturn({ invoices, expenses, periodStart, periodEnd })

    expect(result.box1).toBe(20)
    expect(result.box4).toBe(100)
    expect(result.box5).toBe(-80)   // reclaim from HMRC
  })

  it('applies box2 override and recalculates box3 and box5', () => {
    const invoices = [makeInvoice({ subtotal: 1000, vat_amount: 200 })]
    const result = calcVatReturn({
      invoices, expenses: [], periodStart, periodEnd,
      box2Override: 50,
    })

    expect(result.box2).toBe(50)
    expect(result.box3).toBe(250)   // 200 + 50
    expect(result.box5).toBe(250)   // 250 - 0
  })

  it('rounds all values to 2 decimal places', () => {
    const invoices = [makeInvoice({ subtotal: 333.333, vat_amount: 66.667 })]
    const result = calcVatReturn({ invoices, expenses: [], periodStart, periodEnd })

    expect(result.box1).toBe(66.67)
    expect(result.box6).toBe(333.33)
  })

  it('returns all zeros for empty period', () => {
    const result = calcVatReturn({ invoices: [], expenses: [], periodStart, periodEnd })

    expect(result).toEqual({ box1: 0, box2: 0, box3: 0, box4: 0, box5: 0, box6: 0, box7: 0, box8: 0, box9: 0 })
  })

  it('handles period boundary dates inclusively', () => {
    const invoices = [
      makeInvoice({ issue_date: '2026-04-06', subtotal: 100, vat_amount: 20 }),  // first day
      makeInvoice({ id: 'inv-2', issue_date: '2026-07-05', subtotal: 200, vat_amount: 40 }),  // last day
      makeInvoice({ id: 'inv-3', issue_date: '2026-04-05', subtotal: 300, vat_amount: 60 }),  // day before — excluded
      makeInvoice({ id: 'inv-4', issue_date: '2026-07-06', subtotal: 400, vat_amount: 80 }),  // day after — excluded
    ]
    const result = calcVatReturn({ invoices, expenses: [], periodStart, periodEnd })

    expect(result.box1).toBe(60)    // 20 + 40 only
    expect(result.box6).toBe(300)   // 100 + 200 only
  })
})

// ── box5Label ─────────────────────────────────────────────────────────────────

describe('box5Label', () => {
  it('shows pay HMRC for positive box5', () => {
    expect(box5Label(180)).toBe('Pay HMRC £180.00')
  })

  it('shows reclaim for negative box5', () => {
    expect(box5Label(-80)).toBe('Reclaim £80.00 from HMRC')
  })

  it('shows nothing to pay for zero', () => {
    expect(box5Label(0)).toBe('Nothing to pay or reclaim')
  })
})
