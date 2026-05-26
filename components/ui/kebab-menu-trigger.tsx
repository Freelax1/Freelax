'use client'

import { DotsThreeVertical } from '@phosphor-icons/react'
import { forwardRef } from 'react'
import type { MouseEvent } from 'react'
import { IconButton } from '@/components/ui/icon-button'

/** Kebab (⋯) trigger — use with `DropdownPanel` + `anchorRef` */
export const KebabMenuTrigger = forwardRef<
  HTMLButtonElement,
  {
    label?: string
    onClick: (e: MouseEvent<HTMLButtonElement>) => void
    className?: string
  }
>(function KebabMenuTrigger({ label = 'More', onClick, className }, ref) {
  return (
    <IconButton
      ref={ref}
      label={label}
      onClick={onClick}
      className={className}
      icon={<DotsThreeVertical weight="regular" className="w-4 h-4" />}
    />
  )
})
