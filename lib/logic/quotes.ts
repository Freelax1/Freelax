// lib/logic/quotes.ts — v1.0
// Pure quote calculations. No Supabase, no React.

export interface QuoteLineItem {
  description: string
  quantity: number
  unit_price: number
  vat_rate: number
}

export function calcQuoteSubtotal(items: QuoteLineItem[]): number {
  return items.reduce((s, l) => s + l.quantity * l.unit_price, 0)
}

export function calcQuoteVat(items: QuoteLineItem[]): number {
  return items.reduce((s, l) => s + l.quantity * l.unit_price * l.vat_rate / 100, 0)
}

export function calcQuoteTotal(items: QuoteLineItem[]): number {
  return calcQuoteSubtotal(items) + calcQuoteVat(items)
}

export function generateQuoteNumber(existingCount: number, prefix = 'QUO'): string {
  return `${prefix}-${String(existingCount + 1).padStart(4, '0')}`
}

export function isQuoteExpired(expiryDate: string | null | undefined): boolean {
  if (!expiryDate) return false
  return new Date(expiryDate) < new Date()
}

export function daysUntilExpiry(expiryDate: string | null | undefined): number {
  if (!expiryDate) return Number.POSITIVE_INFINITY
  return Math.ceil((new Date(expiryDate).getTime() - Date.now()) / 86400000)
}

export const QUOTE_STATUS_LABELS: Record<string, string> = {
  draft:    'Draft',
  sent:     'Sent',
  accepted: 'Accepted',
  declined: 'Declined',
  expired:  'Expired',
}
