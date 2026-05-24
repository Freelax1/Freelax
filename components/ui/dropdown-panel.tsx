import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface DropdownPanelProps {
  children: ReactNode
  className?: string
}

/** Anchored menu panel for kebab / row action menus */
export default function DropdownPanel({ children, className }: DropdownPanelProps) {
  return (
    <div
      className={cn(
        'absolute right-0 top-[calc(100%+4px)] z-dropdown min-w-[160px] overflow-hidden',
        'bg-surface-card border border-border-default rounded-xl shadow-popover',
        className,
      )}
    >
      {children}
    </div>
  )
}
