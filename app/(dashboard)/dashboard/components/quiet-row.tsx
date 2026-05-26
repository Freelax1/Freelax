'use client'

import Link from 'next/link'
import StatCard from '@/components/ui/stat-card'
import { cardLabel } from '@/lib/typography'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/tax-calculations'

interface Props {
  activeClients:     number
  openInvoices:      number
  openInvoicesTotal: number
  expensesThisMonth: number
  liveProjects:      number
}

const tileLinkClass = 'no-underline flex min-h-0 min-w-0'

export default function QuietRow({
  activeClients,
  openInvoices,
  openInvoicesTotal,
  expensesThisMonth,
  liveProjects,
}: Props) {
  const hasUnpaid = openInvoices > 0

  return (
    <div>
      <p className={cn(cardLabel, 'mb-3')}>At a glance</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 fd-stat-grid">
        <Link href="/clients" className={tileLinkClass}>
          <StatCard
            size="sm"
            label="Active clients"
            tooltip="Active clients only."
            value={activeClients}
            className="w-full h-full transition-[border-color,background-color] duration-fast hover:border-border-hover"
          />
        </Link>

        <Link href="/invoices" className={tileLinkClass}>
          <StatCard
            size="sm"
            label="Waiting to be paid"
            tooltip="Unpaid sent and overdue invoices. Drafts excluded."
            value={hasUnpaid ? formatCurrency(openInvoicesTotal) : 'None'}
            sub={
              hasUnpaid
                ? `${openInvoices} invoice${openInvoices !== 1 ? 's' : ''}`
                : undefined
            }
            valueColor={hasUnpaid ? 'var(--warning-700)' : 'var(--text-muted)'}
            className={cn(
              'w-full h-full transition-[border-color,background-color] duration-fast',
              hasUnpaid
                ? 'border-warning-200 bg-warning-50 hover:border-warning-300'
                : 'hover:border-border-hover',
            )}
          />
        </Link>

        <Link href="/expenses" className={tileLinkClass}>
          <StatCard
            size="sm"
            label="Money out this month"
            tooltip="This month's expenses (ex-VAT)."
            value={formatCurrency(expensesThisMonth)}
            className="w-full h-full transition-[border-color,background-color] duration-fast hover:border-border-hover"
          />
        </Link>

        <Link href="/projects" className={tileLinkClass}>
          <StatCard
            size="sm"
            label="Live projects"
            tooltip="Projects marked Active."
            value={liveProjects}
            className="w-full h-full transition-[border-color,background-color] duration-fast hover:border-border-hover"
          />
        </Link>
      </div>
    </div>
  )
}
