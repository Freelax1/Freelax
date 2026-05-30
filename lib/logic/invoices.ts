// lib/logic/invoices.ts — v1.0
// Pure invoice calculations. No Supabase, no React.

export interface LineItem {
  description: string
  quantity: number
  unit_price: number
  vat_rate: number
}

export function calcSubtotal(lineItems: LineItem[]): number {
  return lineItems.reduce((s, l) => s + l.quantity * l.unit_price, 0)
}

export function calcVatAmount(lineItems: LineItem[]): number {
  return lineItems.reduce((s, l) => s + l.quantity * l.unit_price * l.vat_rate / 100, 0)
}

export function calcTotal(lineItems: LineItem[]): number {
  return calcSubtotal(lineItems) + calcVatAmount(lineItems)
}

export function calcDaysOverdue(dueDate: string): number {
  return Math.floor((Date.now() - new Date(dueDate).getTime()) / 86400000)
}

export function isPastDue(status: string, dueDate: string, today: string): boolean {
  return ['sent', 'draft'].includes(status) && dueDate < today
}

export function generateInvoiceNumber(maxNumber: number, prefix = 'INV'): string {
  return `${prefix}-${String(maxNumber + 1).padStart(4, '0')}`
}
