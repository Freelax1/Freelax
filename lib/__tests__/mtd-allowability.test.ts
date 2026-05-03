import {
  getCategoryAllowability,
  flagExpenseAllowability,
  filterAllowableExpenses,
  filterDisallowedExpenses,
  filterReviewRequiredExpenses,
  calcAllowableExpenseTotal,
  calcDisallowedExpenseTotal,
} from '../logic/mtd-allowability'
import type { Expense } from '@/types/database'

// ── Test fixture ───────────────────────────────────────────────────────────────

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

// ── getCategoryAllowability ────────────────────────────────────────────────────

describe('getCategoryAllowability', () => {
  it('returns allowed for office_supplies', () => {
    expect(getCategoryAllowability('office_supplies').status).toBe('allowed')
  })

  it('returns allowed for software', () => {
    expect(getCategoryAllowability('software').status).toBe('allowed')
  })

  it('returns allowed for professional_fees', () => {
    expect(getCategoryAllowability('professional_fees').status).toBe('allowed')
  })

  it('returns allowed for marketing', () => {
    expect(getCategoryAllowability('marketing').status).toBe('allowed')
  })

  it('returns allowed for equipment', () => {
    expect(getCategoryAllowability('equipment').status).toBe('allowed')
  })

  it('returns allowed_with_conditions for travel with HMRC ref', () => {
    const rule = getCategoryAllowability('travel')
    expect(rule.status).toBe('allowed_with_conditions')
    expect(rule.hmrcRef).toBe('HMRC EIM32000')
  })

  it('returns allowed_with_conditions for phone_internet', () => {
    expect(getCategoryAllowability('phone_internet').status).toBe('allowed_with_conditions')
  })

  it('returns allowed_with_conditions for training with HMRC ref', () => {
    const rule = getCategoryAllowability('training')
    expect(rule.status).toBe('allowed_with_conditions')
    expect(rule.hmrcRef).toBe('HMRC BIM35660')
  })

  it('returns disallowed for meals with HMRC ref', () => {
    const rule = getCategoryAllowability('meals')
    expect(rule.status).toBe('disallowed')
    expect(rule.hmrcRef).toBe('HMRC BIM45000')
  })

  it('returns review_required for other', () => {
    expect(getCategoryAllowability('other').status).toBe('review_required')
  })

  it('returns review_required for unknown category', () => {
    expect(getCategoryAllowability('unicorn_expenses').status).toBe('review_required')
  })

  it('returns a non-empty note for every known category', () => {
    const categories = ['office_supplies', 'software', 'professional_fees', 'marketing', 'equipment', 'travel', 'phone_internet', 'training', 'meals', 'other']
    categories.forEach(cat => {
      expect(getCategoryAllowability(cat).note.length).toBeGreaterThan(0)
    })
  })
})

// ── flagExpenseAllowability ────────────────────────────────────────────────────

describe('flagExpenseAllowability', () => {
  it('returns the expense and its rule fields', () => {
    const expense = makeExpense({ category: 'software' })
    const result = flagExpenseAllowability(expense)

    expect(result.expense).toBe(expense)
    expect(result.status).toBe('allowed')
    expect(result.note.length).toBeGreaterThan(0)
  })

  it('includes hmrcRef when the rule has one', () => {
    const expense = makeExpense({ category: 'travel' })
    const result = flagExpenseAllowability(expense)

    expect(result.hmrcRef).toBe('HMRC EIM32000')
  })

  it('hmrcRef is undefined for categories without one', () => {
    const expense = makeExpense({ category: 'software' })
    const result = flagExpenseAllowability(expense)

    expect(result.hmrcRef).toBeUndefined()
  })
})

// ── filterAllowableExpenses ────────────────────────────────────────────────────

describe('filterAllowableExpenses', () => {
  it('returns only allowed expenses', () => {
    const expenses = [
      makeExpense({ id: '1', category: 'software' }),
      makeExpense({ id: '2', category: 'meals' }),
      makeExpense({ id: '3', category: 'travel' }),
      makeExpense({ id: '4', category: 'marketing' }),
    ]
    const result = filterAllowableExpenses(expenses)

    expect(result).toHaveLength(2)
    expect(result.map(e => e.id)).toEqual(['1', '4'])
  })

  it('returns empty array when no expenses are allowed', () => {
    const expenses = [makeExpense({ category: 'meals' })]
    expect(filterAllowableExpenses(expenses)).toHaveLength(0)
  })
})

// ── filterDisallowedExpenses ───────────────────────────────────────────────────

describe('filterDisallowedExpenses', () => {
  it('returns only disallowed expenses', () => {
    const expenses = [
      makeExpense({ id: '1', category: 'meals' }),
      makeExpense({ id: '2', category: 'software' }),
    ]
    const result = filterDisallowedExpenses(expenses)

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('1')
  })
})

// ── filterReviewRequiredExpenses ───────────────────────────────────────────────

describe('filterReviewRequiredExpenses', () => {
  it('returns only review_required expenses', () => {
    const expenses = [
      makeExpense({ id: '1', category: 'other' }),
      makeExpense({ id: '2', category: 'unicorn' as 'other' }),
      makeExpense({ id: '3', category: 'software' }),
    ]
    const result = filterReviewRequiredExpenses(expenses)

    expect(result).toHaveLength(2)
    expect(result.map(e => e.id)).toEqual(['1', '2'])
  })
})

// ── calcAllowableExpenseTotal ──────────────────────────────────────────────────

describe('calcAllowableExpenseTotal', () => {
  it('sums amounts for allowed categories only', () => {
    const expenses = [
      makeExpense({ id: '1', category: 'software',  amount: 100 }),
      makeExpense({ id: '2', category: 'meals',     amount: 50  }),
      makeExpense({ id: '3', category: 'marketing', amount: 200 }),
    ]
    expect(calcAllowableExpenseTotal(expenses)).toBe(300)
  })

  it('returns 0 for empty list', () => {
    expect(calcAllowableExpenseTotal([])).toBe(0)
  })

  it('rounds to 2 decimal places', () => {
    const expenses = [
      makeExpense({ category: 'software', amount: 33.333 }),
      makeExpense({ id: 'exp-2', category: 'software', amount: 33.333 }),
    ]
    expect(calcAllowableExpenseTotal(expenses)).toBe(66.67)
  })
})

// ── calcDisallowedExpenseTotal ─────────────────────────────────────────────────

describe('calcDisallowedExpenseTotal', () => {
  it('sums amounts for disallowed categories only', () => {
    const expenses = [
      makeExpense({ id: '1', category: 'meals',    amount: 75 }),
      makeExpense({ id: '2', category: 'software', amount: 50 }),
    ]
    expect(calcDisallowedExpenseTotal(expenses)).toBe(75)
  })

  it('returns 0 when no disallowed expenses', () => {
    const expenses = [makeExpense({ category: 'software', amount: 100 })]
    expect(calcDisallowedExpenseTotal(expenses)).toBe(0)
  })
})
