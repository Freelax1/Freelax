'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import {
  LayoutDashboard, Users, FolderOpen, FileText, ClipboardList,
  Calculator, PoundSterling, Settings, Bell, X, Menu, LogOut,
  ChevronLeft, Search, Sparkles, CheckCircle2, AlertCircle,
  CreditCard, LifeBuoy, UserCircle,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import CommandMenu from '@/components/command-menu'

// ── Types ──────────────────────────────────────────────────────────────

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

// ── Nav config ─────────────────────────────────────────────────────────

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { id: 'dashboard', href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'tax',       href: '/tax',       label: 'Tax',       icon: Calculator },
    ],
  },
  {
    label: 'Money',
    items: [
      { id: 'invoices', href: '/invoices', label: 'Invoices', icon: FileText },
      { id: 'quotes',   href: '/quotes',   label: 'Quotes',   icon: ClipboardList },
      { id: 'expenses', href: '/expenses', label: 'Expenses', icon: PoundSterling },
    ],
  },
  {
    label: 'Clients',
    items: [
      { id: 'clients',  href: '/clients',  label: 'Clients',  icon: Users },
      { id: 'projects', href: '/projects', label: 'Projects', icon: FolderOpen },
    ],
  },
]

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard', '/clients': 'Clients', '/projects': 'Projects',
  '/invoices': 'Invoices',   '/quotes': 'Quotes',   '/tax': 'Tax',
  '/expenses': 'Expenses',   '/settings': 'Settings', '/onboarding': 'Get started',
}

const PAGE_CTA: Record<string, { label: string; href: string }> = {
  '/dashboard': { label: 'New invoice',  href: '/invoices/new' },
  '/expenses':  { label: 'Log expense',  href: '/expenses/new' },
  '/clients':   { label: 'New client',   href: '/clients/new' },
  '/projects':  { label: 'New project',  href: '/projects/new' },
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

function buildNotifications(invoices: NavInvoice[], quotes: NavQuote[], projects: NavProject[]): Notification[] {
  const today    = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  const out: Notification[] = []

  invoices.filter(i => i.status === 'overdue').forEach(i => {
    const days = Math.floor((today.getTime() - new Date(i.due_date).getTime()) / 86400000)
    out.push({ id: `invoice-overdue-${i.id}`, type: 'overdue', priority: 'red',
      title: `${i.invoice_number} is overdue`,
      sub: `${navClientName(i.clients) ?? 'Unknown'} · ${days} day${days !== 1 ? 's' : ''} late`,
      href: `/invoices/${i.id}` })
  })

  invoices.filter(i => ['sent', 'draft'].includes(i.status)).forEach(i => {
    const days = Math.floor((new Date(i.due_date).getTime() - today.getTime()) / 86400000)
    if (days >= 0 && days <= 3) {
      out.push({ id: `invoice-due-soon-${i.id}-${todayStr}`, type: 'due_soon', priority: 'amber',
        title: `${i.invoice_number} due ${days === 0 ? 'today' : `in ${days} day${days !== 1 ? 's' : ''}`}`,
        sub: `${navClientName(i.clients) ?? 'Unknown'} · £${Number(i.total).toLocaleString('en-GB', { minimumFractionDigits: 2 })}`,
        href: `/invoices/${i.id}` })
    }
  })

  quotes.filter(q => q.status === 'sent').forEach(q => {
    if (!q.expiry_date) return
    const days = Math.floor((new Date(q.expiry_date).getTime() - today.getTime()) / 86400000)
    if (days >= 0 && days <= 3) {
      out.push({ id: `quote-expiring-${q.id}-${todayStr}`, type: 'quote_expiring', priority: 'amber',
        title: `${q.quote_number} expires ${days === 0 ? 'today' : `in ${days} day${days !== 1 ? 's' : ''}`}`,
        sub: navClientName(q.clients) ?? 'Unknown',
        href: `/quotes/${q.id}` })
    }
  })

  projects.filter(p => p.status === 'active' && ['inside_ir35', 'needs_review'].includes(p.ir35_status)).forEach(p => {
    out.push({ id: `ir35-risk-${p.id}`, type: 'ir35_risk',
      priority: p.ir35_status === 'inside_ir35' ? 'red' : 'amber',
      title: `${p.title} needs IR35 review`,
      sub: navClientName(p.clients) ?? 'Unknown',
      href: `/projects/${p.id}` })
  })

  return out
}

function useNotifications(invoices: NavInvoice[], quotes: NavQuote[], projects: NavProject[]) {
  const [dismissed,  setDismissed]  = useState<Record<string, string>>({})
  const [suppressed, setSuppressed] = useState<Set<string>>(new Set())
  const [hasLoaded,  setHasLoaded]  = useState(false)

  useEffect(() => {
    try {
      setDismissed(JSON.parse(localStorage.getItem(DISMISSED_KEY)  ?? '{}'))
      setSuppressed(new Set(JSON.parse(localStorage.getItem(SUPPRESSED_KEY) ?? '[]')))
    } catch {}
    setHasLoaded(true)
  }, [])

  const today = new Date().toISOString().slice(0, 10)
  const all   = buildNotifications(invoices, quotes, projects)
  const visible = hasLoaded ? all.filter(n => !suppressed.has(n.id) && dismissed[n.id] !== today) : []

  function dismiss(id: string) {
    const next = { ...dismissed, [id]: today }
    setDismissed(next)
    try { localStorage.setItem(DISMISSED_KEY, JSON.stringify(next)) } catch {}
  }

  function suppress(id: string) {
    const next = new Set(suppressed); next.add(id)
    setSuppressed(next)
    try { localStorage.setItem(SUPPRESSED_KEY, JSON.stringify(Array.from(next))) } catch {}
    dismiss(id)
  }

  return { visible, dismiss, suppress }
}

// ── Notification panel — premium glass card ───────────────────────────

function NotificationPanel({ notifications, onDismiss, onSuppress, onClose }: {
  notifications: Notification[]
  onDismiss:  (id: string) => void
  onSuppress: (id: string) => void
  onClose:    () => void
}) {
  return (
    <div className="fx-notif-panel" role="dialog">
      <div className="fx-notif-arrow" aria-hidden />
      <header className="fx-notif-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.005em' }}>Activity</span>
          {notifications.length > 0 && (
            <span style={{
              fontSize: 10, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
              padding: '1px 6px', borderRadius: 4,
              background: 'rgba(184,65,58,0.10)', color: '#B8413A',
              border: '1px solid rgba(184,65,58,0.20)',
            }}>{notifications.length}</span>
          )}
        </div>
        <button onClick={onClose} className="fx-notif-close" aria-label="Close">
          <X style={{ width: 13, height: 13 }} strokeWidth={1.75} />
        </button>
      </header>
      {notifications.length === 0 ? (
        <div className="fx-notif-empty">
          <div className="fx-notif-empty-icon">
            <CheckCircle2 style={{ width: 18, height: 18, color: '#1D6B35' }} strokeWidth={1.5} />
          </div>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', margin: 0 }}>You&rsquo;re all caught up</p>
          <p style={{ fontSize: 11.5, color: '#6B6E78', margin: '3px 0 0' }}>No invoices, quotes or projects need attention right now.</p>
        </div>
      ) : (
        <ul className="fx-notif-list" role="list">
          {notifications.map(n => (
            <li key={n.id} className="fx-notif-row" data-priority={n.priority}>
              <span className="fx-notif-dot" data-priority={n.priority} />
              <a href={n.href} onClick={onClose} className="fx-notif-link">
                <p className="fx-notif-title">{n.title}</p>
                <p className="fx-notif-sub">{n.sub}</p>
              </a>
              <div className="fx-notif-actions">
                <button onClick={() => onSuppress(n.id)} title="Don't show again" className="fx-notif-ignore">Ignore</button>
                <button onClick={() => onDismiss(n.id)} title="Dismiss" className="fx-notif-x">
                  <X style={{ width: 12, height: 12 }} strokeWidth={2} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── Data fetching ──────────────────────────────────────────────────────

async function fetchNavData(): Promise<NavData> {
  const supabase = createClient()
  const [
    { data: invoices }, { data: quotes }, { data: clients },
    { data: projects }, { data: expenses },
  ] = await Promise.all([
    supabase.from('invoices').select('id, invoice_number, status, total, due_date, clients(name)').order('created_at', { ascending: false }).limit(50),
    supabase.from('quotes').select('id, quote_number, status, total, expiry_date, clients(name)').order('created_at', { ascending: false }).limit(20),
    supabase.from('clients').select('id, name, contact_name, email, status').order('created_at', { ascending: false }).limit(4),
    supabase.from('projects').select('id, title, ir35_status, status, clients(name)').order('created_at', { ascending: false }).limit(4),
    supabase.from('expenses').select('id, merchant, category, amount, date').order('date', { ascending: false }).limit(4),
  ])
  const ir35 = (projects ?? []).filter((p: NavProject) => p.status === 'active').slice(0, 4)
  return { invoices: invoices ?? [], quotes: quotes ?? [], clients: clients ?? [], projects: projects ?? [], expenses: expenses ?? [], ir35 }
}

// ── NavItem ────────────────────────────────────────────────────────────

interface NavItemProps {
  href: string
  label: string
  Icon: React.ElementType
  active: boolean
  collapsed: boolean
  badgeCount?: number
  onClose?: () => void
}

function NavItem({ href, label, Icon, active, collapsed, badgeCount, onClose }: NavItemProps) {
  function handleMouseMove(e: React.MouseEvent<HTMLAnchorElement>) {
    const r = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
  }
  return (
    <Link
      href={href}
      onClick={onClose}
      onMouseMove={handleMouseMove}
      className="fx-nav-item"
      data-active={active ? 'true' : 'false'}
      aria-current={active ? 'page' : undefined}
      title={collapsed ? label : undefined}
    >
      <span className="fx-nav-glow" aria-hidden="true" />
      <span className="fx-nav-icon">
        <Icon size={17} />
      </span>
      {!collapsed && <span className="fx-nav-label">{label}</span>}
      {badgeCount ? (
        collapsed
          ? <span className="fx-badge-mini" style={{ position: 'absolute', top: 5, right: 7 }} />
          : <span className="fx-nav-tail"><span className="fx-badge-count">{badgeCount}</span></span>
      ) : null}
    </Link>
  )
}

// ── Main Sidebar ───────────────────────────────────────────────────────

export default function Sidebar() {
  const pathname = usePathname()
  const router   = useRouter()

  const [collapsed,    setCollapsed]    = useState(false)
  const [profileOpen,  setProfileOpen]  = useState(false)
  const [hoveredId,    setHoveredId]    = useState<string | null>(null)
  const [pill,         setPill]         = useState({ top: 0, height: 0, ready: false })
  const [hoverPill,    setHoverPill]    = useState({ top: 0, height: 0, visible: false })
  const [mobileOpen,   setMobileOpen]   = useState(false)
  const [navData,      setNavData]      = useState<NavData>({ invoices: [], quotes: [], clients: [], projects: [], expenses: [], ir35: [] })
  const [userEmail,    setUserEmail]    = useState<string | null>(null)
  const [notifOpen,    setNotifOpen]    = useState(false)
  const [notifSeen,    setNotifSeen]    = useState(false)
  const [cmdOpen,      setCmdOpen]      = useState(false)
  const [scrolled,     setScrolled]     = useState(false)

  const itemRefs    = useRef<Record<string, HTMLDivElement | null>>({})
  const navRef      = useRef<HTMLDivElement>(null)
  const notifRef    = useRef<HTMLDivElement>(null)
  const profileRef  = useRef<HTMLDivElement>(null)

  // CSS variable
  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-w', '244px')
  }, [])

  // Scroll tracking
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Load data
  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) setUserEmail(user.email)
      setNavData(await fetchNavData())
    }
    load()
  }, [])

  // Refresh on focus + data invalidation
  useEffect(() => {
    async function refresh() { setNavData(await fetchNavData()) }
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
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Close profile menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // ⌘K / Ctrl+K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setCmdOpen(true) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function isActive(href: string) {
    return pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
  }

  const allItems = NAV_GROUPS.flatMap(g => g.items)
  const activeId = allItems.find(i => isActive(i.href))?.id
    ?? (isActive('/settings') ? 'settings' : 'dashboard')

  // Active pill position
  useLayoutEffect(() => {
    const el  = itemRefs.current[activeId]
    const nav = navRef.current
    if (!el || !nav) return
    const elRect  = el.getBoundingClientRect()
    const navRect = nav.getBoundingClientRect()
    setPill({ top: elRect.top - navRect.top + nav.scrollTop, height: el.offsetHeight, ready: true })
  }, [activeId, collapsed])

  // Hover pill position
  useLayoutEffect(() => {
    if (!hoveredId || hoveredId === activeId) { setHoverPill(p => ({ ...p, visible: false })); return }
    const el  = itemRefs.current[hoveredId]
    const nav = navRef.current
    if (!el || !nav) return
    const elRect  = el.getBoundingClientRect()
    const navRect = nav.getBoundingClientRect()
    setHoverPill({ top: elRect.top - navRect.top + nav.scrollTop, height: el.offsetHeight, visible: true })
  }, [hoveredId, activeId])

  function toggleCollapsed() {
    setCollapsed(c => {
      const next = !c
      document.documentElement.style.setProperty('--sidebar-w', next ? '68px' : '244px')
      return next
    })
  }

  const { visible: notifications, dismiss: dismissNotif, suppress: suppressNotif } =
    useNotifications(navData.invoices, navData.quotes, navData.projects)
  const unreadCount   = notifSeen ? 0 : notifications.length
  const overdueCount  = navData.invoices.filter(i => i.status === 'overdue').length
  const overdueAmount = navData.invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + Number(i.total), 0)

  const checklistSteps = [
    true,
    navData.clients.length  > 0,
    navData.invoices.length > 0,
    navData.expenses.length > 0,
    navData.projects.length > 0,
  ]
  const completedSteps = checklistSteps.filter(Boolean).length
  const totalSteps     = 5
  const checklistDone  = completedSteps >= totalSteps

  // Today's briefing state derivation
  const briefing: { kind: 'overdue' | 'progress' | 'calm'; primary: string; secondary: string; href: string } =
    overdueCount > 0
      ? {
          kind: 'overdue',
          primary: `${overdueCount} overdue invoice${overdueCount === 1 ? '' : 's'}`,
          secondary: `£${overdueAmount.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} waiting to be paid`,
          href: '/invoices?status=overdue',
        }
      : !checklistDone
      ? {
          kind: 'progress',
          primary: 'Getting started',
          secondary: `${completedSteps} of ${totalSteps} steps complete`,
          href: '/dashboard#getting-started',
        }
      : {
          kind: 'calm',
          primary: 'All caught up',
          secondary: 'Tax year 26/27 is on track',
          href: '/tax',
        }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  const initials  = userEmail ? userEmail[0].toUpperCase() : '?'
  const userHandle = userEmail ? userEmail.split('@')[0] : 'you'
  const pageTitle = (() => {
    for (const [path, title] of Object.entries(PAGE_TITLES)) {
      if (pathname === path || (path !== '/dashboard' && pathname.startsWith(path))) return title
    }
    return 'Freelax'
  })()
  const cta = (() => {
    for (const [path, action] of Object.entries(PAGE_CTA)) {
      if (pathname === path || (pathname.startsWith(path + '/') && !pathname.includes('/new'))) return action
    }
    return null
  })()

  // Per-section attention counts (subtle indicators on group labels)
  const sectionCounts: Record<string, number> = {
    Money:   overdueCount,
    Overview: 0,
    Clients: 0,
  }

  return (
    <>
      {/* ════════════════════ DESKTOP SIDEBAR ════════════════════════ */}
      <aside
        className="fx-sidebar hidden lg:flex"
        data-collapsed={collapsed ? 'true' : 'false'}
        style={{ position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 40 }}
      >
        {/* Ambient rail glow */}
        <div className="fx-rail-glow" style={{ top: pill.top, height: pill.height, opacity: pill.ready ? 1 : 0 }} aria-hidden="true" />

        {/* Header */}
        <header className="fx-header">
          <a className="fx-brand" href="/dashboard" aria-label="Freelax home">
            <span className="fx-mark">
              <span className="fx-mark-shape"><span className="fx-mark-dot" /></span>
            </span>
            {!collapsed && (
              <span className="fx-brand-text">
                <span className="fx-wordmark">Freelax</span>
                <span className="fx-year-chip">26/27</span>
              </span>
            )}
          </a>
          <button className="fx-collapse" onClick={toggleCollapsed} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            <ChevronLeft style={{ width: 13, height: 13, transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 420ms cubic-bezier(.22,1.24,.36,1)' }} />
          </button>
        </header>

        {/* Search shortcut */}
        {!collapsed ? (
          <button className="fx-search" onClick={() => setCmdOpen(true)} aria-label="Open search">
            <Search style={{ width: 13, height: 13 }} strokeWidth={1.75} />
            <span className="fx-search-label">Search or jump to…</span>
            <kbd className="fx-kbd" suppressHydrationWarning>
              {typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘K' : '⌃K'}
            </kbd>
          </button>
        ) : (
          <button className="fx-search fx-search-collapsed" onClick={() => setCmdOpen(true)} aria-label="Open search" title="Search">
            <Search style={{ width: 14, height: 14 }} strokeWidth={1.75} />
          </button>
        )}

        {/* Nav */}
        <div role="navigation" className="fx-nav" ref={navRef}>
          {/* Active pill */}
          <div className="fx-pill" style={{ transform: `translateY(${pill.top}px)`, height: pill.height, opacity: pill.ready ? 1 : 0 }} aria-hidden="true" />
          {/* Hover pill */}
          <div className="fx-pill fx-pill-hover" style={{ transform: `translateY(${hoverPill.top}px)`, height: hoverPill.height, opacity: hoverPill.visible ? 1 : 0 }} aria-hidden="true" />

          {NAV_GROUPS.map(group => {
            const groupHasActive = group.items.some(i => isActive(i.href))
            const groupCount = sectionCounts[group.label] ?? 0
            return (
              <div key={group.label} className="fx-section-group">
                <div className="fx-section" data-has-active={groupHasActive ? 'true' : 'false'}>
                  <span className="fx-section-rail" aria-hidden="true" />
                  {!collapsed && <span className="fx-section-label">{group.label}</span>}
                  {!collapsed && groupCount > 0 && (
                    <span className="fx-section-count" title={`${groupCount} need attention`}>{groupCount}</span>
                  )}
                </div>
                <div className="fx-items">
                  {group.items.map(item => (
                    <div
                      key={item.id}
                      ref={el => { itemRefs.current[item.id] = el }}
                      onMouseEnter={() => setHoveredId(item.id)}
                      onMouseLeave={() => setHoveredId(null)}
                    >
                      <NavItem
                        href={item.href}
                        label={item.label}
                        Icon={item.icon}
                        active={isActive(item.href)}
                        collapsed={collapsed}
                        badgeCount={item.id === 'invoices' && overdueCount > 0 ? overdueCount : undefined}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Briefing card — "today" surface ─────────────────────── */}
        {!collapsed && (
          <Link href={briefing.href} className={`fx-briefing fx-briefing-${briefing.kind}`}>
            <span className="fx-briefing-icon">
              {briefing.kind === 'overdue'  && <AlertCircle style={{ width: 14, height: 14 }} strokeWidth={2} />}
              {briefing.kind === 'progress' && <Sparkles style={{ width: 14, height: 14 }} strokeWidth={2} />}
              {briefing.kind === 'calm'     && <CheckCircle2 style={{ width: 14, height: 14 }} strokeWidth={2} />}
            </span>
            <span className="fx-briefing-text">
              <span className="fx-briefing-title">{briefing.primary}</span>
              <span className="fx-briefing-sub">{briefing.secondary}</span>
            </span>
            {briefing.kind === 'progress' && (
              <span className="fx-briefing-meta">{completedSteps}/{totalSteps}</span>
            )}
            {briefing.kind === 'overdue' && (
              <span className="fx-briefing-meta" data-tone="danger">{overdueCount}</span>
            )}
          </Link>
        )}
        {collapsed && briefing.kind !== 'calm' && (
          <Link href={briefing.href} className="fx-briefing-collapsed" title={briefing.primary}>
            {briefing.kind === 'overdue'
              ? <AlertCircle style={{ width: 16, height: 16, color: '#F87171' }} strokeWidth={2} />
              : <Sparkles    style={{ width: 16, height: 16, color: 'oklch(85% 0.14 150)' }} strokeWidth={2} />}
          </Link>
        )}

        {/* Footer */}
        <footer className="fx-footer">
          {/* Settings */}
          <div
            ref={el => { itemRefs.current['settings'] = el }}
            onMouseEnter={() => setHoveredId('settings')}
            onMouseLeave={() => setHoveredId(null)}
          >
            <NavItem href="/settings" label="Settings" Icon={Settings} active={isActive('/settings')} collapsed={collapsed} />
          </div>

          <div className="fx-footer-divider" aria-hidden />

          {/* Profile */}
          <div ref={profileRef} className={`fx-profile${profileOpen ? ' is-open' : ''}`}>
            <button className="fx-profile-main" onClick={() => setProfileOpen(o => !o)} aria-expanded={profileOpen}>
              <span className="fx-avatar">
                <span className="fx-avatar-ring" aria-hidden="true" />
                <span className="fx-avatar-img">{initials}</span>
                <span className="fx-presence" aria-hidden="true"><span className="fx-presence-pulse" /></span>
              </span>
              {!collapsed && (
                <>
                  <span className="fx-profile-text">
                    <span className="fx-profile-name">{userHandle}</span>
                    <span className="fx-profile-meta">
                      <span className="fx-plan">Free plan</span>
                    </span>
                  </span>
                  <span className="fx-profile-chev" style={{ transform: `rotate(${profileOpen ? 90 : -90}deg)`, display: 'grid', placeItems: 'center' }}>
                    <ChevronLeft style={{ width: 13, height: 13 }} />
                  </span>
                </>
              )}
            </button>
            {!collapsed && profileOpen && (
              <div className="fx-profile-pop" role="menu">
                <div className="fx-profile-pop-head">
                  <span className="fx-profile-pop-avatar">{initials}</span>
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <span className="fx-profile-pop-name">{userHandle}</span>
                    <span className="fx-profile-pop-email">{userEmail ?? '—'}</span>
                  </span>
                </div>
                <Link href="/settings" onClick={() => setProfileOpen(false)} className="fx-profile-action">
                  <UserCircle style={{ width: 14, height: 14 }} strokeWidth={1.75} />
                  <span>Account</span>
                </Link>
                <Link href="/settings?tab=billing" onClick={() => setProfileOpen(false)} className="fx-profile-action">
                  <CreditCard style={{ width: 14, height: 14 }} strokeWidth={1.75} />
                  <span>Billing & plan</span>
                  <span className="fx-profile-action-tag">Free</span>
                </Link>
                <Link href="/settings?tab=help" onClick={() => setProfileOpen(false)} className="fx-profile-action">
                  <LifeBuoy style={{ width: 14, height: 14 }} strokeWidth={1.75} />
                  <span>Help & support</span>
                </Link>
                <div className="fx-profile-pop-divider" />
                <button className="fx-profile-action fx-profile-action-danger" onClick={handleSignOut}>
                  <LogOut style={{ width: 14, height: 14 }} strokeWidth={1.75} />
                  <span>Sign out</span>
                </button>
              </div>
            )}
          </div>
        </footer>
      </aside>

      {/* ════════════════════ DESKTOP TOP BAR ════════════════════════ */}
      <header
        className="hidden lg:flex fx-topbar"
        data-scrolled={scrolled ? 'true' : 'false'}
        style={{
          position: 'fixed', top: 0,
          left: 'var(--sidebar-w, 244px)', right: 0,
          height: 56, zIndex: 50,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>
            {pageTitle}
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Notification bell */}
          <div ref={notifRef} style={{ position: 'relative' }}>
            <button
              onClick={() => { setNotifOpen(o => !o); setNotifSeen(true) }}
              className="fx-topbar-icon"
              title="Activity"
            >
              <Bell style={{ width: 15, height: 15, color: unreadCount > 0 ? '#0F172A' : '#6B6E78' }} strokeWidth={1.75} />
              {unreadCount > 0 && (
                <span className="fx-topbar-icon-badge">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {notifOpen && (
              <NotificationPanel
                notifications={notifications}
                onDismiss={id => dismissNotif(id)}
                onSuppress={id => suppressNotif(id)}
                onClose={() => setNotifOpen(false)}
              />
            )}
          </div>

          {/* Context-aware CTA */}
          {cta && (
            <Link href={cta.href} className="fx-topbar-cta">
              {cta.label}
            </Link>
          )}
        </div>
      </header>

      {/* ════════════════════ MOBILE TOP BAR ═════════════════════════ */}
      <header
        className="flex lg:hidden fx-mobile-topbar"
        data-scrolled={scrolled ? 'true' : 'false'}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setMobileOpen(true)} className="fx-mobile-iconbtn" aria-label="Open navigation">
            <Menu style={{ width: 18, height: 18, color: '#0F172A' }} strokeWidth={1.75} />
          </button>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em' }}>{pageTitle}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setCmdOpen(true)} className="fx-mobile-iconbtn" aria-label="Search">
            <Search style={{ width: 16, height: 16, color: '#3F4350' }} strokeWidth={1.75} />
          </button>
          {cta && (
            <Link href={cta.href} className="fx-topbar-cta fx-topbar-cta-sm">
              {cta.label}
            </Link>
          )}
        </div>
      </header>

      {/* ════════════════════ MOBILE DRAWER ══════════════════════════ */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fx-mobile-backdrop" onClick={() => setMobileOpen(false)} />
          <div className="fx-mobile-drawer">
            <div className="fx-mobile-head">
              <div className="fx-brand" style={{ pointerEvents: 'none' }}>
                <span className="fx-mark">
                  <span className="fx-mark-shape"><span className="fx-mark-dot" /></span>
                </span>
                <span className="fx-brand-text">
                  <span className="fx-wordmark">Freelax</span>
                  <span className="fx-year-chip">26/27</span>
                </span>
              </div>
              <button onClick={() => setMobileOpen(false)} className="fx-collapse" aria-label="Close">
                <X style={{ width: 14, height: 14 }} strokeWidth={2} />
              </button>
            </div>

            <button className="fx-search" onClick={() => { setMobileOpen(false); setCmdOpen(true) }} aria-label="Search">
              <Search style={{ width: 13, height: 13 }} strokeWidth={1.75} />
              <span className="fx-search-label">Search or jump to…</span>
            </button>

            <div className="fx-nav" style={{ position: 'relative' }}>
              {NAV_GROUPS.map(group => {
                const groupCount = sectionCounts[group.label] ?? 0
                return (
                  <div key={group.label} className="fx-section-group">
                    <div className="fx-section">
                      <span className="fx-section-rail" aria-hidden="true" />
                      <span className="fx-section-label">{group.label}</span>
                      {groupCount > 0 && <span className="fx-section-count">{groupCount}</span>}
                    </div>
                    <div className="fx-items">
                      {group.items.map(({ id, href, label, icon: Icon }) => (
                        <NavItem
                          key={id}
                          href={href}
                          label={label}
                          Icon={Icon}
                          active={isActive(href)}
                          collapsed={false}
                          badgeCount={id === 'invoices' && overdueCount > 0 ? overdueCount : undefined}
                          onClose={() => setMobileOpen(false)}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            <Link href={briefing.href} onClick={() => setMobileOpen(false)} className={`fx-briefing fx-briefing-${briefing.kind}`}>
              <span className="fx-briefing-icon">
                {briefing.kind === 'overdue'  && <AlertCircle style={{ width: 14, height: 14 }} strokeWidth={2} />}
                {briefing.kind === 'progress' && <Sparkles style={{ width: 14, height: 14 }} strokeWidth={2} />}
                {briefing.kind === 'calm'     && <CheckCircle2 style={{ width: 14, height: 14 }} strokeWidth={2} />}
              </span>
              <span className="fx-briefing-text">
                <span className="fx-briefing-title">{briefing.primary}</span>
                <span className="fx-briefing-sub">{briefing.secondary}</span>
              </span>
            </Link>

            <footer className="fx-footer">
              <NavItem href="/settings" label="Settings" Icon={Settings} active={isActive('/settings')} collapsed={false} onClose={() => setMobileOpen(false)} />
              <div className="fx-footer-divider" aria-hidden />
              <div className="fx-profile">
                <button className="fx-profile-main" onClick={handleSignOut} title="Sign out">
                  <span className="fx-avatar">
                    <span className="fx-avatar-ring" aria-hidden="true" />
                    <span className="fx-avatar-img">{initials}</span>
                    <span className="fx-presence" aria-hidden="true"><span className="fx-presence-pulse" /></span>
                  </span>
                  <span className="fx-profile-text">
                    <span className="fx-profile-name">{userHandle}</span>
                    <span className="fx-profile-meta"><span className="fx-plan">Free plan · sign out</span></span>
                  </span>
                  <LogOut style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.45)' }} strokeWidth={1.75} />
                </button>
              </div>
            </footer>
          </div>
        </div>
      )}

      <CommandMenu open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </>
  )
}
