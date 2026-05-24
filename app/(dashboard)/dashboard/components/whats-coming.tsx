'use client'
import Link from 'next/link'
import { formatCurrency } from '@/lib/tax-calculations'
import { cn } from '@/lib/utils'
import { cardLabel } from '@/lib/typography'

interface TimelineItem {
  id:      string
  label:   string
  amount:  number
  dueDate: string
  href:    string
  type:    'invoice' | 'tax' | 'overdue'
}

interface Props { items: TimelineItem[] }

function daysUntil(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
}

function relativeLabel(days: number) {
  if (days < -1) return `${Math.abs(days)}d overdue`
  if (days === -1) return 'yesterday'
  if (days === 0)  return 'today'
  if (days === 1)  return 'tomorrow'
  if (days <= 6)   return `${days}d`
  return new Date(Date.now() + days * 86400000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function absoluteLabel(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long' })
}

export default function WhatsComing({ items }: Props) {
  if (!items.length) {
    return (
      <div className="bg-surface-card rounded-xl border border-border-default p-6 h-full">
        <p className={cn(cardLabel, 'mb-5')}>What's coming</p>
        <p className="text-sm text-text-secondary">Nothing due in the next 30 days. Enjoy the quiet.</p>
      </div>
    )
  }

  return (
    <div className="bg-surface-card rounded-xl border border-border-default p-6 h-full">
      <p className={cn(cardLabel, 'mb-4')}>What's coming — next 30 days</p>

      <div className="flex flex-col divide-y divide-border-subtle">
        {items.map((item) => {
          const days     = daysUntil(item.dueDate)
          const isLate   = days < 0
          const isUrgent = days >= 0 && days <= 3
          const isTax    = item.type === 'tax'
          const dotColor = isLate ? 'var(--danger-500)' : isUrgent ? 'var(--warning-500)' : isTax ? 'var(--warning-500)' : 'var(--success-500)'

          return (
            <Link key={item.id} href={item.href}
              title={absoluteLabel(item.dueDate)}
              className="flex items-center gap-3 py-2.5 no-underline group hover:bg-surface-sunken -mx-6 px-6 first:-mt-0 transition-colors">
              {/* Status dot */}
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: dotColor }} />

              {/* Label */}
              <p className="flex-1 text-sm text-text-primary truncate">
                {item.label}
              </p>

              {/* Date */}
              <p className={cn('text-caption shrink-0', isLate ? 'text-danger-500 font-medium' : isUrgent ? 'text-warning-700 font-medium' : 'text-text-secondary')}>
                {relativeLabel(days)}
              </p>

              {/* Amount */}
              <p className={cn('text-sm font-semibold tabular-nums shrink-0 w-20 text-right', isLate ? 'text-danger-500' : 'text-text-primary')}>
                {formatCurrency(item.amount)}
              </p>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
