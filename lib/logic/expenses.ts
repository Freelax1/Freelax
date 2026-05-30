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
  office_supplies:   'bg-blue-100 text-blue-700',
  travel:            'bg-orange-100 text-orange-700',
  software:          'bg-purple-100 text-purple-700',
  phone_internet:    'bg-cyan-100 text-cyan-700',
  professional_fees: 'bg-slate-100 text-slate-700',
  marketing:         'bg-pink-100 text-pink-700',
  equipment:         'bg-green-100 text-green-700',
  training:          'bg-yellow-100 text-yellow-700',
  meals:             'bg-red-100 text-red-700',
  other:             'bg-gray-100 text-gray-600',
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
