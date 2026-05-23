'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, ClipboardText, CurrencyDollar, Users, FolderOpen, ArrowRight, Calculator, GearSix } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

const COMMANDS = [
  { id: 'new-invoice',  label: 'New invoice',   sub: 'Create a new invoice',      href: '/invoices/new',  icon: FileText,      shortcut: 'N' },
  { id: 'new-quote',    label: 'New quote',      sub: 'Create a new quote',        href: '/quotes/new',    icon: ClipboardText, shortcut: null },
  { id: 'log-expense',  label: 'Log an expense', sub: 'Record a business expense', href: '/expenses',      icon: CurrencyDollar,    shortcut: 'E' },
  { id: 'new-client',   label: 'New client',     sub: 'Add a client',              href: '/clients/new',   icon: Users,         shortcut: null },
  { id: 'new-project',  label: 'New project',    sub: 'Start a project',           href: '/projects/new',  icon: FolderOpen,    shortcut: null },
  { id: 'tax-page',     label: 'Go to tax page', sub: 'View your tax summary',     href: '/tax',           icon: Calculator,    shortcut: 'T' },
  { id: 'settings',     label: 'Settings',       sub: 'Manage your account',       href: '/settings',      icon: GearSix,      shortcut: null },
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
      className="fixed inset-0 z-command flex items-start justify-center pt-[15vh] bg-black/35 backdrop-blur-[2px] animate-cmd-fade"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-lg w-full max-w-[520px] overflow-hidden border border-black/[0.08] shadow-modal animate-cmd-slide"
      >
        {/* Search input */}
        <div className="px-4 py-3.5 flex items-center gap-2.5 border-b border-b-black/[0.06]">
          <ArrowRight weight="regular" className="w-[14px] h-[14px] shrink-0 text-text-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setCursor(0) }}
            placeholder="What do you want to do?"
            className="flex-1 border-none outline-none text-base bg-transparent text-text-primary font-sans"
          />
          <kbd className="text-micro rounded px-1.5 py-px text-text-muted bg-black/[0.04]">Esc</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[340px] overflow-y-auto py-1.5">
          {filtered.length === 0 && (
            <p className="px-4 py-3.5 text-sm text-text-secondary">No results for "{query}"</p>
          )}
          {filtered.map((cmd, i) => {
            const Icon = cmd.icon
            return (
              <button key={cmd.id} onClick={() => go(cmd.href)}
                className={cn('w-full text-left border-none px-4 py-2.5 cursor-pointer flex items-center gap-3 transition-colors', i === cursor ? 'bg-surface-sunken' : 'bg-transparent')}
                onMouseEnter={() => setCursor(i)}
              >
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border border-black/[0.06]', i === cursor ? 'bg-white' : 'bg-surface-sunken')}>
                  <Icon weight="regular" className="w-[14px] h-[14px] text-text-secondary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-text-primary">{cmd.label}</p>
                  <p className="text-caption text-text-secondary">{cmd.sub}</p>
                </div>
                {cmd.shortcut && (
                  <kbd className="text-micro rounded px-1.5 py-px shrink-0 text-text-muted bg-black/[0.04]">{cmd.shortcut}</kbd>
                )}
              </button>
            )
          })}
        </div>

        <div className="px-4 py-2 flex gap-4 border-t border-t-black/[0.06]">
          {[['↑↓', 'Navigate'], ['↵', 'Open'], ['Esc', 'Close']].map(([k, v]) => (
            <div key={k} className="flex items-center gap-1">
              <kbd className="text-micro rounded-sm px-1 py-px text-text-muted bg-black/[0.04]">{k}</kbd>
              <span className="text-micro text-text-muted">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
