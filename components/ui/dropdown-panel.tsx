import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react'
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
        'absolute right-0 top-[calc(100%+4px)] z-dropdown min-w-[160px] overflow-hidden py-1',
        'bg-surface-card border border-border-default rounded-xl shadow-popover',
        className,
      )}
    >
      {children}
    </div>
  )
}

/** Standard row inside DropdownPanel — icon + label */
export function DropdownMenuItem({
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { className?: string }) {
  return (
    <button
      type="button"
      className={cn(
        'flex w-full items-center gap-2 px-3.5 py-2 text-sm text-text-primary',
        'hover:bg-surface-sunken transition-colors duration-fast',
        'border-0 bg-transparent cursor-pointer text-left font-[inherit]',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

/** Link row inside DropdownPanel */
export function DropdownMenuLink({
  className,
  children,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { className?: string }) {
  return (
    <a
      className={cn(
        'flex w-full items-center gap-2 px-3.5 py-2 text-sm text-text-primary no-underline',
        'hover:bg-surface-sunken transition-colors duration-fast',
        className,
      )}
      {...props}
    >
      {children}
    </a>
  )
}
