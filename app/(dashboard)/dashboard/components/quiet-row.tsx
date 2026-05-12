'use client'
import Link from 'next/link'
import { formatCurrency } from '@/lib/tax-calculations'

interface Props {
  activeClients:     number
  openInvoices:      number
  openInvoicesTotal: number
  expensesThisMonth: number
  liveProjects:      number
}

export default function QuietRow({ activeClients, openInvoices, openInvoicesTotal, expensesThisMonth, liveProjects }: Props) {
  const stats = [
    { label: 'Active clients',       value: String(activeClients),            href: '/clients' },
    { label: 'Waiting to be paid',   value: openInvoices > 0 ? `${openInvoices} (${formatCurrency(openInvoicesTotal)})` : 'None', href: '/invoices' },
    { label: 'Money out this month', value: formatCurrency(expensesThisMonth), href: '/expenses' },
    { label: 'Live projects',        value: String(liveProjects),             href: '/projects' },
  ]

  return (
    <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: 20, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
      {stats.map((s, i) => (
        <Link key={s.label} href={s.href} style={{ textDecoration: 'none' }}>
          <p style={{ fontSize: 10.5, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 4 }}>
            {s.label}
          </p>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#475569', fontVariantNumeric: 'tabular-nums' }}>
            {s.value}
          </p>
        </Link>
      ))}
    </div>
  )
}
