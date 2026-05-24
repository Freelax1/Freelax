'use client'

import type { ReactNode } from 'react'
import { tonePalette } from '@/lib/status-palette'
import Button from '@/components/ui/button'

interface StatusConfirmModalProps {
  title: ReactNode
  description: ReactNode
  confirmLabel: string
  loadingLabel?: string
  /** Status key for confirm-button colour (tonePalette) */
  statusKey: string
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
  footerNote?: ReactNode
}

export default function StatusConfirmModal({
  title,
  description,
  confirmLabel,
  loadingLabel = 'Updating...',
  statusKey,
  onConfirm,
  onCancel,
  loading,
  footerNote,
}: StatusConfirmModalProps) {
  const tone = tonePalette(statusKey)

  return (
    <div
      className="fixed inset-0 z-modal flex items-center justify-center px-4 bg-black/45"
      onClick={onCancel}
    >
      <div
        className="bg-surface-card rounded-xl shadow-xl w-full max-w-sm p-6"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="font-semibold text-text-primary mb-1">{title}</h2>
        <p className="text-sm text-text-secondary mb-5">
          {description}
          {footerNote}
        </p>
        <div className="flex gap-3">
          <Button type="button" intent="secondary" fullWidth onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            fullWidth
            disabled={loading}
            onClick={onConfirm}
            className="text-white hover:opacity-90 disabled:!bg-surface-sunken disabled:!text-text-disabled disabled:border disabled:border-border-default disabled:opacity-100 disabled:hover:opacity-100"
            style={{ background: loading ? undefined : tone.text }}
          >
            {loading ? loadingLabel : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
