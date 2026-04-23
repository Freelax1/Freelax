// lib/logic/clients.ts — v1.0
// Pure client calculations. No Supabase, no React.

export function calcOutstanding(invoices: { status: string; total: number }[]): number {
  return invoices
    .filter(i => ['sent', 'overdue'].includes(i.status))
    .reduce((s, i) => s + Number(i.total), 0)
}

export function calcTotalInvoiced(invoices: { total: number }[]): number {
  return invoices.reduce((s, i) => s + Number(i.total), 0)
}

export function calcTotalPaid(invoices: { status: string; total: number }[]): number {
  return invoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.total), 0)
}
