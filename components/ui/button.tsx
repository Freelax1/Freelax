import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import React from 'react'

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40',
  {
    variants: {
      intent: {
        primary:   'bg-brand-primary text-white hover:bg-forest-700 active:bg-forest-800',
        secondary: 'bg-surface-card text-text-primary border border-border-default hover:bg-surface-sunken hover:border-border-strong',
        ghost:     'text-text-secondary hover:text-text-primary hover:bg-surface-sunken',
        danger:    'bg-danger-600 text-white hover:bg-danger-700 active:bg-danger-800',
        'danger-subtle': 'bg-danger-50 text-danger-700 border border-danger-200 hover:bg-danger-100',
        outline:   'border border-border-default text-text-secondary hover:bg-surface-sunken hover:border-border-strong',
        auth:      'bg-brand-primary text-white font-semibold hover:bg-forest-700 active:bg-forest-800 disabled:bg-forest-600 disabled:cursor-default focus-visible:ring-white/40',
      },
      size: {
        xs: 'px-2.5 py-1   text-xs  rounded-lg',
        sm: 'px-3   py-1.5 text-sm  rounded-lg',
        md: 'px-4   py-2   text-sm  rounded-lg',
        lg: 'px-5   py-2.5 text-base rounded-lg',
        auth: 'px-4 py-3 text-base rounded-lg',
      },
      fullWidth: {
        true:  'w-full',
        false: '',
      },
    },
    defaultVariants: { intent: 'primary', size: 'md', fullWidth: false },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ intent, size, fullWidth, className, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ intent, size, fullWidth }), className)}
      {...props}
    />
  )
)
Button.displayName = 'Button'
export default Button
