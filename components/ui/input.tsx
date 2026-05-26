'use client'

import { CaretDown } from '@phosphor-icons/react'
import { cva, type VariantProps } from 'class-variance-authority'
import { floatingFieldLabel, floatingFieldValue } from '@/lib/typography'
import { cn } from '@/lib/utils'
import React, { cloneElement, isValidElement, useState } from 'react'

/** Outer field chrome — white on card surfaces; border strengthens on focus. */
export const fieldShellVariants = cva(
  'rounded-lg border transition-[border-color,background-color] duration-fast focus-within:outline-none focus-within:rounded-lg hover:border-border-hover disabled:opacity-100',
  {
    variants: {
      variant: {
        default: 'border-border-default bg-surface-card focus-within:border-border-strong',
        error:   'border-danger-500 bg-surface-card focus-within:border-danger-600',
        inline:  'border-border-default bg-surface-card focus-within:border-border-strong',
        auth:    'bg-white/[0.08] border-white/15 hover:border-white/25 focus-within:border-white/40',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

/** Inner control — borderless, sits inside the shell (no default font-size — set per context). */
export const inputControlVariants = cva(
  'w-full bg-transparent border-0 shadow-none font-sans focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:text-text-muted placeholder:text-text-muted',
  {
    variants: {
      variant: {
        default: 'text-text-primary',
        error:   'text-text-primary',
        inline:  'text-text-primary',
        auth:    'text-white placeholder:text-white/30',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

/** Standalone input (no floating label) — full chrome on the control itself (not borderless inner). */
export const inputVariants = cva(
  cn(
    'w-full rounded-lg border font-sans shadow-none',
    'transition-[border-color,background-color] duration-fast',
    'text-sm px-3 py-2.5',
    'focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:rounded-lg',
    'disabled:opacity-100 disabled:cursor-not-allowed disabled:text-text-muted disabled:bg-surface-sunken disabled:hover:border-border-default',
  ),
  {
    variants: {
      variant: {
        default:
          'border-border-default bg-surface-card text-text-primary placeholder:text-text-muted hover:border-border-hover focus-visible:border-border-strong',
        error:
          'border-danger-500 bg-surface-card text-text-primary placeholder:text-text-muted hover:border-border-hover focus-visible:border-danger-600',
        inline:
          'border-border-default bg-surface-card text-text-primary placeholder:text-text-muted hover:border-border-hover focus-visible:border-border-strong px-2 py-1.5',
        auth:
          'bg-white/[0.08] border-white/15 text-white placeholder:text-white/30 hover:border-white/25 focus-visible:border-white/40 text-base px-3.5 py-3 leading-body disabled:opacity-50',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export const inputClass = inputVariants({ variant: 'default' })

const CONTROL_TAGS = new Set(['Input', 'Textarea', 'Select'])

function hasFieldValue(value: unknown): boolean {
  if (value == null) return false
  if (typeof value === 'number') return !Number.isNaN(value)
  return String(value).length > 0
}

function isFormControl(child: React.ReactElement): boolean {
  const type = child.type as { displayName?: string }
  return CONTROL_TAGS.has(type.displayName ?? '')
}

// ── Input ─────────────────────────────────────────────────────────────────

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {
  error?: boolean
  /** Borderless inner control — used by floating Field shell */
  bare?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ variant = 'default', error, bare, className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        bare
          ? inputControlVariants({ variant: error ? 'error' : variant })
          : inputVariants({ variant: error ? 'error' : variant }),
        className,
      )}
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
  bare?: boolean
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ variant = 'default', error, bare, className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        bare
          ? inputControlVariants({ variant: error ? 'error' : variant })
          : inputVariants({ variant: error ? 'error' : variant }),
        'resize-none',
        className,
      )}
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
  bare?: boolean
  options?: { value: string; label: string }[]
}

const selectNativeClasses =
  'appearance-none cursor-pointer truncate bg-transparent [color-scheme:light]'

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ variant = 'default', error, bare, options, className, children, ...props }, ref) => {
    const shellVariant = error ? 'error' : variant
    const isAuth = shellVariant === 'auth'
    const isInline = shellVariant === 'inline'

    return (
      <div className={cn('relative w-full min-w-0', bare && 'h-full')}>
        <select
          ref={ref}
          className={cn(
            bare
              ? inputControlVariants({ variant: shellVariant })
              : inputVariants({ variant: shellVariant }),
            selectNativeClasses,
            bare ? 'pr-8' : isInline ? 'pr-7' : 'pr-9',
            className,
          )}
          {...props}
        >
          {options ? options.map(o => <option key={o.value} value={o.value}>{o.label}</option>) : children}
        </select>
        <CaretDown
          weight="regular"
          aria-hidden
          className={cn(
            'pointer-events-none absolute top-1/2 -translate-y-1/2 shrink-0',
            bare ? 'right-2.5 w-3.5 h-3.5' : isInline ? 'right-2 w-3.5 h-3.5' : 'right-3 w-4 h-4',
            isAuth ? 'text-white/45' : 'text-text-muted',
          )}
        />
      </div>
    )
  },
)
Select.displayName = 'Select'

// ── Label (stacked layout) ────────────────────────────────────────────────

export const labelVariants = cva('inline-flex items-center flex-wrap gap-1', {
  variants: {
    variant: {
      default: 'text-caption font-semibold text-text-secondary mb-1.5',
      auth:    'text-xs font-medium text-white/60 mb-1.5',
    },
  },
  defaultVariants: { variant: 'default' },
})

export interface LabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement>,
    VariantProps<typeof labelVariants> {}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ variant, className, ...props }, ref) => (
    <label ref={ref} className={cn(labelVariants({ variant }), className)} {...props} />
  )
)
Label.displayName = 'Label'

// ── Floating field shell ──────────────────────────────────────────────────

interface FloatingFieldShellProps {
  label: React.ReactNode
  required?: boolean
  error?: string
  hint?: string
  labelVariant?: VariantProps<typeof labelVariants>['variant']
  className?: string
  children: React.ReactElement
}

function usesFloatingLayout(
  child: React.ReactElement,
  layout: FieldProps['layout'],
): boolean {
  if (layout !== 'floating') return false
  const displayName = (child.type as { displayName?: string }).displayName
  // Textbook: floating label for single-line Input only; Select & Textarea stack label above.
  return displayName === 'Input'
}

function FloatingFieldShell({
  label,
  required,
  error,
  hint,
  labelVariant = 'default',
  className,
  children,
}: FloatingFieldShellProps) {
  const [focused, setFocused] = useState(false)
  const childVariant = (children.props.variant as VariantProps<typeof inputVariants>['variant']) ?? 'default'
  const shellVariant = error ? 'error' : childVariant
  const isAuth = labelVariant === 'auth' || childVariant === 'auth'
  const value = children.props.value ?? children.props.defaultValue
  const floated = focused || hasFieldValue(value)

  const control = cloneElement(children, {
    bare: true,
    error: undefined,
    className: cn(
      inputControlVariants({ variant: error ? 'error' : childVariant }),
      floated
        ? cn(floatingFieldValue, isAuth && 'text-white text-sm')
        : cn('text-sm font-normal', isAuth && 'text-sm text-white'),
      floated ? 'pt-4 pb-1.5 px-3' : 'py-2.5 px-3',
      children.props.type === 'date' && 'appearance-none',
      children.props.className,
    ),
    placeholder: floated ? children.props.placeholder : undefined,
    onFocus: (e: React.FocusEvent) => {
      setFocused(true)
      children.props.onFocus?.(e)
    },
    onBlur: (e: React.FocusEvent) => {
      setFocused(false)
      children.props.onBlur?.(e)
    },
  })

  return (
    <div className={cn('space-y-1', className)}>
      <div
        className={cn(
          fieldShellVariants({ variant: shellVariant }),
          'relative',
        )}
      >
        <label
          className={cn(
            'absolute left-3 right-3 pointer-events-none truncate origin-left',
            'transition-[top,transform,font-size,color] duration-fast',
            floated
              ? cn('top-1', floatingFieldLabel, isAuth && 'text-white/55')
              : cn(
                  'top-1/2 -translate-y-1/2 text-sm font-normal leading-none',
                  isAuth ? 'text-white/45' : 'text-text-muted',
                ),
          )}
        >
          {label}
          {required && <span className={cn('ml-0.5', isAuth ? 'text-white/50' : 'text-danger-500')}>*</span>}
        </label>
        {control}
      </div>
      {hint && !error && <p className="text-xs text-text-muted">{hint}</p>}
      {error && <p className="text-xs text-danger-600">{error}</p>}
    </div>
  )
}

// ── Field wrapper ─────────────────────────────────────────────────────────

interface FieldProps {
  label?: React.ReactNode
  required?: boolean
  error?: string
  hint?: string
  children: React.ReactNode
  className?: string
  labelVariant?: VariantProps<typeof labelVariants>['variant']
  /** `floating` — Input only: inline label that rises when focused or filled. Select & Textarea always stack label above. */
  layout?: 'floating' | 'stacked'
}

function Field({
  label,
  required,
  error,
  hint,
  children,
  className,
  labelVariant,
  layout = 'floating',
}: FieldProps) {
  const child = isValidElement(children) ? children : null
  const useFloating =
    label != null &&
    child != null &&
    isFormControl(child) &&
    child.props.variant !== 'inline' &&
    usesFloatingLayout(child, layout)

  if (useFloating) {
    return (
      <FloatingFieldShell
        label={label}
        required={required}
        error={error}
        hint={hint}
        labelVariant={labelVariant}
        className={className}
      >
        {child}
      </FloatingFieldShell>
    )
  }

  const stackedControl =
    child && isFormControl(child) && error
      ? cloneElement(child, { error: true })
      : children

  return (
    <div className={cn('space-y-1', className)}>
      {label && (
        <Label variant={labelVariant}>
          {label}
          {required && <span className="text-danger-500 ml-0.5 normal-case">*</span>}
        </Label>
      )}
      {stackedControl}
      {hint && !error && <p className="text-xs text-text-muted">{hint}</p>}
      {error && <p className="text-xs text-danger-600">{error}</p>}
    </div>
  )
}

export { Input, Textarea, Select, Label, Field }
export default Input
