'use client'
import Link from 'next/link'
import { formatCurrency } from '@/lib/tax-calculations'

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
  const CARD: React.CSSProperties = {
    background: '#fff', borderRadius: 14,
    border: '1px solid rgba(0,0,0,0.06)', padding: '24px 28px',
  }
  const LABEL: React.CSSProperties = {
    fontSize: 11, fontWeight: 500, color: '#475569',
    textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 20,
  }

  if (!items.length) {
    return (
      <div style={CARD}>
        <p style={LABEL}>What's coming</p>
        <p style={{ fontSize: 14, color: '#64748B' }}>Nothing due in the next 30 days. Enjoy the quiet.</p>
      </div>
    )
  }

  return (
    <div style={CARD}>
      <p style={LABEL}>What's coming — next 30 days</p>

      {/* Desktop: horizontal timeline */}
      <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
        <div style={{ display: 'flex', gap: 0, minWidth: items.length * 160, position: 'relative' }}>
          {/* Connecting line */}
          <div style={{
            position: 'absolute', top: 20, left: 20, right: 20, height: 1,
            background: 'rgba(0,0,0,0.06)', zIndex: 0,
          }} />

          {items.map((item) => {
            const days     = daysUntil(item.dueDate)
            const isLate   = days < 0
            const isUrgent = days >= 0 && days <= 3
            const isTax    = item.type === 'tax'
            const dotColor = isLate ? '#C0392B' : isUrgent ? '#9A7B0A' : isTax ? '#9A7B0A' : '#1D6B35'
            const amtColor = isLate ? '#C0392B' : '#0F172A'

            return (
              <Link key={item.id} href={item.href}
                title={absoluteLabel(item.dueDate)}
                style={{ flex: '0 0 160px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', paddingRight: 12, textDecoration: 'none', position: 'relative', zIndex: 1 }}>
                {/* Dot on timeline */}
                <div style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: dotColor, marginBottom: 10,
                  boxShadow: `0 0 0 3px #fff, 0 0 0 4px ${dotColor}20`,
                  flexShrink: 0,
                }} />
                <p style={{ fontSize: 12, fontWeight: 600, color: amtColor, fontVariantNumeric: 'tabular-nums' }}>
                  {formatCurrency(item.amount)}
                </p>
                <p style={{ fontSize: 11, color: '#64748B', marginTop: 2, lineHeight: 1.4,
                  overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {item.label}
                </p>
                <p style={{ fontSize: 10, color: isLate ? '#C0392B' : isUrgent ? '#9A7B0A' : '#94A3B8', marginTop: 3, fontWeight: isLate || isUrgent ? 500 : 400 }}>
                  {relativeLabel(days)}
                </p>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
