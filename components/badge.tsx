import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badge = cva(
  'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border',
  {
    variants: {
      intent: {
        success: 'bg-success-50 text-success-700 border-success-200',
        danger:  'bg-danger-50  text-danger-700  border-danger-200',
        warning: 'bg-warning-50 text-warning-700 border-warning-200',
        neutral: 'bg-surface-sunken text-text-secondary border-border-subtle',
        info:    'bg-forest-50 text-forest-700 border-forest-200',
      },
    },
    defaultVariants: { intent: 'neutral' },
  }
)

type Intent = NonNullable<VariantProps<typeof badge>['intent']>

const STATUS_INTENT: Record<string, Intent> = {
  paid:           'success',
  active:         'success',
  accepted:       'success',
  outside_ir35:   'success',
  overdue:        'danger',
  cancelled:      'danger',
  declined:       'danger',
  inside_ir35:    'danger',
  paused:         'warning',
  on_hold:        'warning',
  needs_review:   'warning',
  sent:           'info',
  draft:          'neutral',
  archived:       'neutral',
  expired:        'neutral',
  completed:      'neutral',
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

interface BadgeProps extends VariantProps<typeof badge> {
  status?: string
  className?: string
}

export default function Badge({ status = '', intent, className }: BadgeProps) {
  const resolvedIntent = intent ?? STATUS_INTENT[status] ?? 'neutral'
  const label = STATUS_LABELS[status] ?? status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  return (
    <span className={cn(badge({ intent: resolvedIntent }), className)}>
      {label}
    </span>
  )
}
