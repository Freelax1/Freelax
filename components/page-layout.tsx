import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import DashboardPageFooter from '@/components/dashboard-page-footer'

export type PageLayoutWidth = 'full' | 'narrow' | 'document'

const WIDTH_CLASS: Record<PageLayoutWidth, string> = {
  full: '',
  narrow: 'max-w-2xl mx-auto w-full',
  document: 'max-w-3xl mx-auto w-full',
}

type Props = {
  children: ReactNode
  className?: string
  syncedAt?: Date | null
  /** Constrains content width on form/document pages */
  width?: PageLayoutWidth
}

/**
 * Standard dashboard page shell: content + bottom padding + shared footer.
 * Use on list pages, dashboard, tax, forms, and detail views.
 */
export default function PageLayout({
  children,
  className,
  syncedAt,
  width = 'full',
}: Props) {
  return (
    <div className={cn('pb-14', WIDTH_CLASS[width], className)}>
      {children}
      <DashboardPageFooter syncedAt={syncedAt ?? null} />
    </div>
  )
}
