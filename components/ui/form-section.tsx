import type { ReactNode } from 'react'
import { sectionTitle } from '@/lib/typography'
import { cn } from '@/lib/utils'

export type FormSectionDensity = 'comfortable' | 'compact' | 'none'

const DENSITY_CLASS: Record<FormSectionDensity, string> = {
  comfortable: 'space-y-4',
  compact: 'space-y-3',
  none: '',
}

export interface FormSectionProps {
  /** Omit for single-field blocks (e.g. notes only). */
  title?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
  density?: FormSectionDensity
}

/** White form card + section title — use on new/edit pages instead of hand-rolled shells. */
export function FormSection({
  title,
  children,
  className,
  bodyClassName,
  density = 'comfortable',
}: FormSectionProps) {
  const stackClass = DENSITY_CLASS[density]

  return (
    <div className={cn('bg-surface-card rounded-xl border border-border-default p-6', className)}>
      {title ? (
        <h2 className={cn('text-sm', sectionTitle, stackClass && 'mb-4')}>{title}</h2>
      ) : null}
      <div className={cn(stackClass, bodyClassName)}>{children}</div>
    </div>
  )
}
