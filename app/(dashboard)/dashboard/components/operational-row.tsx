'use client'
import Link from 'next/link'
import { formatCurrency } from '@/lib/tax-calculations'

interface Props {
  unpaidTotal:   number
  hasOverdue:    boolean
  activeClients: number
  liveProjects:  number
}

export default function OperationalRow({ unpaidTotal, hasOverdue, activeClients, liveProjects }: Props) {
  return (
    <div className="bg-surface-card rounded-xl p-5 border border-border-default grid grid-cols-3 gap-6">
      <Link href="/invoices" className="block group">
        <p className="text-micro font-semibold text-text-secondary mb-1">Awaiting payment</p>
        <p className={`text-2xl font-serif font-semibold tracking-tight group-hover:underline ${hasOverdue ? 'text-danger-600' : 'text-text-primary'}`}>
          {formatCurrency(unpaidTotal)}
        </p>
        {hasOverdue && <p className="text-caption text-danger-500 mt-0.5">Includes overdue</p>}
      </Link>

      <Link href="/clients" className="block group">
        <p className="text-micro font-semibold text-text-secondary mb-1">Active clients</p>
        <p className="text-2xl font-serif font-semibold text-text-primary group-hover:underline">{activeClients}</p>
      </Link>

      <Link href="/projects" className="block group">
        <p className="text-micro font-semibold text-text-secondary mb-1">Live projects</p>
        <p className="text-2xl font-serif font-semibold text-text-primary group-hover:underline">{liveProjects}</p>
      </Link>
    </div>
  )
}
