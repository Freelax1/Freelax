'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/tax-calculations'

interface Props {
  earnedThisYear:   number
  taxSetAside:      number
  taxTarget:        number
  taxDeadline:      { days: number; label: string }
  safeToSpend:              number | null
  safeToSpendMissingInput:  boolean
  monthlyAvg:       number
  weeklySaveNeeded: number
  isNewUser?:       boolean
}

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)',
  textTransform: 'uppercase', letterSpacing: '0.12em',
  marginBottom: 12,
}
const HERO_STYLE: React.CSSProperties = {
  fontSize: 'clamp(28px, 5vw, 40px)', fontWeight: 400, color: 'var(--text-primary)',
  letterSpacing: '-0.025em', lineHeight: 1,
  fontFamily: 'var(--font-serif)',
  fontVariantNumeric: 'tabular-nums',
}
const SUB_STYLE: React.CSSProperties = {
  fontSize: 12, color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.5,
}
const CARD: React.CSSProperties = {
  borderRadius: 'var(--radius-lg)', padding: '32px 32px 28px',
  border: '1px solid var(--border-subtle)',
  display: 'flex', flexDirection: 'column', gap: 0,
  flex: 1,
}

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), 80)
    return () => clearTimeout(t)
  }, [pct])
  return (
    <div style={{ height: 5, background: 'var(--border-subtle)', borderRadius: 'var(--radius-full)', overflow: 'hidden', marginTop: 14 }}>
      <div style={{
        height: '100%', borderRadius: 'var(--radius-full)', background: color,
        width: `${width}%`,
        transition: 'width 800ms cubic-bezier(0.22,1,0.36,1)',
      }} />
    </div>
  )
}

function SafeToSpendInfo({ safeToSpend, monthlyAvg }: { safeToSpend: number | null; monthlyAvg: number }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        onClick={() => setOpen(o => !o)}
        onMouseEnter={() => setOpen(true)}
        style={{
          width: 18, height: 18,
          borderRadius: '50%',
          border: `1.5px solid ${open ? 'var(--border-focus)' : 'var(--border-default)'}`,
          background: open ? 'var(--forest-50)' : 'transparent',
          color: open ? 'var(--brand-primary)' : 'var(--text-secondary)',
          fontSize: 10, fontWeight: 700,
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 150ms var(--ease-out)',
          flexShrink: 0, lineHeight: 1, padding: 0,
        }}
        aria-label="How is Safe to Spend calculated?"
      >
        i
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          bottom: 'calc(100% + 10px)',
          right: 0,
          width: 264,
          background: 'var(--forest-900)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px 18px',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 50,
          animation: 'tooltipIn 150ms var(--ease-out)',
        }}>
          <style>{`@keyframes tooltipIn { from { opacity:0; transform:translateY(4px) } to { opacity:1; transform:translateY(0) } }`}</style>

          <div style={{
            position: 'absolute', bottom: -6, right: 7,
            width: 12, height: 12,
            background: 'var(--forest-900)',
            transform: 'rotate(45deg)',
            borderRadius: 2,
          }} />

          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--forest-300)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
            How this is calculated
          </p>

          {[
            { label: 'Net income this month',  value: '+', color: 'var(--success-500)', note: 'Your typical monthly net profit (income minus expenses)' },
            { label: 'Tax still to save',      value: '−', color: 'var(--danger-500)',  note: 'Remaining tax liability ÷ months until January deadline' },
            { label: 'Personal outgoings',     value: '−', color: 'var(--danger-500)',  note: 'Rent, food, bills — your cost of living each month' },
          ].map((row, i) => (
            <div key={i} style={{
              display: 'flex', gap: 10, alignItems: 'flex-start',
              paddingTop: i > 0 ? 10 : 0,
              borderTop: i > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none',
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: row.color, flexShrink: 0, marginTop: 5 }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-on-dark)' }}>{row.label}</p>
                <p style={{ fontSize: 11, color: 'var(--forest-300)', marginTop: 2, lineHeight: 1.4 }}>{row.note}</p>
              </div>
            </div>
          ))}

          <div style={{
            marginTop: 12, paddingTop: 12,
            borderTop: '1px solid rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--forest-400)', flexShrink: 0 }} />
            <p style={{ fontSize: 11, color: 'var(--forest-400)', lineHeight: 1.4 }}>
              = What's genuinely yours to spend this month
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ThreePots({
  earnedThisYear, taxSetAside, taxTarget, taxDeadline,
  safeToSpend, safeToSpendMissingInput, monthlyAvg, weeklySaveNeeded, isNewUser,
}: Props) {
  const taxPct   = taxTarget > 0 ? Math.min(100, Math.round((taxSetAside / taxTarget) * 100)) : 100
  const onTrack  = taxPct >= 100
  const barColor = onTrack
    ? 'var(--success-500)'
    : taxPct > 60
      ? 'var(--warning-500)'
      : 'var(--danger-500)'

  const showInfo = !isNewUser && !safeToSpendMissingInput && safeToSpend !== null

  return (
    <div className="fd-cards-grid">

      {/* Pot 1 — Earned this year */}
      <div style={{ ...CARD, background: 'var(--surface-sunken)', flex: 1 }}>
        <p style={LABEL_STYLE}>Earned this year</p>
        <p style={HERO_STYLE}>{isNewUser ? '—' : formatCurrency(earnedThisYear)}</p>
        <p style={SUB_STYLE}>
          {isNewUser
            ? "As you log invoices and they're paid, your total earnings for the year will appear here."
            : 'Income minus expenses · across the tax year'}
        </p>
      </div>

      {/* Pot 2 — Tax set aside */}
      <Link href="/tax" style={{ textDecoration: 'none', flex: 1 }}>
        <div style={{ ...CARD, background: 'var(--surface-card)', cursor: 'pointer', height: '100%' }}>
          <p style={LABEL_STYLE}>Tax set aside</p>
          <p style={HERO_STYLE}>{isNewUser ? '—' : formatCurrency(taxSetAside)}</p>
          {!isNewUser && (
            <>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6 }}>
                of {formatCurrency(taxTarget)} needed by {taxDeadline.label}
              </p>
              <ProgressBar pct={taxPct} color={barColor} />
              <p style={{ fontSize: 11, marginTop: 8, color: onTrack ? 'var(--success-700)' : 'var(--warning-700)', fontWeight: 500 }}>
                {onTrack ? '✓ On track for January' : `Save ${formatCurrency(weeklySaveNeeded)}/week to stay on track`}
              </p>
            </>
          )}
          {isNewUser && (
            <p style={SUB_STYLE}>We'll calculate exactly what to save for your January tax bill as you earn. Start by sending an invoice.</p>
          )}
        </div>
      </Link>

      {/* Pot 3 — Safe to spend */}
      <div style={{ ...CARD, background: 'var(--surface-card)', flex: 1, position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <p style={{ ...LABEL_STYLE, marginBottom: 0 }}>Safe to spend</p>
          {showInfo && <SafeToSpendInfo safeToSpend={safeToSpend} monthlyAvg={monthlyAvg} />}
        </div>

        {isNewUser ? (
          <>
            <p style={HERO_STYLE}>—</p>
            <p style={SUB_STYLE}>Once you've logged some income and told us your typical monthly outgoings, we'll show what's genuinely safe to spend each month.</p>
          </>
        ) : safeToSpendMissingInput ? (
          <Link href="/settings?tab=Personal%20tax%20inputs" style={{ textDecoration: 'none' }}>
            <p style={{ ...HERO_STYLE, fontSize: 22, lineHeight: 1.3 }}>Set up needed</p>
            <p style={{ ...SUB_STYLE, marginTop: 8 }}>
              Tell us your monthly personal outgoings (rent, food, bills) and we'll show you what's truly safe to spend.{' '}
              <span style={{ color: 'var(--brand-primary)', fontWeight: 500 }}>Set it up →</span>
            </p>
          </Link>
        ) : safeToSpend !== null && safeToSpend <= 0 ? (
          <>
            <p style={{ ...HERO_STYLE, color: 'var(--danger-500)' }}>{formatCurrency(0)}</p>
            <p style={SUB_STYLE}>Spending is tight this month — hold off on big purchases.</p>
          </>
        ) : (
          <>
            <p style={HERO_STYLE}>{formatCurrency(safeToSpend ?? 0)}</p>
            <p style={SUB_STYLE}>After tax and your typical monthly outgoings — what's genuinely available to spend this month.</p>
          </>
        )}
      </div>

    </div>
  )
}
