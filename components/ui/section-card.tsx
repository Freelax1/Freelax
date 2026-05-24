import React from 'react'
import { sectionTitle } from '@/lib/typography'
import { cn } from '@/lib/utils'

export interface SectionCardProps {
  title: React.ReactNode
  accent?: string
  children: React.ReactNode
  className?: string
  bodyClassName?: string
}

/** Bordered card with sunken header row — tax breakdowns, settings sections, etc. */
export default function SectionCard({
  title,
  accent,
  children,
  className,
  bodyClassName,
}: SectionCardProps) {
  return (
    <div className={cn('bg-surface-card rounded-xl border border-border-default overflow-hidden', className)}>
      <div className={cn('px-5 py-3 border-b border-border-subtle', accent ?? 'bg-surface-sunken')}>
        <h2 className={sectionTitle}>{title}</h2>
      </div>
      <div className={cn('px-5 py-1', bodyClassName)}>{children}</div>
    </div>
  )
}
