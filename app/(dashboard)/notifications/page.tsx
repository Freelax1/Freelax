'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Bell, CheckCircle } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import { buildNotifications, TYPE_LABEL, READ_KEY } from '@/lib/notifications'
import type { Notification } from '@/lib/notifications'
import PageHeader from '@/components/page-header'

const BADGE_STYLE: Record<Notification['priority'], { bg: string; color: string }> = {
  red:   { bg: 'var(--danger-50)',  color: 'var(--danger-600)'  },
  amber: { bg: 'var(--warning-50)', color: 'var(--warning-700)' },
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [readIds,       setReadIds]       = useState<Set<string>>(new Set())
  const [fetching,      setFetching]      = useState(true)
  const [unreadOnly,    setUnreadOnly]    = useState(false)

  useEffect(() => {
    try {
      setReadIds(new Set(JSON.parse(localStorage.getItem(READ_KEY) ?? '[]')))
    } catch {}
  }, [])

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [{ data: invoices }, { data: quotes }, { data: projects }] = await Promise.all([
        supabase.from('invoices').select('id, invoice_number, status, total, due_date, clients(name)').order('due_date'),
        supabase.from('quotes').select('id, quote_number, status, total, expiry_date, clients(name)').order('expiry_date'),
        supabase.from('projects').select('id, title, ir35_status, status, clients(name)'),
      ])
      const built = buildNotifications(invoices ?? [], quotes ?? [], projects ?? [])
      setNotifications(built)
      setFetching(false)

      setTimeout(() => {
        try {
          const prev = new Set<string>(JSON.parse(localStorage.getItem(READ_KEY) ?? '[]'))
          built.forEach(n => prev.add(n.id))
          localStorage.setItem(READ_KEY, JSON.stringify(Array.from(prev)))
          setReadIds(new Set(prev))
        } catch {}
      }, 1500)
    }
    load()
  }, [])

  const newCount = notifications.filter(n => !readIds.has(n.id)).length
  const displayed = unreadOnly ? notifications.filter(n => !readIds.has(n.id)) : notifications

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <PageHeader title="Notifications" />

      <div className="bg-surface-card rounded-xl border border-border-default overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border-default">
          <Bell weight="regular" className="w-4 h-4 text-text-muted" />
          <span className="text-[13px] font-semibold text-text-primary">Active</span>
          {newCount > 0 && (
            <span className="text-[10px] font-bold bg-danger-500 text-white rounded-full px-1.5 py-px">
              {newCount} new
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[11px] text-text-secondary">Unread only</span>
            <button
              role="switch"
              aria-checked={unreadOnly}
              onClick={() => setUnreadOnly(v => !v)}
              className="relative shrink-0 cursor-pointer border-none p-0 transition-colors duration-200"
              style={{
                width: 28, height: 16, borderRadius: 99,
                background: unreadOnly ? 'var(--brand-primary)' : 'var(--border-default)',
              }}
            >
              <span
                className="absolute top-0.5 transition-all duration-200"
                style={{
                  width: 12, height: 12, borderRadius: '50%',
                  background: '#fff',
                  left: unreadOnly ? 14 : 2,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                }}
              />
            </button>
          </div>
        </div>

        {fetching ? (
          <div className="px-5 py-10 text-center">
            <p className="text-[13px] text-text-secondary">Loading…</p>
          </div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-5 py-12 text-center">
            <CheckCircle weight="regular" className="w-8 h-8 text-success-500" />
            <p className="text-[13px] font-medium text-text-primary">{unreadOnly ? 'No unread notifications' : 'All clear'}</p>
            <p className="text-[12px] text-text-secondary">{unreadOnly ? 'You\'ve read everything.' : 'No overdue invoices, expiring quotes, or IR35 risks.'}</p>
          </div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {displayed.map(n => {
              const isUnread = !readIds.has(n.id)
              const badge    = BADGE_STYLE[n.priority]
              return (
                <Link
                  key={n.id}
                  href={n.href}
                  className="flex items-center gap-3 px-5 py-3.5 no-underline group transition-colors hover:bg-surface-sunken"
                >
                  <div className="flex-1 min-w-0">
                    <p className={`text-[13px] leading-snug group-hover:text-brand-primary transition-colors ${isUnread ? 'font-semibold text-text-primary' : 'font-medium text-text-secondary'}`}>
                      {n.title}
                    </p>
                    <p className="text-[11px] text-text-secondary mt-0.5">{n.sub}</p>
                  </div>

                  <span
                    className="shrink-0 text-[10px] font-semibold rounded-full px-2 py-0.5"
                    style={{ background: badge.bg, color: badge.color }}
                  >
                    {TYPE_LABEL[n.type]}
                  </span>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
