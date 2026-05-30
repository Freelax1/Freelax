// lib/logic/mtd-allowability.ts
// HMRC expense allowability classification for MTD ITSA.
// No database, no API dependencies.

import type { Expense } from '@/types/database'

export type AllowabilityStatus = 'allowed' | 'allowed_with_conditions' | 'disallowed' | 'review_required'

export interface AllowabilityRule {
  status:   AllowabilityStatus
  note:     string
  hmrcRef?: string
}

export interface ExpenseAllowabilityResult {
  expense:    Expense
  status:     AllowabilityStatus
  note:       string
  hmrcRef?:   string
}

// ── Rules table ───────────────────────────────────────────────────────────────

const ALLOWABILITY_RULES: Record<string, AllowabilityRule> = {
  office_supplies: {
    status: 'allowed',
    note:   'Stationery, postage, and general office supplies are fully deductible.',
  },
  software: {
    status: 'allowed',
    note:   'Subscriptions and licences used wholly for business are fully deductible.',
  },
  professional_fees: {
    status: 'allowed',
    note:   'Accountancy, legal, and other professional fees for the business are deductible.',
  },
  marketing: {
    status: 'allowed',
    note:   'Advertising and marketing costs incurred wholly for business are deductible.',
  },
  equipment: {
    status: 'allowed',
    note:   'Business equipment may qualify as capital allowance (Annual Investment Allowance).',
  },
  travel: {
    status:   'allowed_with_conditions',
    note:     'Business travel is deductible but commuting to a permanent workplace is not.',
    hmrcRef:  'HMRC EIM32000',
  },
  phone_internet: {
    status: 'allowed_with_conditions',
    note:   'Only the business-use proportion is deductible when the line has personal use too.',
  },
  training: {
    status:   'allowed_with_conditions',
    note:     'Training to update existing skills is deductible; learning new trades is not.',
    hmrcRef:  'HMRC BIM35660',
  },
  meals: {
    status:   'disallowed',
    note:     'Everyday meals are a personal expense and not deductible.',
    hmrcRef:  'HMRC BIM45000',
  },
  other: {
    status: 'review_required',
    note:   'Category requires manual review to confirm HMRC allowability.',
  },
}

// Fallback rule for categories not in the table
const FALLBACK_RULE: AllowabilityRule = {
  status: 'review_required',
  note:   'Unrecognised category — manual review required.',
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns the allowability rule for a given expense category string.
 * Falls back to review_required for unrecognised categories.
 */
export function getCategoryAllowability(category: string): AllowabilityRule {
  return ALLOWABILITY_RULES[category] ?? FALLBACK_RULE
}

/**
 * Returns the allowability result for a single expense.
 */
export function flagExpenseAllowability(expense: Expense): ExpenseAllowabilityResult {
  const rule = getCategoryAllowability(expense.category)
  return { expense, ...rule }
}

/**
 * Returns only expenses whose category is 'allowed'.
 */
export function filterAllowableExpenses(expenses: Expense[]): Expense[] {
  return expenses.filter(e => getCategoryAllowability(e.category).status === 'allowed')
}

/**
 * Returns only expenses whose category is 'disallowed'.
 */
export function filterDisallowedExpenses(expenses: Expense[]): Expense[] {
  return expenses.filter(e => getCategoryAllowability(e.category).status === 'disallowed')
}

/**
 * Returns only expenses whose category is 'review_required'.
 */
export function filterReviewRequiredExpenses(expenses: Expense[]): Expense[] {
  return expenses.filter(e => getCategoryAllowability(e.category).status === 'review_required')
}

/**
 * Sums the `amount` field (ex-VAT) for all fully-allowed expenses.
 */
export function calcAllowableExpenseTotal(expenses: Expense[]): number {
  return Math.round(
    filterAllowableExpenses(expenses).reduce((sum, e) => sum + Number(e.amount), 0) * 100
  ) / 100
}

/**
 * Sums the `amount` field (ex-VAT) for all disallowed expenses.
 */
export function calcDisallowedExpenseTotal(expenses: Expense[]): number {
  return Math.round(
    filterDisallowedExpenses(expenses).reduce((sum, e) => sum + Number(e.amount), 0) * 100
  ) / 100
}
