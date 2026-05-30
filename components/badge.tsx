import { cn } from '@/lib/utils'

interface BadgeProps {
  status: string
  className?: string
}

const STATUS_CLASSES: Record<string, string> = {
  outside_ir35:  'bg-green-100 text-green-800 border border-green-200',
  inside_ir35:   'bg-red-100 text-red-800 border border-red-200',
  needs_review:  'bg-amber-100 text-amber-800 border border-amber-200',
  draft:         'bg-gray-100 text-gray-600 border border-gray-200',
  sent:          'bg-blue-100 text-blue-800 border border-blue-200',
  paid:          'bg-green-100 text-green-800 border border-green-200',
  overdue:       'bg-red-100 text-red-800 border border-red-200',
  cancelled:     'bg-gray-100 text-gray-400 border border-gray-200',
  active:        'bg-green-100 text-green-800 border border-green-200',
  paused:        'bg-amber-100 text-amber-800 border border-amber-200',
  archived:      'bg-gray-100 text-gray-600 border border-gray-200',
  on_hold:       'bg-amber-100 text-amber-800 border border-amber-200',
  completed:     'bg-slate-100 text-slate-700 border border-slate-200',
  accepted:      'bg-green-100 text-green-800 border border-green-200',
  declined:      'bg-red-100 text-red-800 border border-red-200',
  expired:       'bg-gray-100 text-gray-500 border border-gray-200',
}

const STATUS_LABELS: Record<string, string> = {
  outside_ir35: 'Outside IR35',
  inside_ir35:  'Inside IR35',
  needs_review: 'Needs review',
  on_hold:      'On hold',
  day_rate:     'Day rate',
  hourly:       'Hourly',
  fixed:        'Fixed',
}

export default function Badge({ status, className }: BadgeProps) {
  const classes = STATUS_CLASSES[status] ?? 'bg-gray-100 text-gray-600 border border-gray-200'
  const label = STATUS_LABELS[status] ?? status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium', classes, className)}>
      {label}
    </span>
  )
}
