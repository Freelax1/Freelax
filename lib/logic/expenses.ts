// lib/logic/expenses.ts — v1.0
// Pure expense calculations and constants. No Supabase, no React.

import type { Expense } from '@/types/database'

export const CATEGORY_LABELS: Record<string, string> = {
  office_supplies:   'Office & Supplies',
  travel:            'Travel & Transport',
  software:          'Software & Subs',
  phone_internet:    'Phone & Internet',
  professional_fees: 'Professional Fees',
  marketing:         'Marketing',
  equipment:         'Equipment',
  training:          'Training',
  meals:             'Meals & Entertainment',
  other:             'Other',
}

export const CATEGORY_COLORS: Record<string, string> = {
  office_supplies:   'bg-info-50 text-info-700',
  travel:            'bg-warning-50 text-warning-800',
  software:          'bg-forest-50 text-forest-700',
  phone_internet:    'bg-info-50 text-info-600',
  professional_fees: 'bg-surface-sunken text-text-secondary',
  marketing:         'bg-danger-50 text-danger-700',
  equipment:         'bg-success-50 text-success-700',
  training:          'bg-warning-50 text-warning-700',
  meals:             'bg-danger-50 text-danger-700',
  other:             'bg-surface-sunken text-text-muted',
}

export function calcTotalExVat(expenses: Expense[]): number {
  return expenses.reduce((s, e) => s + Number(e.amount), 0)
}

export function calcVatReclaimable(expenses: Expense[]): number {
  return expenses.filter(e => e.vat_reclaimable).reduce((s, e) => s + Number(e.vat_amount), 0)
}

export function calcReceiptsUploaded(expenses: Expense[]): number {
  return expenses.filter(e => e.receipt_url).length
}
