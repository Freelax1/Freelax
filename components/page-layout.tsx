import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import DashboardPageFooter from '@/components/dashboard-page-footer'

type Props = {
  children: ReactNode
  className?: string
  syncedAt?: Date | null
}

/**
 * Standard dashboard page shell: content + bottom padding + shared footer.
 * Use on list pages, dashboard, tax, etc. so spacing and disclaimer never drift.
 */
export default function PageLayout({ children, className, syncedAt }: Props) {
  return (
    <div className={cn('pb-14', className)}>
      {children}
      <DashboardPageFooter syncedAt={syncedAt ?? null} />
    </div>
  )
}
