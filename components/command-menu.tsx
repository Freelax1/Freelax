'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, ClipboardList, DollarSign, Users, FolderOpen, ArrowRight, Calculator, Settings } from 'lucide-react'

const COMMANDS = [
  { id: 'new-invoice',  label: 'New invoice',   sub: 'Create a new invoice',      href: '/invoices/new',  icon: FileText,      shortcut: 'N' },
  { id: 'new-quote',    label: 'New quote',      sub: 'Create a new quote',        href: '/quotes/new',    icon: ClipboardList, shortcut: null },
  { id: 'log-expense',  label: 'Log an expense', sub: 'Record a business expense', href: '/expenses',      icon: DollarSign,    shortcut: 'E' },
  { id: 'new-client',   label: 'New client',     sub: 'Add a client',              href: '/clients/new',   icon: Users,         shortcut: null },
  { id: 'new-project',  label: 'New project',    sub: 'Start a project',           href: '/projects/new',  icon: FolderOpen,    shortcut: null },
  { id: 'tax-page',     label: 'Go to tax page', sub: 'View your tax summary',     href: '/tax',           icon: Calculator,    shortcut: 'T' },
  { id: 'settings',     label: 'Settings',       sub: 'Manage your account',       href: '/settings',      icon: Settings,      shortcut: null },
]

interface Props { open: boolean; onClose: () => void }

export default function CommandMenu({ open, onClose }: Props) {
  const [query, setQuery]   = useState('')
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router   = useRouter()

  const filtered = COMMANDS.filter(c =>
    c.label.toLowerCase().includes(query.toLowerCase()) ||
    c.sub.toLowerCase().includes(query.toLowerCase())
  )

  useEffect(() => { if (open) { setQuery(''); setCursor(0); setTimeout(() => inputRef.current?.focus(), 30) } }, [open])

  function go(href: string) { router.push(href); onClose() }

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape')     { onClose(); return }
      if (e.key === 'ArrowDown')  { e.preventDefault(); setCursor(c => Math.min(c + 1, filtered.length - 1)) }
      if (e.key === 'ArrowUp')    { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)) }
      if (e.key === 'Enter')      { if (filtered[cursor]) go(filtered[cursor].href) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, cursor, filtered])

  if (!open) return null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '15vh',
        animation: 'cmdFadeIn 150ms cubic-bezier(0.22,1,0.36,1)',
      }}
    >
      <style>{`@keyframes cmdFadeIn { from { opacity:0 } to { opacity:1 } }`}</style>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 14, width: '100%', maxWidth: 520,
          border: '1px solid rgba(0,0,0,0.08)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
          overflow: 'hidden',
          animation: 'cmdSlideIn 150ms cubic-bezier(0.22,1,0.36,1)',
        }}
      >
        <style>{`@keyframes cmdSlideIn { from { transform:translateY(-8px);opacity:0 } to { transform:translateY(0);opacity:1 } }`}</style>

        {/* Search input */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <ArrowRight style={{ width: 14, height: 14, color: '#CBD5E1', flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setCursor(0) }}
            placeholder="What do you want to do?"
            style={{
              flex: 1, border: 'none', outline: 'none', fontSize: 15,
              color: '#1E293B', background: 'transparent',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          />
          <kbd style={{ fontSize: 10, color: '#CBD5E1', background: 'rgba(0,0,0,0.04)', borderRadius: 4, padding: '2px 6px' }}>Esc</kbd>
        </div>

        {/* Results */}
        <div style={{ maxHeight: 340, overflowY: 'auto', padding: '6px 0' }}>
          {filtered.length === 0 && (
            <p style={{ padding: '14px 16px', fontSize: 13, color: '#475569' }}>No results for "{query}"</p>
          )}
          {filtered.map((cmd, i) => {
            const Icon = cmd.icon
            return (
              <button key={cmd.id} onClick={() => go(cmd.href)}
                style={{
                  width: '100%', textAlign: 'left', background: i === cursor ? '#F8FAFC' : 'transparent',
                  border: 'none', padding: '10px 16px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 12,
                  transition: 'background 150ms',
                }}
                onMouseEnter={() => setCursor(i)}
              >
                <div style={{ width: 32, height: 32, borderRadius: 8, background: i === cursor ? '#fff' : '#F8FAFC', border: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon style={{ width: 14, height: 14, color: '#64748B' }} strokeWidth={1.75} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, color: '#1E293B' }}>{cmd.label}</p>
                  <p style={{ fontSize: 11, color: '#475569' }}>{cmd.sub}</p>
                </div>
                {cmd.shortcut && (
                  <kbd style={{ fontSize: 10, color: '#CBD5E1', background: 'rgba(0,0,0,0.04)', borderRadius: 4, padding: '2px 6px', flexShrink: 0 }}>{cmd.shortcut}</kbd>
                )}
              </button>
            )
          })}
        </div>

        <div style={{ padding: '8px 16px', borderTop: '1px solid rgba(0,0,0,0.06)', display: 'flex', gap: 16 }}>
          {[['↑↓', 'Navigate'], ['↵', 'Open'], ['Esc', 'Close']].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <kbd style={{ fontSize: 9, color: '#CBD5E1', background: 'rgba(0,0,0,0.04)', borderRadius: 3, padding: '1px 4px' }}>{k}</kbd>
              <span style={{ fontSize: 10, color: '#CBD5E1' }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
