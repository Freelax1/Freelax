'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeft } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

export interface PageBackLinkProps {
  href: string
  children: ReactNode
  className?: string
}

/** Standard “← Back to …” link above page titles — use via `PageHeader` `back` prop when possible. */
export function PageBackLink({ href, children, className }: PageBackLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center gap-1 text-sm text-text-muted hover:text-text-secondary no-underline',
        className,
      )}
    >
      <ArrowLeft weight="regular" className="w-4 h-4 shrink-0" />
      {children}
    </Link>
  )
}
