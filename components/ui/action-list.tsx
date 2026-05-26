'use client'

import Link from 'next/link'
import { IconButton } from '@/components/ui/icon-button'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Icon } from '@phosphor-icons/react'
import {
  WarningCircle,
  Clock,
  Scales,
  FileText,
  PiggyBank,
  CalendarCheck,
  Gear,
  CheckCircle,
  Sparkle,
  Coins,
  X,
} from '@phosphor-icons/react'
import { cardLabel } from '@/lib/typography'
import { cn } from '@/lib/utils'
import { buttonVariants } from './button'

export type ActionPriority = 'red' | 'amber' | 'green' | 'info'

export interface ActionListItem {
  /** Stable id for dismiss persistence; auto-generated from kind/href/title if omitted */
  id?: string
  priority: ActionPriority
  title: string
  sub?: string
  href: string
  cta?: string
  /** Maps to icon + default CTA (dashboard `type` is also read) */
  kind?: string
  type?: string
}

export interface ActionListProps {
  title?: string
  items: ActionListItem[]
  className?: string
  /** Hide the whole block when there are no items (default true) */
  hideWhenEmpty?: boolean
  /** Allow dismissing rows for this session (default true) */
  dismissible?: boolean
  /** sessionStorage key for dismissed ids */
  dismissStorageKey?: string
}

const DISMISS_STORAGE_DEFAULT = 'freelax_dismissed_actions'

export function actionItemId(item: ActionListItem): string {
  if (item.id) return item.id
  const kind = item.kind ?? item.type ?? 'action'
  return `${kind}:${item.href}:${item.title}`
}

function readDismissed(key: string): Set<string> {
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as unknown
    return new Set(Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [])
  } catch {
    return new Set()
  }
}

const ICON_TONE: Record<ActionPriority, { bg: string; fg: string }> = {
  red:   { bg: 'bg-danger-50',  fg: 'text-danger-600' },
  amber: { bg: 'bg-warning-50', fg: 'text-warning-600' },
  green: { bg: 'bg-success-50', fg: 'text-success-600' },
  info:  { bg: 'bg-forest-50',  fg: 'text-brand-primary' },
}

const ICON_BY_KIND: Record<string, Icon> = {
  overdue:    WarningCircle,
  due_soon:   Clock,
  ir35:       Scales,
  quote:      FileText,
  tax_pot:    PiggyBank,
  filing:     CalendarCheck,
  profile:    Gear,
  pension:    Coins,
  on_track:   CheckCircle,
  insight:    Sparkle,
}

const CTA_BY_KIND: Record<string, string> = {
  overdue:    'Chase payment',
  due_soon:   'View invoice',
  ir35:       'Review IR35',
  quote:      'View quote',
  tax_pot:    'Add to pot',
  filing:     'View deadline',
  profile:    'Update profile',
  pension:    'Review options',
  on_track:   'View tax pot',
  insight:    'Open',
}

const PRIORITY_ICON: Record<ActionPriority, Icon> = {
  red:   WarningCircle,
  amber: Clock,
  green: CheckCircle,
  info:  Gear,
}

function resolveKind(item: ActionListItem): string | undefined {
  return item.kind ?? item.type
}

function resolveIcon(item: ActionListItem): Icon {
  const kind = resolveKind(item)
  if (kind && ICON_BY_KIND[kind]) return ICON_BY_KIND[kind]
  return PRIORITY_ICON[item.priority]
}

function resolveCta(item: ActionListItem): string {
  if (item.cta) return item.cta
  const kind = resolveKind(item)
  if (kind && CTA_BY_KIND[kind]) return CTA_BY_KIND[kind]
  if (item.href.includes('/invoices/')) return 'View invoice'
  if (item.href.includes('/projects/')) return 'Review'
  if (item.href.includes('/quotes/')) return 'View quote'
  if (item.href.includes('settings')) return 'Update'
  if (item.href.includes('#tax-pot')) return 'Add to pot'
  if (item.href.includes('/tax')) return 'Go to tax'
  return 'View'
}

/** Stacked action cards — each row is icon | copy | outline CTA (horizontal). */
export default function ActionList({
  title = 'Needs attention',
  items,
  className,
  hideWhenEmpty = true,
  dismissible = true,
  dismissStorageKey = DISMISS_STORAGE_DEFAULT,
}: ActionListProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(() =>
    typeof window !== 'undefined' ? readDismissed(dismissStorageKey) : new Set(),
  )

  useEffect(() => {
    setDismissed(readDismissed(dismissStorageKey))
  }, [dismissStorageKey])

  const dismiss = useCallback(
    (id: string) => {
      setDismissed(prev => {
        const next = new Set(prev)
        next.add(id)
        try {
          sessionStorage.setItem(dismissStorageKey, JSON.stringify([...next]))
        } catch {}
        return next
      })
    },
    [dismissStorageKey],
  )

  const visibleItems = useMemo(
    () => (dismissible ? items.filter(item => !dismissed.has(actionItemId(item))) : items),
    [items, dismissed, dismissible],
  )

  if (hideWhenEmpty && visibleItems.length === 0) return null

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {title ? <p className={cardLabel}>{title}</p> : null}

      <div className="flex flex-col gap-3">
        {visibleItems.map(item => {
          const id = actionItemId(item)
          const IconComp = resolveIcon(item)
          const tone = ICON_TONE[item.priority]

          return (
            <div
              key={id}
              className={cn(
                'flex items-center gap-2 w-full',
                'bg-surface-card rounded-xl border border-border-default shadow-card',
                'px-5 py-4 min-h-[72px]',
              )}
            >
              <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', tone.bg)}>
                <IconComp weight="regular" className={cn('w-[18px] h-[18px]', tone.fg)} />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-primary leading-snug">{item.title}</p>
                {item.sub ? (
                  <p className="text-xs text-text-secondary mt-0.5 leading-relaxed line-clamp-2">{item.sub}</p>
                ) : null}
              </div>

              <Link
                href={item.href}
                className={cn(
                  buttonVariants({ intent: 'secondary', size: 'sm' }),
                  'shrink-0 no-underline whitespace-nowrap',
                )}
              >
                {resolveCta(item)}
              </Link>

              {dismissible ? (
                <IconButton
                  label="Dismiss"
                  onClick={() => dismiss(id)}
                  className="shrink-0 text-text-muted hover:text-text-secondary"
                  icon={<X weight="regular" className="w-4 h-4" />}
                />
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
