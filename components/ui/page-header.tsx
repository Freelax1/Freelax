import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { pageTitle } from '@/lib/typography'
import { PageBackLink } from './page-back-link'

export interface PageHeaderBack {
  href: string
  label: string
}

interface PageHeaderProps {
  title: string
  subtitle?: string
  /** Extra line under the title (contact row, draft status, etc.) */
  meta?: ReactNode
  back?: PageHeaderBack
  action?: ReactNode
  className?: string
}

export default function PageHeader({
  title,
  subtitle,
  meta,
  back,
  action,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('mb-6', className)}>
      {back && (
        <PageBackLink href={back.href} className="mb-3">
          {back.label}
        </PageBackLink>
      )}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className={pageTitle}>{title}</h1>
          {meta ? <div className="mt-1">{meta}</div> : null}
          {subtitle ? <p className="text-sm text-text-secondary mt-1">{subtitle}</p> : null}
        </div>
        {action ? <div className="flex-shrink-0">{action}</div> : null}
      </div>
    </div>
  )
}
