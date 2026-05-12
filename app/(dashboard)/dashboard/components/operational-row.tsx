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
    <div className="bg-white rounded-2xl p-5 border border-slate-200 grid grid-cols-3 gap-6">
      <Link href="/invoices" className="block group">
        <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-[0.12em] mb-1">Awaiting payment</p>
        <p className={`text-2xl font-bold tracking-tight group-hover:underline ${hasOverdue ? 'text-red-600' : 'text-slate-900'}`}>
          {formatCurrency(unpaidTotal)}
        </p>
        {hasOverdue && <p className="text-[11px] text-red-500 mt-0.5">Includes overdue</p>}
      </Link>

      <Link href="/clients" className="block group">
        <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-[0.12em] mb-1">Active clients</p>
        <p className="text-2xl font-bold text-slate-900 group-hover:underline">{activeClients}</p>
      </Link>

      <Link href="/projects" className="block group">
        <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-[0.12em] mb-1">Live projects</p>
        <p className="text-2xl font-bold text-slate-900 group-hover:underline">{liveProjects}</p>
      </Link>
    </div>
  )
}
