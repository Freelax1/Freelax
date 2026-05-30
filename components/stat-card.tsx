import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string | number
  subtext?: string
  alert?: boolean
  className?: string
}

export default function StatCard({ label, value, subtext, alert, className }: StatCardProps) {
  return (
    <div className={cn(
      'bg-white rounded-xl border border-slate-200 p-5',
      alert && 'border-red-200 bg-red-50',
      className
    )}>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={cn(
        'text-3xl font-bold mt-1',
        alert ? 'text-red-700' : 'text-slate-900'
      )}>
        {value}
      </p>
      {subtext && (
        <p className={cn(
          'text-xs mt-1',
          alert ? 'text-red-500' : 'text-slate-400'
        )}>
          {subtext}
        </p>
      )}
    </div>
  )
}
