'use client'
import Link from 'next/link'
import { formatCurrency } from '@/lib/tax-calculations'
import { cn } from '@/lib/utils'

interface Props {
  unpaidTotal:   number
  hasOverdue:    boolean
  activeClients: number
  liveProjects:  number
}

const labelClass = 'text-micro font-semibold text-text-muted uppercase mb-1'
const valueClass = 'text-2xl font-bold tracking-tight text-text-primary group-hover:underline tabular-nums'

export default function OperationalRow({ unpaidTotal, hasOverdue, activeClients, liveProjects }: Props) {
  return (
    <div className="bg-surface-card rounded-xl p-5 border border-border-default grid grid-cols-3 gap-6">
      <Link href="/invoices" className="block group">
        <p className={labelClass}>Awaiting payment</p>
        <p className={cn(valueClass, hasOverdue && 'text-danger-600')}>
          {formatCurrency(unpaidTotal)}
        </p>
        {hasOverdue && (
          <p className="text-caption font-medium text-danger-600 mt-0.5">Includes overdue</p>
        )}
      </Link>

      <Link href="/clients" className="block group">
        <p className={labelClass}>Active clients</p>
        <p className={valueClass}>{activeClients}</p>
      </Link>

      <Link href="/projects" className="block group">
        <p className={labelClass}>Live projects</p>
        <p className={valueClass}>{liveProjects}</p>
      </Link>
    </div>
  )
}
