import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import React from 'react'

export const inputVariants = cva(
  'w-full rounded-md text-sm transition-colors focus-visible:outline-none font-sans',
  {
    variants: {
      variant: {
        default: 'px-3 py-2 border border-border-default bg-surface-card text-text-primary placeholder:text-text-muted hover:border-border-hover focus-visible:border-border-focus focus-visible:ring-2 focus-visible:ring-brand-primary/20 disabled:hover:border-border-default disabled:bg-surface-sunken disabled:text-text-muted disabled:cursor-not-allowed',
        error:   'px-3 py-2 border border-danger-500 bg-surface-card text-text-primary placeholder:text-text-muted focus-visible:border-danger-500 focus-visible:ring-2 focus-visible:ring-danger-500/20',
        inline:  'px-2 py-1.5 border border-border-default bg-surface-card text-text-primary placeholder:text-text-muted hover:border-border-hover focus-visible:border-border-focus focus-visible:ring-1 focus-visible:ring-brand-primary/20 disabled:hover:border-border-default disabled:bg-surface-sunken disabled:text-text-muted disabled:cursor-not-allowed',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

// ── Input ─────────────────────────────────────────────────────────────────

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {
  error?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ variant, error, className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(inputVariants({ variant: error ? 'error' : variant }), className)}
      {...props}
    />
  )
)
Input.displayName = 'Input'

// ── Textarea ──────────────────────────────────────────────────────────────

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    VariantProps<typeof inputVariants> {
  error?: boolean
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ variant, error, className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(inputVariants({ variant: error ? 'error' : variant }), 'resize-none', className)}
      {...props}
    />
  )
)
Textarea.displayName = 'Textarea'

// ── Select ────────────────────────────────────────────────────────────────

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement>,
    VariantProps<typeof inputVariants> {
  error?: boolean
  options?: { value: string; label: string }[]
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ variant, error, options, className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(inputVariants({ variant: error ? 'error' : variant }), className)}
      {...props}
    >
      {options ? options.map(o => <option key={o.value} value={o.value}>{o.label}</option>) : children}
    </select>
  )
)
Select.displayName = 'Select'

// ── Label ─────────────────────────────────────────────────────────────────

const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn('block text-caption font-semibold text-text-secondary mb-1.5', className)}
      {...props}
    />
  )
)
Label.displayName = 'Label'

// ── Field wrapper ─────────────────────────────────────────────────────────

interface FieldProps {
  label?: React.ReactNode
  required?: boolean
  error?: string
  hint?: string
  children: React.ReactNode
  className?: string
}

function Field({ label, required, error, hint, children, className }: FieldProps) {
  return (
    <div className={cn('space-y-1', className)}>
      {label && (
        <Label>
          {label}
          {required && <span className="text-danger-500 ml-0.5 normal-case">*</span>}
        </Label>
      )}
      {children}
      {hint && !error && <p className="text-xs text-text-muted">{hint}</p>}
      {error && <p className="text-xs text-danger-600">{error}</p>}
    </div>
  )
}

export { Input, Textarea, Select, Label, Field }
export default Input
