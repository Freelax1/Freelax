'use client'

import Tooltip from '@/components/tooltip'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { CheckSquare, Square } from '@phosphor-icons/react'
import { forwardRef } from 'react'
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, MouseEvent, ReactElement } from 'react'

const baseClass =
  'border-0 bg-transparent cursor-pointer inline-flex items-center justify-center transition-colors ' +
  'text-text-secondary hover:text-text-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent'

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string
  align?: 'center' | 'left' | 'right'
  icon: ReactElement
  variant?: 'default' | 'danger' | 'nudge' | 'hint'
}

/** Icon-only button with dark hover tooltip and accessible name */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, align, icon, variant = 'default', className, type = 'button', ...props },
  ref,
) {
  return (
    <Tooltip label={label} align={align}>
      <button
        ref={ref}
        type={type}
        className={cn(
          baseClass,
          variant === 'nudge' && 'p-1 ml-1 text-brand-primary rounded-full hover:bg-forest-50 fd-chevron-nudge',
          variant === 'hint' && 'w-7 h-7 p-0 rounded-full bg-black/[0.06] hover:bg-black/10',
          variant !== 'nudge' && variant !== 'hint' && 'p-1.5 rounded-lg',
          variant === 'danger'
            ? 'hover:bg-danger-50 hover:text-danger-600'
            : variant === 'default' && 'hover:bg-surface-sunken',
          className,
        )}
        {...props}
      >
        {icon}
      </button>
    </Tooltip>
  )
})

type IconLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  href: string
  label: string
  align?: 'center' | 'left' | 'right'
  icon: ReactElement
}

/** Icon-only link with tooltip */
export function IconLink({ label, align, icon, className, ...props }: IconLinkProps) {
  return (
    <Tooltip label={label} align={align}>
      <Link className={cn(baseClass, 'p-1.5 rounded-lg hover:bg-surface-sunken no-underline', className)} {...props}>
        {icon}
      </Link>
    </Tooltip>
  )
}

/** Row bulk-select checkbox control */
export function SelectIconButton({
  selected,
  onClick,
  className,
}: {
  selected: boolean
  onClick: (e: MouseEvent<HTMLButtonElement>) => void
  className?: string
}) {
  return (
    <IconButton
      label={selected ? 'Deselect' : 'Select'}
      onClick={onClick}
      className={cn('p-0', className)}
      icon={
        selected ? (
          <CheckSquare weight="regular" className="w-4 h-4 text-text-primary" />
        ) : (
          <Square weight="regular" className="w-4 h-4 text-text-secondary" />
        )
      }
    />
  )
}

/** Header select-all control */
export function SelectAllIconButton({
  allSelected,
  onClick,
  className,
}: {
  allSelected: boolean
  onClick: (e: MouseEvent<HTMLButtonElement>) => void
  className?: string
}) {
  return (
    <IconButton
      label={allSelected ? 'Deselect all' : 'Select all'}
      onClick={onClick}
      className={cn('p-0', className)}
      icon={
        allSelected ? (
          <CheckSquare weight="regular" className="w-4 h-4 text-text-primary" />
        ) : (
          <Square weight="regular" className="w-4 h-4 text-text-secondary" />
        )
      }
    />
  )
}
