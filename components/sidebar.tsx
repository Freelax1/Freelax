'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import {
  List, X, Bell, MagnifyingGlass, Gear, SignOut, Question, ArrowUp,
  House, Calculator, FileText, ClipboardText, Receipt,
  Users, FolderOpen,
} from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import CommandMenu from '@/components/command-menu'
import SettingsModal from '@/components/settings-modal'
import { buildNotifications, READ_KEY } from '@/lib/notifications'
import type { Notification } from '@/lib/notifications'

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

function fmt(n: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n)
}

// ── Nav groups ─────────────────────────────────────────────────────────

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: House },
      { href: '/tax',       label: 'Tax',       icon: Calculator },
    ],
  },
  {
    label: 'Money',
    items: [
      { href: '/invoices', label: 'Invoices', icon: FileText },
      { href: '/quotes',   label: 'Quotes',   icon: ClipboardText },
      { href: '/expenses', label: 'Expenses', icon: Receipt },
    ],
  },
  {
    label: 'Work',
    items: [
      { href: '/clients',  label: 'Clients',  icon: Users },
      { href: '/projects', label: 'Projects', icon: FolderOpen },
    ],
  },
]

// ── Notification system ────────────────────────────────────────────────


function useNotifications(invoices: NavInvoice[], quotes: NavQuote[], projects: NavProject[]) {
  const [readIds,   setReadIds]   = useState<Set<string>>(new Set())
  const [hasLoaded, setHasLoaded] = useState(false)

  useEffect(() => {
    try {
      setReadIds(new Set(JSON.parse(localStorage.getItem(READ_KEY) ?? '[]')))
    } catch {}
    setHasLoaded(true)

    // re-sync when user returns from the notifications page
    function onFocus() {
      try { setReadIds(new Set(JSON.parse(localStorage.getItem(READ_KEY) ?? '[]'))) } catch {}
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  const all      = buildNotifications(invoices, quotes, projects)
  const visible  = hasLoaded ? all : []
  const unreadCount = hasLoaded ? all.filter(n => !readIds.has(n.id)).length : 0

  return { visible, unreadCount }
}

// ── Notification panel ─────────────────────────────────────────────────


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

// ── Main component ─────────────────────────────────────────────────────

const SIDEBAR_W = 240

export default function Sidebar() {
  const pathname = usePathname()
  const router   = useRouter()

  const [mobileOpen,   setMobileOpen]   = useState(false)
  const [navData,      setNavData]      = useState<NavData>({ invoices: [], quotes: [], clients: [], projects: [], expenses: [], ir35: [] })
  const [userEmail,    setUserEmail]    = useState<string | null>(null)
  const [userName,     setUserName]     = useState<string | null>(null)
  const [userPlan,     setUserPlan]     = useState<string | null>(null)
  const [cmdOpen,       setCmdOpen]      = useState(false)
  const [headerHidden,  setHeaderHidden] = useState(false)
  const [profileOpen,      setProfileOpen]      = useState(false)
  const [settingsOpen,     setSettingsOpen]     = useState(false)
  const [settingsInitialTab, setSettingsInitialTab] = useState<import('@/components/settings/shared').SettingsTab | undefined>(undefined)
  const lastScrollY  = useRef(0)
  const profileRef   = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) setUserEmail(user.email)
      if (user?.id) {
        const { data: profile } = await supabase.from('users').select('full_name, subscription_plan').eq('id', user.id).single()
        if (profile?.full_name) setUserName(profile.full_name)
        if (profile?.subscription_plan) setUserPlan(profile.subscription_plan)
      }
      setNavData(await fetchNavData())
    }
    load()
  }, [])

  useEffect(() => {
    async function refresh() { setNavData(await fetchNavData()) }
    window.addEventListener('focus', refresh)
    window.addEventListener('fd:data-invalidate', refresh as EventListener)
    return () => {
      window.removeEventListener('focus', refresh)
      window.removeEventListener('fd:data-invalidate', refresh as EventListener)
    }
  }, [])

  useEffect(() => {
    function onScroll() {
      const y = window.scrollY
      setHeaderHidden(y > lastScrollY.current && y > 60)
      lastScrollY.current = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setCmdOpen(true) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const { visible: notifications, unreadCount } = useNotifications(
    navData.invoices, navData.quotes, navData.projects
  )

  const checklistSteps = [true, navData.clients.length > 0, navData.invoices.length > 0, navData.expenses.length > 0, navData.projects.length > 0]
  const completedSteps = checklistSteps.filter(Boolean).length
  const checklistDone  = completedSteps >= 5

  function openSettings(tab?: import('@/components/settings/shared').SettingsTab) {
    setSettingsInitialTab(tab)
    setSettingsOpen(true)
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  const displayName = userName || userEmail
  const initial     = displayName ? displayName[0].toUpperCase() : '?'

  // ── Shared sidebar content ─────────────────────────────────────────

  function SidebarContent({ onNavClick }: { onNavClick?: () => void }) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

        {/* Logo + search */}
        <div className="pt-5 px-3.5 pb-3.5 shrink-0">
          <div className="mb-3.5">
            <span style={{ fontSize: 'var(--text-xl)', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: 'var(--tracking-tighter, -0.03em)', fontFamily: 'var(--font-serif)' }}>
              Freelax
            </span>
          </div>
          <button
            onClick={() => { setCmdOpen(true); onNavClick?.() }}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 12px', borderRadius: 'var(--radius-full)',
              background: 'transparent', border: '1px solid var(--border-default)',
              color: 'var(--text-muted)', cursor: 'pointer', fontSize: 'var(--text-xs)',
              fontFamily: 'var(--font-sans)', transition: 'background 150ms',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-sunken)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <MagnifyingGlass weight="regular" style={{ width: 13, height: 13, flexShrink: 0 }} />
            <span style={{ flex: 1, textAlign: 'left' }}>Search…</span>
            <kbd className="rounded-sm" style={{ fontSize: 'var(--text-micro)', padding: '1px 5px', background: 'var(--surface-card)', border: '1px solid var(--border-default)', color: 'var(--text-muted)' }} suppressHydrationWarning>
              {typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘K' : 'Ctrl+K'}
            </kbd>
          </button>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto px-2">
          {NAV_GROUPS.map((group, idx) => (
            <div key={group.label} className="mb-1">
              <p style={{
                fontSize: 'var(--text-caption)', fontWeight: 600, color: 'var(--text-muted)',
                padding: idx === 0 ? '4px 8px 4px' : '14px 8px 4px',
              }}>
                {group.label}
              </p>
              {group.items.map(({ href, label, icon: Icon }) => {
                const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={onNavClick}
                    className="mb-px"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '7px 10px', borderRadius: 'var(--radius-xl)',
                      textDecoration: 'none',
                      background: active ? 'var(--surface-sunken)' : 'transparent',
                      color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontWeight: active ? 600 : 400,
                      fontSize: 'var(--text-sm)', transition: 'background 100ms, color 100ms',
                    }}
                    onMouseEnter={e => { if (!active) (e.currentTarget as HTMLAnchorElement).style.background = 'var(--surface-sunken)' }}
                    onMouseLeave={e => { if (!active) (e.currentTarget as HTMLAnchorElement).style.background = 'transparent' }}
                  >
                    <Icon weight="regular" style={{ width: 17, height: 17, flexShrink: 0, color: active ? 'var(--brand-primary)' : 'var(--text-muted)' }} />
                    <span className="flex-1">{label}</span>
                    {active && <div className="rounded-full shrink-0" style={{ width: 5, height: 5, background: 'var(--brand-primary)' }} />}
                  </Link>
                )
              })}
            </div>
          ))}

          {/* Onboarding checklist progress */}
          {!checklistDone && (
            <div className="pt-1 pb-2">
              <Link href="/dashboard#getting-started" onClick={onNavClick} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 10px', borderRadius: 'var(--radius-xl)',
                background: 'var(--surface-sunken)', border: '1px solid var(--border-default)',
                textDecoration: 'none',
              }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Getting started</span>
                <span className="rounded-full" style={{ fontSize: 'var(--text-micro)', fontWeight: 600, background: 'var(--brand-primary)', color: 'var(--text-on-dark)', padding: '1px 7px' }}>
                  {completedSteps}/5
                </span>
              </Link>
            </div>
          )}
        </nav>

        {/* Bottom: settings, notifications, user */}
        <div className="shrink-0 border-t border-border-default px-2 pt-2 pb-2.5">
          <Link
            href="/notifications"
            onClick={onNavClick}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 10px', borderRadius: 'var(--radius-xl)',
              textDecoration: 'none',
              color: pathname.startsWith('/notifications') ? 'var(--text-primary)' : 'var(--text-secondary)',
              background: pathname.startsWith('/notifications') ? 'var(--surface-sunken)' : 'transparent',
              fontSize: 'var(--text-sm)', transition: 'background 100ms',
            }}
            onMouseEnter={e => { if (!pathname.startsWith('/notifications')) (e.currentTarget as HTMLAnchorElement).style.background = 'var(--surface-sunken)' }}
            onMouseLeave={e => { if (!pathname.startsWith('/notifications')) (e.currentTarget as HTMLAnchorElement).style.background = 'transparent' }}
          >
            <Bell weight="regular" style={{ width: 17, height: 17, color: pathname.startsWith('/notifications') ? 'var(--brand-primary)' : 'var(--text-muted)', flexShrink: 0 }} />
            <span style={{ flex: 1 }}>Notifications</span>
            {unreadCount > 0 && (
              <span className="rounded-full" style={{ fontSize: 'var(--text-micro)', fontWeight: 600, background: 'var(--danger-500)', color: 'var(--text-on-dark)', padding: '1px 6px' }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>

          {/* Profile row + menu */}
          <div ref={profileRef} style={{ position: 'relative' }}>
            {profileOpen && (
              <div className="rounded-lg shadow-overlay" style={{
                position: 'absolute', bottom: 'calc(100% + 8px)', left: 0, right: 0,
                background: 'var(--surface-card)', border: '1px solid var(--border-default)',
                overflow: 'hidden', zIndex: 100,
              }}>
                {/* Email header */}
                <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid var(--border-subtle)' }}>
                  <p style={{ fontSize: 'var(--text-caption)', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {userEmail ?? '…'}
                  </p>
                </div>
                {/* Upgrade plan — only for free/solo */}
                {(userPlan === 'free' || userPlan === 'solo' || !userPlan) && (
                  <button
                    onClick={() => { setProfileOpen(false); openSettings('Billing'); onNavClick?.() }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--brand-primary)', fontSize: 'var(--text-sm)', fontFamily: 'var(--font-sans)',
                      fontWeight: 500, transition: 'background 80ms',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-sunken)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <ArrowUp weight="regular" style={{ width: 15, height: 15, flexShrink: 0 }} />
                    Upgrade plan
                  </button>
                )}

                {/* Settings — opens modal */}
                <button
                  onClick={() => { setProfileOpen(false); openSettings(); onNavClick?.() }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', fontFamily: 'var(--font-sans)',
                    transition: 'background 80ms',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-sunken)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <Gear weight="regular" style={{ width: 15, height: 15, color: 'var(--text-muted)', flexShrink: 0 }} />
                  Settings
                </button>

                {/* Get help — external link */}
                <Link
                  href="mailto:support@freelax.app"
                  onClick={() => { setProfileOpen(false); onNavClick?.() }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 14px', textDecoration: 'none',
                    color: 'var(--text-secondary)', fontSize: 'var(--text-sm)',
                    transition: 'background 80ms',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-sunken)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <Question weight="regular" style={{ width: 15, height: 15, color: 'var(--text-muted)', flexShrink: 0 }} />
                  Get help
                </Link>
                <div className="border-t border-border-subtle my-1" />
                <button
                  onClick={() => { setProfileOpen(false); handleSignOut() }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--danger-500)', fontSize: 'var(--text-sm)', fontFamily: 'var(--font-sans)',
                    transition: 'background 80ms',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-sunken)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <SignOut weight="regular" style={{ width: 15, height: 15, flexShrink: 0 }} />
                  Log out
                </button>
              </div>
            )}

            {/* Trigger row */}
            <button
              onClick={() => setProfileOpen(o => !o)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '6px 10px', borderRadius: 'var(--radius-xl)',
                background: profileOpen ? 'var(--surface-sunken)' : 'transparent',
                border: 'none', cursor: 'pointer', transition: 'background 100ms',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-sunken)')}
              onMouseLeave={e => (e.currentTarget.style.background = profileOpen ? 'var(--surface-sunken)' : 'transparent')}
            >
              <div className="rounded-full shrink-0" style={{
                width: 28, height: 28,
                background: 'var(--brand-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 'var(--text-caption)', fontWeight: 600, color: 'var(--text-on-dark)',
              }}>
                {initial}
              </div>
              <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500, lineHeight: 1.3 }}>
                  {userName ?? userEmail ?? '…'}
                </div>
                {userPlan && (
                  <div className="mt-0.5" style={{ fontSize: 'var(--text-micro)', color: 'var(--text-muted)', textTransform: 'capitalize', lineHeight: 1 }}>
                    {userPlan} plan
                  </div>
                )}
              </div>
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* ── Desktop sidebar ──────────────────────────────────────────── */}
      <aside
        className="hidden lg:flex rounded-xl"
        style={{
          position: 'fixed', top: 12, left: 12, bottom: 12,
          width: SIDEBAR_W, flexDirection: 'column',
          background: 'rgba(255,255,255,0.78)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          border: '1px solid rgba(0,0,0,0.07)',
          boxShadow: '0 4px 32px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
          zIndex: 40,
          overflow: 'hidden',
        }}
      >
        <SidebarContent />
      </aside>

      {/* ── Mobile top bar ───────────────────────────────────────────── */}
      <header
        className="flex items-center lg:hidden"
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, height: 52, zIndex: 40,
          background: 'rgba(255,255,255,0.82)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderBottom: '1px solid rgba(0,0,0,0.07)',
          padding: '0 16px', gap: 12,
          transform: headerHidden ? 'translateY(-100%)' : 'translateY(0)',
          transition: 'transform 280ms cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        <button onClick={() => setMobileOpen(true)} aria-label="Open menu" className="p-1 flex" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
          <List weight="regular" className="w-5 h-5" />
        </button>
        <span style={{ flex: 1, fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: 'var(--tracking-tighter, -0.03em)', fontFamily: 'var(--font-serif)' }}>
          Freelax
        </span>
        <button onClick={() => setCmdOpen(true)} aria-label="Search" className="p-1 flex" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
          <MagnifyingGlass weight="regular" style={{ width: 18, height: 18 }} />
        </button>
        <Link
          href="/notifications"
          className="p-1 flex relative"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
        >
          <Bell weight="regular" style={{ width: 18, height: 18 }} />
          {unreadCount > 0 && (
            <span className="absolute rounded-full" style={{ top: 2, right: 2, width: 7, height: 7, background: 'var(--danger-500)', border: '1px solid var(--surface-card)' }} />
          )}
        </Link>
      </header>

      {/* ── Mobile drawer ────────────────────────────────────────────── */}
      {mobileOpen && (
        <div className="lg:hidden" style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
          <div
            className="absolute inset-0 bg-black/[0.35]"
            onClick={() => setMobileOpen(false)}
          />
          <aside style={{
            position: 'absolute', top: 0, left: 0, bottom: 0,
            width: SIDEBAR_W, background: 'var(--surface-card)',
            borderRight: '1px solid var(--border-default)',
            display: 'flex', flexDirection: 'column',
          }}>
            <div className="flex items-center justify-between pt-4 px-4 shrink-0">
              <span style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: 'var(--tracking-tighter, -0.03em)', fontFamily: 'var(--font-serif)' }}>Freelax</span>
              <button onClick={() => setMobileOpen(false)} aria-label="Close menu" className="p-1 flex" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X weight="regular" style={{ width: 18, height: 18 }} />
              </button>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <SidebarContent onNavClick={() => setMobileOpen(false)} />
            </div>
          </aside>
        </div>
      )}

      <CommandMenu open={cmdOpen} onClose={() => setCmdOpen(false)} />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} initialTab={settingsInitialTab} />
    </>
  )
}
