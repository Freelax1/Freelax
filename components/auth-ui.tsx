import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Freelax wordmark for auth screens — mobile shown < md, desktop shown ≥ md */
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
      <span className="text-white">Free</span>
      <span className="text-white/75">lax</span>
      <span className="text-brand-primary">.</span>
    </div>
  )
}

export function AuthHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <>
      <h2 className="text-2xl font-serif font-normal text-white tracking-normal leading-heading mb-1.5">
        {title}
      </h2>
      {subtitle && (
        <p className="text-sm text-white/60 mb-7 mt-0">{subtitle}</p>
      )}
    </>
  )
}

export function AuthError({ children }: { children: ReactNode }) {
  if (!children) return null
  return (
    <div className="text-sm rounded-lg px-3.5 py-2.5 mb-4 border text-[color:var(--danger-300)] bg-[color:var(--danger-950)] border-[color:var(--danger-800)]">
      {children}
    </div>
  )
}

export function AuthFooter({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm text-center mt-5 mb-0 pt-4 text-white/50 border-t border-white/10">
      {children}
    </p>
  )
}

/** Serif title for auth success / error states (no form chrome) */
export function AuthStateHeading({ title, className }: { title: string; className?: string }) {
  return (
    <h2
      className={cn(
        'text-2xl font-serif font-normal text-white tracking-normal leading-heading mb-2',
        className,
      )}
    >
      {title}
    </h2>
  )
}
