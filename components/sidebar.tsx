'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { Menu, X, ChevronRight, Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// ── types ──────────────────────────────────────────────────────────────
interface DropdownItem {
  label: string
  sub?: string
  badge?: { text: string; color: string }
  href: string
}

interface NavItem {
  href: string
  label: string
  dropdown?: (data: NavData) => DropdownItem[]
}

// Narrow projection shapes matching the Supabase SELECT strings used in load()/refresh()
// Supabase infers joined 1:1 relations as arrays, so accept both object and array forms.
type ClientJoin = { name: string } | { name: string }[] | null
type NavInvoice = { id: string; invoice_number: string; status: string; total: number; due_date: string; clients: ClientJoin }
type NavQuote   = { id: string; quote_number: string; status: string; total: number; expiry_date: string | null; clients: ClientJoin }
type NavClient  = { id: string; name: string; contact_name: string | null; email: string | null; status: string }
type NavProject = { id: string; title: string; ir35_status: string; status: string; clients: ClientJoin }
type NavExpense = { id: string; merchant: string; category: string; amount: number; date: string }

function navClientName(c: ClientJoin): string | undefined {
  if (!c) return undefined
  return Array.isArray(c) ? c[0]?.name : c.name
}

interface NavData {
  invoices: NavInvoice[]
  clients:  NavClient[]
  projects: NavProject[]
  expenses: NavExpense[]
  ir35:     NavProject[]
  quotes:   NavQuote[]
}

const SETTINGS_TABS = [
  { label: 'Profile',              sub: 'Name, phone, logo',                 href: '/settings?tab=Profile' },
  { label: 'Business details',     sub: 'Business type, VAT, UTR',           href: '/settings?tab=Business+details' },
  { label: 'Personal tax inputs',  sub: 'Student loan, pension, salary',     href: '/settings?tab=Personal+tax+inputs' },
  { label: 'Banking',              sub: 'Sort code, account number',         href: '/settings?tab=Banking' },
  { label: 'Billing',              sub: 'Plan and subscription',             href: '/settings?tab=Billing' },
  { label: 'Accountant Access',    sub: 'Invite your accountant',            href: '/settings?tab=Accountant+Access' },
  { label: 'Danger Zone',          sub: 'Delete account',                    href: '/settings?tab=Danger+Zone' },
]

// ── helpers ────────────────────────────────────────────────────────────
function fmt(n: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n)
}

function statusColor(s: string): string {
  const map: Record<string, string> = {
    paid: '#1D6B35', sent: '#1A5E8A', draft: '#666', overdue: '#C0392B', accepted: '#1D6B35', declined: '#C0392B', expired: '#888',
    active: '#1D6B35', paused: '#9A7B0A', archived: '#888',
    outside_ir35: '#1D6B35', inside_ir35: '#C0392B', needs_review: '#9A7B0A',
    completed: '#888', on_hold: '#9A7B0A', cancelled: '#C0392B',
  }
  return map[s] ?? '#666'
}

function statusBg(s: string): string {
  const map: Record<string, string> = {
    paid: '#EAFAF0', sent: '#EBF4FD', draft: '#F0F0F0', overdue: '#FDECEA', accepted: '#EAFAF0', declined: '#FDECEA', expired: '#F0F0F0',
    active: '#EAFAF0', paused: '#FEF9E7', archived: '#F0F0F0',
    outside_ir35: '#EAFAF0', inside_ir35: '#FDECEA', needs_review: '#FEF9E7',
    completed: '#F0F0F0', on_hold: '#FEF9E7', cancelled: '#FDECEA',
  }
  return map[s] ?? '#F0F0F0'
}

function humanStatus(s: string) {
  const map: Record<string, string> = {
    outside_ir35: 'Outside IR35', inside_ir35: 'Inside IR35', needs_review: 'Review',
    on_hold: 'On hold',
  }
  return map[s] ?? s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

// ── nav config ─────────────────────────────────────────────────────────
const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard' },
  {
    href: '/clients',
    label: 'Clients',
    dropdown: ({ clients }) => clients.slice(0, 4).map(c => ({
      label: c.name,
      sub: c.contact_name ?? c.email ?? '',
      badge: { text: humanStatus(c.status), color: statusColor(c.status) },
      href: `/clients/${c.id}`,
    })),
  },
  {
    href: '/projects',
    label: 'Projects',
    dropdown: ({ projects }) => projects.slice(0, 4).map(p => ({
      label: p.title,
      sub: navClientName(p.clients) ?? '',
      badge: { text: humanStatus(p.ir35_status), color: statusColor(p.ir35_status) },
      href: `/projects/${p.id}`,
    })),
  },
  {
    href: '/invoices',
    label: 'Invoices',
    dropdown: ({ invoices }) => invoices.slice(0, 4).map(i => ({
      label: i.invoice_number,
      sub: `${navClientName(i.clients) ?? '—'} · ${fmt(i.total)}`,
      badge: { text: humanStatus(i.status), color: statusColor(i.status) },
      href: `/invoices/${i.id}`,
    })),
  },
  {
    href: '/quotes',
    label: 'Quotes',
    dropdown: ({ quotes }) => (quotes ?? []).slice(0, 4).map(q => ({
      label: q.quote_number,
      sub: `${navClientName(q.clients) ?? '—'} · ${fmt(q.total)}`,
      badge: { text: humanStatus(q.status), color: statusColor(q.status) },
      href: `/quotes/${q.id}`,
    })),
  },
  { href: '/tax', label: 'Tax' },

  {
    href: '/expenses',
    label: 'Expenses',
    dropdown: ({ expenses }) => expenses.slice(0, 4).map(e => ({
      label: e.merchant,
      sub: `${e.category.replace(/_/g, ' ')} · ${fmt(e.amount)}`,
      badge: { text: new Date(e.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), color: '#666' },
      href: '/expenses',
    })),
  },
]

// ── Dropdown panel ─────────────────────────────────────────────────────
function NavDropdown({ items, viewAllHref, label }: { items: DropdownItem[]; viewAllHref: string; label: string }) {
  if (!items.length) return (
    <div style={{
      position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
      background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 10,
      padding: '10px 14px', minWidth: 180, zIndex: 100,
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    }}>
      <p style={{ fontSize: 11, color: '#666', textAlign: 'center' }}>No {label.toLowerCase()} yet</p>
    </div>
  )

  return (
    <div className="fd-dropdown-enter" style={{
      position: 'absolute', top: 'calc(100% + 2px)', left: '50%', transform: 'translateX(-50%)',
      background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 10,
      minWidth: 240, zIndex: 100,
      boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
      overflow: 'hidden',
    }}>
      {/* Arrow */}
      <div style={{
        position: 'absolute', top: -5, left: '50%', transform: 'translateX(-50%) rotate(45deg)',
        width: 9, height: 9, background: '#1A1A1A', border: '1px solid #2A2A2A',
        borderRight: 'none', borderBottom: 'none',
      }} />

      {items.map((item, i) => (
        <Link key={i} href={item.href} style={{ display: 'block', textDecoration: 'none' }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '9px 14px',
            borderBottom: i < items.length - 1 ? '1px solid #252525' : 'none',
            transition: 'background 0.1s',
          }}
            onMouseEnter={e => (e.currentTarget.style.background = '#222')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#F0F0F0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {item.label}
              </p>
              {item.sub && (
                <p style={{ fontSize: 10, color: '#777', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.sub}
                </p>
              )}
            </div>
            {item.badge && (
              <span style={{
                marginLeft: 8, fontSize: 9, fontWeight: 700,
                color: item.badge.color,
                background: statusBg(item.badge.text.toLowerCase().replace(/ /g, '_')),
                padding: '2px 6px', borderRadius: 4,
                whiteSpace: 'nowrap', flexShrink: 0,
                border: `1px solid ${item.badge.color}22`,
              }}>
                {item.badge.text}
              </span>
            )}
          </div>
        </Link>
      ))}

      {/* View all */}
      <Link href={viewAllHref} style={{ display: 'block', textDecoration: 'none' }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 14px', borderTop: '1px solid #252525',
          background: '#161616',
        }}
          onMouseEnter={e => (e.currentTarget.style.background = '#1E1E1E')}
          onMouseLeave={e => (e.currentTarget.style.background = '#161616')}
        >
          <span style={{ fontSize: 11, color: '#888', fontWeight: 500 }}>View all {label.toLowerCase()}</span>
          <ChevronRight style={{ width: 12, height: 12, color: '#555' }} />
        </div>
      </Link>
    </div>
  )
}


// ── Notification system ────────────────────────────────────────────────

const DISMISSED_KEY  = 'fd_dismissed_notifications'
const SUPPRESSED_KEY = 'fd_suppressed_notifications'

interface Notification {
  id: string
  type: 'overdue' | 'due_soon' | 'quote_expiring' | 'ir35_risk'
  title: string
  sub: string
  href: string
  priority: 'red' | 'amber'
}

function buildNotifications(
  invoices: NavInvoice[],
  quotes:   NavQuote[],
  projects: NavProject[],
): Notification[] {
  const today    = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  const notifications: Notification[] = []

  // Overdue invoices
  invoices
    .filter(i => i.status === 'overdue')
    .forEach(i => {
      const days = Math.floor((today.getTime() - new Date(i.due_date).getTime()) / 86400000)
      notifications.push({
        id:       `invoice-overdue-${i.id}`,
        type:     'overdue',
        title:    `${i.invoice_number} is overdue`,
        sub:      `${navClientName(i.clients) ?? 'Unknown'} · ${days} day${days !== 1 ? 's' : ''} late`,
        href:     `/invoices/${i.id}`,
        priority: 'red',
      })
    })

  // Due within 3 days
  invoices
    .filter(i => ['sent', 'draft'].includes(i.status))
    .forEach(i => {
      const days = Math.floor((new Date(i.due_date).getTime() - today.getTime()) / 86400000)
      if (days >= 0 && days <= 3) {
        notifications.push({
          id:       `invoice-due-soon-${i.id}-${todayStr}`,
          type:     'due_soon',
          title:    `${i.invoice_number} due in ${days === 0 ? 'today' : `${days} day${days !== 1 ? 's' : ''}`}`,
          sub:      `${navClientName(i.clients) ?? 'Unknown'} · £${Number(i.total).toLocaleString('en-GB', { minimumFractionDigits: 2 })}`,
          href:     `/invoices/${i.id}`,
          priority: 'amber',
        })
      }
    })

  // Quotes expiring within 3 days
  quotes
    .filter(q => q.status === 'sent')
    .forEach(q => {
      if (!q.expiry_date) return
      const days = Math.floor((new Date(q.expiry_date).getTime() - today.getTime()) / 86400000)
      if (days >= 0 && days <= 3) {
        notifications.push({
          id:       `quote-expiring-${q.id}-${todayStr}`,
          type:     'quote_expiring',
          title:    `${q.quote_number} expires in ${days === 0 ? 'today' : `${days} day${days !== 1 ? 's' : ''}`}`,
          sub:      navClientName(q.clients) ?? 'Unknown',
          href:     `/quotes/${q.id}`,
          priority: 'amber',
        })
      }
    })

  // IR35 risks
  projects
    .filter(p => p.status === 'active' && ['inside_ir35', 'needs_review'].includes(p.ir35_status))
    .forEach(p => {
      notifications.push({
        id:       `ir35-risk-${p.id}`,
        type:     'ir35_risk',
        title:    `${p.title} needs IR35 review`,
        sub:      navClientName(p.clients) ?? 'Unknown',
        href:     `/projects/${p.id}`,
        priority: p.ir35_status === 'inside_ir35' ? 'red' : 'amber',
      })
    })

  return notifications
}

function useNotifications(invoices: NavInvoice[], quotes: NavQuote[], projects: NavProject[]) {
  const [dismissed,  setDismissed]  = useState<Record<string, string>>({})   // id -> dismissedDate
  const [suppressed, setSuppressed] = useState<Set<string>>(new Set())
  const [hasLoaded,  setHasLoaded]  = useState(false)

  useEffect(() => {
    try {
      const d = JSON.parse(localStorage.getItem(DISMISSED_KEY)  ?? '{}')
      const s = JSON.parse(localStorage.getItem(SUPPRESSED_KEY) ?? '[]')
      setDismissed(d)
      setSuppressed(new Set(s))
    } catch {}
    setHasLoaded(true)
  }, [])

  const today = new Date().toISOString().slice(0, 10)

  const all = buildNotifications(invoices, quotes, projects)

  const visible = hasLoaded
    ? all.filter(n =>
        !suppressed.has(n.id) &&
        dismissed[n.id] !== today
      )
    : []

  function dismiss(id: string) {
    const next = { ...dismissed, [id]: today }
    setDismissed(next)
    try { localStorage.setItem(DISMISSED_KEY, JSON.stringify(next)) } catch {}
  }

  function suppress(id: string) {
    const next = new Set(suppressed)
    next.add(id)
    setSuppressed(next)
    try { localStorage.setItem(SUPPRESSED_KEY, JSON.stringify(Array.from(next))) } catch {}
    // Also dismiss so it disappears immediately
    dismiss(id)
  }

  return { visible, dismiss, suppress }
}

function NotificationPanel({
  notifications,
  onDismiss,
  onSuppress,
  onClose,
}: {
  notifications: Notification[]
  onDismiss:  (id: string) => void
  onSuppress: (id: string) => void
  onClose:    () => void
}) {
  const typeColor: Record<Notification['type'], string> = {
    overdue:        '#C0392B',
    due_soon:       '#9A7B0A',
    quote_expiring: '#9A7B0A',
    ir35_risk:      '#C0392B',
  }

  return (
    <div className="fd-dropdown-enter" style={{
      position: 'absolute', top: 'calc(100% + 8px)', right: 0,
      background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 12,
      minWidth: 320, maxWidth: 360, zIndex: 100,
      boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
      overflow: 'hidden',
    }}>
      {/* Arrow */}
      <div style={{
        position: 'absolute', top: -5, right: 14, transform: 'rotate(45deg)',
        width: 9, height: 9, background: '#1A1A1A', border: '1px solid #2A2A2A',
        borderRight: 'none', borderBottom: 'none',
      }} />

      {/* Header */}
      <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid #252525', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>Notifications</p>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
          <X style={{ width: 13, height: 13, color: '#555' }} />
        </button>
      </div>

      {notifications.length === 0 ? (
        <div style={{ padding: '20px 14px', textAlign: 'center' }}>
          <p style={{ fontSize: 12, color: '#555' }}>No notifications</p>
        </div>
      ) : (
        <div style={{ maxHeight: 360, overflowY: 'auto' }}>
          {notifications.map((n, i) => (
            <div key={n.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '10px 14px',
              borderBottom: i < notifications.length - 1 ? '1px solid #222' : 'none',
            }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: typeColor[n.type], flexShrink: 0, marginTop: 4 }} />
              <a href={n.href} onClick={onClose} style={{ flex: 1, textDecoration: 'none', minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#F0F0F0', lineHeight: 1.3 }}>{n.title}</p>
                <p style={{ fontSize: 10, color: '#777', marginTop: 2 }}>{n.sub}</p>
              </a>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0, alignItems: 'center' }}>
                {/* Don't show again */}
                <button
                  onClick={() => onSuppress(n.id)}
                  title="Don't show this again"
                  style={{
                    background: 'none', border: '1px solid #333', borderRadius: 4,
                    cursor: 'pointer', padding: '2px 5px', fontSize: 9,
                    color: '#555', fontWeight: 600, letterSpacing: '0.05em',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#C0392B'; (e.currentTarget as HTMLButtonElement).style.color = '#C0392B' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#333'; (e.currentTarget as HTMLButtonElement).style.color = '#555' }}
                >
                  IGNORE
                </button>
                {/* Dismiss for today */}
                <button
                  onClick={() => onDismiss(n.id)}
                  title="Dismiss for today"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
                >
                  <X style={{ width: 13, height: 13, color: '#555' }} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────
export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openTab, setOpenTab] = useState<string | null>(null)
  const [navData, setNavData] = useState<NavData>({ invoices: [], quotes: [], clients: [], projects: [], expenses: [], ir35: [] })
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifSeen, setNotifSeen] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)

  // Load dropdown data once on mount
  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [
        { data: invoices },
        { data: quotes },
        { data: clients },
        { data: projects },
        { data: expenses },
      ] = await Promise.all([
        supabase.from('invoices')
          .select('id, invoice_number, status, total, due_date, clients(name)')
          .order('created_at', { ascending: false }).limit(50),
        supabase.from('quotes')
          .select('id, quote_number, status, total, expiry_date, clients(name)')
          .order('created_at', { ascending: false }).limit(20),
        supabase.from('clients')
          .select('id, name, contact_name, email, status')
          .order('created_at', { ascending: false }).limit(4),
        supabase.from('projects')
          .select('id, title, ir35_status, status, clients(name)')
          .order('created_at', { ascending: false }).limit(4),
        supabase.from('expenses')
          .select('id, merchant, category, amount, date')
          .order('date', { ascending: false }).limit(4),
      ])

      const ir35 = (projects ?? []).filter((p: NavProject) => p.status === 'active').slice(0, 4)

      setNavData({
        invoices: invoices ?? [],
        quotes:   quotes   ?? [],
        clients:  clients  ?? [],
        projects: projects ?? [],
        expenses: expenses ?? [],
        ir35,
      })
    }
    load()
  }, []) // load once on mount — re-fetch on focus / fd:data-invalidate

  // Re-fetch on window focus and custom invalidate events
  useEffect(() => {
    const supabase = createClient()
    async function refresh() {
      const [
        { data: invoices },
        { data: quotes },
        { data: clients },
        { data: projects },
        { data: expenses },
      ] = await Promise.all([
        supabase.from('invoices').select('id, invoice_number, status, total, due_date, clients(name)').order('created_at', { ascending: false }).limit(50),
        supabase.from('quotes').select('id, quote_number, status, total, expiry_date, clients(name)').order('created_at', { ascending: false }).limit(20),
        supabase.from('clients').select('id, name, contact_name, email, status').order('created_at', { ascending: false }).limit(4),
        supabase.from('projects').select('id, title, ir35_status, status, clients(name)').order('created_at', { ascending: false }).limit(4),
        supabase.from('expenses').select('id, merchant, category, amount, date').order('date', { ascending: false }).limit(4),
      ])
      const ir35 = (projects ?? []).filter((p: NavProject) => p.status === 'active').slice(0, 4)
      setNavData({ invoices: invoices ?? [], quotes: quotes ?? [], clients: clients ?? [], projects: projects ?? [], expenses: expenses ?? [], ir35 })
    }
    window.addEventListener('focus', refresh)
    window.addEventListener('fd:data-invalidate', refresh as EventListener)
    return () => {
      window.removeEventListener('focus', refresh)
      window.removeEventListener('fd:data-invalidate', refresh as EventListener)
    }
  }, [])

  // Close notification panel on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const { visible: notifications, dismiss: dismissNotif, suppress: suppressNotif } = useNotifications(
    navData.invoices, navData.quotes, navData.projects
  )
  const unreadCount = notifSeen ? 0 : notifications.length

  // Derive checklist progress from already-fetched navData
  const checklistSteps = [
    navData.clients.length > 0,
    navData.invoices.length > 0,
    navData.expenses.length > 0,
    navData.projects.length > 0,
  ]
  const completedSteps = checklistSteps.filter(Boolean).length
  const totalSteps = 4
  const checklistDone = completedSteps >= totalSteps

  function handleMouseEnter(href: string) {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setOpenTab(href)
  }

  function handleMouseLeave() {
    closeTimer.current = setTimeout(() => setOpenTab(null), 120)
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <>
      <header
        style={{ background: '#111111', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        className="fixed top-0 left-0 right-0 z-40 h-12 flex items-center px-5 shadow-sm"
      >
        {/* Logo */}
        <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginRight: 28, letterSpacing: '-0.03em' }}>
          freedesk
        </div>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center h-12">
          {NAV.map(({ href, label, dropdown }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
            const isOpen = openTab === href
            const items = dropdown ? dropdown(navData) : []

            return (
              <div
                key={href}
                style={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'center' }}
                onMouseEnter={() => dropdown && handleMouseEnter(href)}
                onMouseLeave={() => dropdown && handleMouseLeave()}
              >
                <Link
                  href={href}
                  className={`fd-nav-tab ${active ? 'active' : ''}`}
                  onClick={() => setOpenTab(null)}
                >
                  {label}
                </Link>

                {/* Dropdown */}
                {dropdown && isOpen && (
                  <div
                    onMouseEnter={() => { if (closeTimer.current) clearTimeout(closeTimer.current) }}
                    onMouseLeave={handleMouseLeave}
                  >
                    <NavDropdown items={items} viewAllHref={href} label={label} />
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-3 h-12">
          {/* Notification bell */}
          <div ref={notifRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <button
              onClick={() => { setNotifOpen(o => !o); setNotifSeen(true) }}
              className="hidden lg:flex"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '4px 6px', borderRadius: 6, position: 'relative',
                display: 'flex', alignItems: 'center',
              }}
              title="Notifications"
            >
              <Bell style={{ width: 16, height: 16, color: unreadCount > 0 ? '#fff' : 'rgba(255,255,255,0.5)' }} />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: 0, right: 0,
                  width: 16, height: 16, borderRadius: '50%',
                  background: '#C0392B', color: '#fff',
                  fontSize: 9, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '1.5px solid #111',
                }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {notifOpen && (
              <NotificationPanel
                notifications={notifications}
                onDismiss={id => { dismissNotif(id) }}
                onSuppress={id => { suppressNotif(id) }}
                onClose={() => setNotifOpen(false)}
              />
            )}
          </div>

          {!checklistDone && (
            <Link
              href="/dashboard#getting-started"
              className="fd-nav-tab hidden lg:flex"
              style={{ gap: 6 }}
            >
              Getting started
              <span style={{
                fontSize: 10, fontWeight: 700,
                background: '#1D6B35', color: '#fff',
                borderRadius: 99, padding: '1px 6px',
              }}>
                {completedSteps}/{totalSteps}
              </span>
            </Link>
          )}

          <div
            style={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'center' }}
            onMouseEnter={() => handleMouseEnter('/settings')}
            onMouseLeave={handleMouseLeave}
          >
            <Link
              href="/settings"
              className={`fd-nav-tab hidden lg:flex ${pathname.startsWith('/settings') ? 'active' : ''}`}
              onClick={() => setOpenTab(null)}
            >
              Settings
            </Link>
            {openTab === '/settings' && (
              <div
                onMouseEnter={() => { if (closeTimer.current) clearTimeout(closeTimer.current) }}
                onMouseLeave={handleMouseLeave}
              >
                <div className="fd-dropdown-enter" style={{
                  position: 'absolute', top: 'calc(100% + 2px)', right: 0,
                  background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 10,
                  minWidth: 240, zIndex: 100,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
                  overflow: 'hidden',
                }}>
                  {/* Arrow */}
                  <div style={{
                    position: 'absolute', top: -5, right: 20, transform: 'rotate(45deg)',
                    width: 9, height: 9, background: '#1A1A1A', border: '1px solid #2A2A2A',
                    borderRight: 'none', borderBottom: 'none',
                  }} />
                  <div style={{ padding: '8px 14px 6px', borderBottom: '1px solid #252525' }}>
                    <p style={{ fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>Settings</p>
                  </div>
                  {SETTINGS_TABS.map((tab, i) => (
                    <Link key={i} href={tab.href} style={{ display: 'block', textDecoration: 'none' }}>
                      <div style={{
                        padding: '9px 14px',
                        borderBottom: i < SETTINGS_TABS.length - 1 ? '1px solid #252525' : 'none',
                        transition: 'background 0.1s',
                      }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#222')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <p style={{ fontSize: 12, fontWeight: 600, color: '#F0F0F0' }}>{tab.label}</p>
                        <p style={{ fontSize: 10, color: '#666', marginTop: 1 }}>{tab.sub}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button
            onClick={handleSignOut}
            className="fd-nav-tab hidden lg:flex"
          >
            Sign out
          </button>
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: '#333', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 12, fontWeight: 700,
            color: '#fff', border: '1px solid #444',
          }}>
            M
          </div>
          <button className="lg:hidden" onClick={() => setMobileOpen(true)}>
            <Menu style={{ width: 20, height: 20, color: '#fff' }} />
          </button>
        </div>
      </header>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div style={{
            background: '#111', position: 'absolute', top: 0, left: 0, bottom: 0,
            width: 240, display: 'flex', flexDirection: 'column',
          }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10" style={{ flexShrink: 0 }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em' }}>freedesk</span>
              <button onClick={() => setMobileOpen(false)}>
                <X style={{ width: 20, height: 20, color: '#fff' }} />
              </button>
            </div>
            {/* Scrollable body — nav + footer scroll together so Sign out is always reachable */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              <nav className="py-3 px-3 space-y-0.5" style={{ flexShrink: 0 }}>
                {NAV.map(({ href, label }) => {
                  const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
                  return (
                    <Link key={href} href={href} onClick={() => setMobileOpen(false)} style={{
                      display: 'block', padding: '9px 14px', borderRadius: 6,
                      fontSize: 13, fontWeight: active ? 600 : 400,
                      color: active ? '#fff' : 'rgba(255,255,255,0.6)',
                      background: active ? 'rgba(255,255,255,0.1)' : 'transparent',
                      textDecoration: 'none',
                    }}>
                      {label}
                    </Link>
                  )
                })}
              </nav>
              {/* mt-auto keeps footer pinned to the bottom of the scrollable area;
                  safe-area-inset-bottom stops iOS chrome from covering Sign out */}
              <div className="mt-auto px-5 border-t border-white/10 space-y-3"
                style={{ paddingTop: 16, paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}>
                {!checklistDone && (
                  <Link href="/dashboard#getting-started" onClick={() => setMobileOpen(false)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, color: 'rgba(255,255,255,0.8)', textDecoration: 'none', fontWeight: 500 }}>
                    Getting started
                    <span style={{ fontSize: 10, fontWeight: 700, background: '#1D6B35', color: '#fff', borderRadius: 99, padding: '1px 7px' }}>
                      {completedSteps}/{totalSteps}
                    </span>
                  </Link>
                )}
                <Link href="/settings" onClick={() => setMobileOpen(false)}
                  style={{ display: 'block', fontSize: 13, color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>
                  Settings
                </Link>
                <button onClick={handleSignOut}
                  style={{ display: 'block', fontSize: 13, color: 'rgba(255,255,255,0.6)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
