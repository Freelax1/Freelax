import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import React from 'react'
import { XCircle, Warning, CheckCircle, Info } from '@phosphor-icons/react'

const alert = cva(
  'rounded-xl px-4 py-3 text-sm flex items-start gap-2',
  {
    variants: {
      intent: {
        danger:  'bg-danger-50  border border-danger-200  text-danger-700',
        warning: 'bg-warning-50 border border-warning-200 text-warning-700',
        success: 'bg-success-50 border border-success-200 text-success-700',
        info:    'bg-info-50    border border-info-200    text-info-700',
        helper:  'bg-surface-card border border-border-default text-text-secondary',
        neutral: 'bg-surface-sunken border border-border-subtle text-text-secondary',
      },
    },
    defaultVariants: { intent: 'neutral' },
  }
)

const ICONS = {
  danger:  XCircle,
  warning: Warning,
  success: CheckCircle,
  info:    Info,
  helper:  Info,
  neutral: Info,
} as const

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alert> {
  icon?: React.ReactNode
  title?: string
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ intent = 'neutral', icon, title, children, className, ...props }, ref) => (
    <div ref={ref} className={cn(alert({ intent }), className)} role="alert" {...props}>
      {icon !== undefined ? (
        icon && <span className="flex-shrink-0 mt-0.5">{icon}</span>
      ) : (
        (() => { const I = ICONS[intent ?? 'neutral']; return <I weight="regular" className="flex-shrink-0 mt-0.5 w-4 h-4" /> })()
      )}
      <div className="flex-1 min-w-0">
        {title && <p className="font-semibold mb-0.5">{title}</p>}
        <div>{children}</div>
      </div>
    </div>
  )
)
Alert.displayName = 'Alert'
export default Alert
