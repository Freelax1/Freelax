import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { ButtonLink } from './button'

export interface FormFooterProps {
  children: ReactNode
  className?: string
}

/** Right-aligned cancel + submit row on form pages. */
export function FormFooter({ children, className }: FormFooterProps) {
  return (
    <div className={cn('flex flex-wrap items-center justify-end gap-3', className)}>
      {children}
    </div>
  )
}

export function FormCancelLink({
  href,
  children = 'Cancel',
}: {
  href: string
  children?: string
}) {
  return (
    <ButtonLink href={href} intent="secondary" size="md">
      {children}
    </ButtonLink>
  )
}
