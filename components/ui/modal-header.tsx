'use client'

import { IconButton } from '@/components/ui/icon-button'
import { sectionTitle } from '@/lib/typography'
import { cn } from '@/lib/utils'
import { X } from '@phosphor-icons/react'
import type { ReactNode } from 'react'

export type ModalHeaderProps = {
  title: string
  subtitle?: ReactNode
  onClose?: () => void
  closeLabel?: string
}

/** Standard modal title row — title, optional meta line, close control. */
export function ModalHeader({ title, subtitle, onClose, closeLabel = 'Close' }: ModalHeaderProps) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle flex-shrink-0">
      <div>
        <h2 className={cn('text-sm', sectionTitle)}>{title}</h2>
        {subtitle != null && (
          <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>
        )}
      </div>
      {onClose && (
        <IconButton
          label={closeLabel}
          onClick={onClose}
          className="rounded-full"
          icon={<X weight="regular" className="w-4 h-4 text-text-muted" />}
        />
      )}
    </div>
  )
}
