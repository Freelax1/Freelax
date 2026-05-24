import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import React from 'react'

export const cardVariants = cva(
  'rounded-xl border',
  {
    variants: {
      variant: {
        default:  'bg-surface-card border-border-default',
        sunken:   'bg-surface-sunken border-border-subtle',
        elevated: 'bg-surface-card border-border-default shadow-md',
        ghost:    'bg-transparent border-transparent',
        danger:   'bg-danger-50 border-danger-200',
        warning:  'bg-warning-50 border-warning-200',
        success:  'bg-success-50 border-success-200',
        info:     'bg-forest-50 border-forest-200',
      },
      padding: {
        none: '',
        sm:   'p-4',
        md:   'p-5',
        lg:   'p-6',
        xl:   'p-8',
      },
    },
    defaultVariants: { variant: 'default', padding: 'lg' },
  }
)

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ variant, padding, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, padding }), className)}
      {...props}
    />
  )
)
Card.displayName = 'Card'

// ── Sub-components ────────────────────────────────────────────────────────

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center justify-between mb-4', className)} {...props} />
  )
)
CardHeader.displayName = 'CardHeader'

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn('text-xs font-semibold text-text-secondary', className)} {...props} />
  )
)
CardTitle.displayName = 'CardTitle'

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('', className)} {...props} />
  )
)
CardContent.displayName = 'CardContent'

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('mt-4 pt-4 border-t border-border-subtle flex items-center gap-2', className)} {...props} />
  )
)
CardFooter.displayName = 'CardFooter'

export { Card, CardHeader, CardTitle, CardContent, CardFooter }
export default Card
