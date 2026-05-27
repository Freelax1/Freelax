import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Freelax wordmark on the light auth form panel */
export function AuthWordmark({
  variant,
  className,
}: {
  variant: 'mobile' | 'desktop'
  className?: string
}) {
  return (
    <div
      className={cn(
        'font-serif font-normal tracking-tighter leading-none',
        variant === 'mobile' && 'auth-wordmark-mobile text-xl mb-8',
        variant === 'desktop' && 'auth-wordmark-desktop text-3xl mb-10',
        className,
      )}
      aria-hidden={variant === 'desktop'}
    >
      <span className="text-text-primary">Free</span>
      <span className="text-text-secondary">lax</span>
      <span className="text-brand-primary">.</span>
    </div>
  )
}

export function AuthHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <>
      <h2 className="text-2xl font-serif font-normal text-text-primary tracking-normal leading-heading mb-1.5">
        {title}
      </h2>
      {subtitle && (
        <p className="text-sm text-text-secondary mb-7 mt-0">{subtitle}</p>
      )}
    </>
  )
}

export function AuthError({ children }: { children: ReactNode }) {
  if (!children) return null
  return (
    <div className="text-sm rounded-lg px-3.5 py-2.5 mb-4 border border-danger-200 bg-danger-50 text-danger-700">
      {children}
    </div>
  )
}

export function AuthFooter({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm text-center mt-5 mb-0 pt-4 text-text-muted border-t border-border-subtle">
      {children}
    </p>
  )
}

/** Serif title for auth success / error states */
export function AuthStateHeading({ title, className }: { title: string; className?: string }) {
  return (
    <h2
      className={cn(
        'text-2xl font-serif font-normal text-text-primary tracking-normal leading-heading mb-2',
        className,
      )}
    >
      {title}
    </h2>
  )
}

/** Icon circle for auth confirmation states */
export function AuthStateIcon({
  children,
  tone = 'success',
}: {
  children: ReactNode
  tone?: 'success' | 'danger'
}) {
  return (
    <div
      className={cn(
        'w-12 h-12 rounded-full inline-flex items-center justify-center mb-4',
        tone === 'success' && 'bg-success-50 border border-success-200',
        tone === 'danger' && 'bg-danger-50 border border-danger-200',
      )}
    >
      {children}
    </div>
  )
}
