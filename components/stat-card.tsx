import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const statCard = cva(
  'rounded-xl border p-5',
  {
    variants: {
      intent: {
        default: 'bg-surface-card border-border-default',
        danger:  'bg-danger-50 border-danger-200',
        success: 'bg-success-50 border-success-200',
        warning: 'bg-warning-50 border-warning-200',
        sunken:  'bg-surface-sunken border-border-subtle',
      },
    },
    defaultVariants: { intent: 'default' },
  }
)

const statValue = cva('text-3xl font-serif font-semibold mt-1', {
  variants: {
    intent: {
      default: 'text-text-primary',
      danger:  'text-danger-700',
      success: 'text-success-700',
      warning: 'text-warning-700',
      sunken:  'text-text-primary',
    },
  },
  defaultVariants: { intent: 'default' },
})

const statSub = cva('text-xs mt-1', {
  variants: {
    intent: {
      default: 'text-text-secondary',
      danger:  'text-danger-600',
      success: 'text-success-600',
      warning: 'text-warning-600',
      sunken:  'text-text-muted',
    },
  },
  defaultVariants: { intent: 'default' },
})

interface StatCardProps extends VariantProps<typeof statCard> {
  label: string
  value: string | number
  subtext?: string
  className?: string
}

export default function StatCard({ label, value, subtext, intent, className }: StatCardProps) {
  return (
    <div className={cn(statCard({ intent }), className)}>
      <p className="text-xs font-medium text-text-secondary">{label}</p>
      <p className={statValue({ intent })}>{value}</p>
      {subtext && <p className={statSub({ intent })}>{subtext}</p>}
    </div>
  )
}
