'use client'

import Alert from '@/components/ui/alert'
import { Lock } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

export type ChaseTier = 'friendly' | 'formal' | 'legal'

export const CHASE_TIER_META: Record<
  ChaseTier,
  { label: string; badge: string; badgeColor: string; badgeBg: string }
> = {
  friendly: { label: 'Friendly Reminder', badge: '1st', badgeColor: 'var(--info-600)', badgeBg: 'var(--info-50)' },
  formal:   { label: 'Formal Notice',     badge: '2nd', badgeColor: 'var(--warning-600)', badgeBg: 'var(--warning-50)' },
  legal:    { label: 'Legal Notice',      badge: '3rd+', badgeColor: 'var(--danger-600)', badgeBg: 'var(--danger-50)' },
}

export type ChaseTierPickerProps = {
  tier: ChaseTier
  onTierChange: (tier: ChaseTier) => void
  chaseCount: number
  className?: string
}

/** Escalation tier selector for the invoice chase modal. */
export function ChaseTierPicker({ tier, onTierChange, chaseCount, className }: ChaseTierPickerProps) {
  const formalAllowed = chaseCount >= 1
  const legalAllowed  = chaseCount >= 2

  return (
    <div className={className}>
      <p className="text-xs font-medium text-text-muted mb-2">Chase level</p>
      <div className="flex gap-2">
        {(Object.keys(CHASE_TIER_META) as ChaseTier[]).map(t => {
          const meta = CHASE_TIER_META[t]
          const isActive = tier === t
          const locked =
            (t === 'formal' && !formalAllowed) ||
            (t === 'legal' && !legalAllowed)
          const lockReason = locked
            ? t === 'formal'
              ? 'Send a friendly chase first'
              : 'Needs 2 prior chases'
            : ''
          return (
            <button
              key={t}
              type="button"
              onClick={() => { if (!locked) onTierChange(t) }}
              disabled={locked}
              title={lockReason || undefined}
              className={cn(
                'py-2 px-1 rounded transition-all duration-150 flex-1',
                locked ? 'cursor-not-allowed opacity-45' : 'cursor-pointer',
              )}
              style={{
                border: `1.5px solid ${isActive ? meta.badgeColor : 'var(--border-default)'}`,
                background: isActive ? meta.badgeBg : 'var(--surface-card)',
              }}
            >
              <p
                className="mb-0.5 text-micro font-semibold"
                style={{ color: isActive ? meta.badgeColor : 'var(--text-muted)' }}
              >
                {meta.badge}
                {locked ? <Lock weight="regular" className="inline w-2.5 h-2.5 ml-0.5 align-middle" /> : ''}
              </p>
              <p
                className="text-caption font-semibold"
                style={{ color: isActive ? meta.badgeColor : 'var(--text-secondary)' }}
              >
                {meta.label}
              </p>
              {locked && (
                <p className="mt-0.5 text-micro text-text-secondary">{lockReason}</p>
              )}
            </button>
          )
        })}
      </div>
      {tier === 'legal' && (
        <Alert intent="danger" className="text-xs mt-2">
          This notice references the <strong>Late Payment of Commercial Debts Act 1998</strong> and warns of legal proceedings. Only use when you intend to escalate.
        </Alert>
      )}
    </div>
  )
}
