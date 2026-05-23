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
    <div className="pt-5 grid grid-cols-4 gap-4 border-t border-border-default">
      {stats.map((s, i) => (
        <Link key={s.label} href={s.href} className="no-underline">
          <p className="text-caption text-text-secondary font-semibold mb-1">
            {s.label}
          </p>
          <p className="text-base font-semibold text-text-secondary [font-variant-numeric:tabular-nums]">
            {s.value}
          </p>
        </Link>
      ))}
    </div>
  )
}
