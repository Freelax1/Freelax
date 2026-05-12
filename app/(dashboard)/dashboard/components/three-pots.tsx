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
  fontSize: 11, fontWeight: 500, color: '#475569',
  textTransform: 'uppercase', letterSpacing: '0.12em',
  marginBottom: 12,
}
const HERO_STYLE: React.CSSProperties = {
  fontSize: 'clamp(28px, 5vw, 40px)', fontWeight: 700, color: '#0F172A',
  letterSpacing: '-0.02em', lineHeight: 1,
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontVariantNumeric: 'tabular-nums',
}
const SUB_STYLE: React.CSSProperties = {
  fontSize: 12, color: '#475569', marginTop: 8, lineHeight: 1.5,
}
const CARD: React.CSSProperties = {
  borderRadius: 14, padding: '32px 32px 28px',
  border: '1px solid rgba(0,0,0,0.06)',
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
    <div style={{ height: 5, background: 'rgba(0,0,0,0.06)', borderRadius: 99, overflow: 'hidden', marginTop: 14 }}>
      <div style={{
        height: '100%', borderRadius: 99, background: color,
        width: `${width}%`,
        transition: 'width 800ms cubic-bezier(0.22,1,0.36,1)',
      }} />
    </div>
  )
}

// Info tooltip for Safe to Spend
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
      {/* ⓘ button */}
      <button
        onClick={() => setOpen(o => !o)}
        onMouseEnter={() => setOpen(true)}
        style={{
          width: 18, height: 18,
          borderRadius: '50%',
          border: `1.5px solid ${open ? '#1D6B35' : 'rgba(0,0,0,0.12)'}`,
          background: open ? '#F0FDF4' : 'transparent',
          color: open ? '#1D6B35' : '#94A3B8',
          fontSize: 10, fontWeight: 700,
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 150ms cubic-bezier(0.22,1,0.36,1)',
          flexShrink: 0,
          lineHeight: 1,
          padding: 0,
        }}
        aria-label="How is Safe to Spend calculated?"
      >
        i
      </button>

      {/* Tooltip panel */}
      {open && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 10px)',
            right: 0,
            width: 264,
            background: '#0F172A',
            borderRadius: 12,
            padding: '16px 18px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
            zIndex: 50,
            animation: 'tooltipIn 150ms cubic-bezier(0.22,1,0.36,1)',
          }}
        >
          <style>{`@keyframes tooltipIn { from { opacity:0; transform:translateY(4px) } to { opacity:1; transform:translateY(0) } }`}</style>

          {/* Arrow */}
          <div style={{
            position: 'absolute', bottom: -6, right: 7,
            width: 12, height: 12,
            background: '#0F172A',
            transform: 'rotate(45deg)',
            borderRadius: 2,
          }} />

          <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
            How this is calculated
          </p>

          {[
            {
              label: 'Net income this month',
              value: '+',
              color: '#4ADE80',
              note: 'Your typical monthly net profit (income minus expenses)',
            },
            {
              label: 'Tax still to save',
              value: '−',
              color: '#F87171',
              note: 'Remaining tax liability ÷ months until January deadline',
            },
            {
              label: 'Personal outgoings',
              value: '−',
              color: '#F87171',
              note: 'Rent, food, bills — your cost of living each month',
            },
          ].map((row, i) => (
            <div key={i} style={{
              display: 'flex', gap: 10, alignItems: 'flex-start',
              paddingTop: i > 0 ? 10 : 0,
              borderTop: i > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none',
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: row.color, flexShrink: 0, marginTop: 5 }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 12, fontWeight: 500, color: '#fff' }}>{row.label}</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2, lineHeight: 1.4 }}>{row.note}</p>
              </div>
            </div>
          ))}

          <div style={{
            marginTop: 12, paddingTop: 12,
            borderTop: '1px solid rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#60A5FA', flexShrink: 0 }} />
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>
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
  const barColor = onTrack ? '#1D6B35' : taxPct > 60 ? '#9A7B0A' : '#C0392B'

  const showInfo = !isNewUser && !safeToSpendMissingInput && safeToSpend !== null

  return (
    <div className="fd-cards-grid">

      {/* Pot 1 — Earned this year */}
      <div style={{ ...CARD, background: '#F5F4EE', flex: 1 }}>
        <p style={LABEL_STYLE}>Earned this year</p>
        <p style={HERO_STYLE}>{isNewUser ? '—' : formatCurrency(earnedThisYear)}</p>
        <p style={SUB_STYLE}>
          {isNewUser ? "As you log invoices and they're paid, your total earnings for the year will appear here." : 'Income minus expenses · across the tax year'}
        </p>
      </div>

      {/* Pot 2 — Tax set aside */}
      <Link href="/tax" style={{ textDecoration: 'none', flex: 1 }}>
        <div style={{ ...CARD, background: '#fff', cursor: 'pointer', height: '100%' }}>
          <p style={LABEL_STYLE}>Tax set aside</p>
          <p style={HERO_STYLE}>{isNewUser ? '—' : formatCurrency(taxSetAside)}</p>
          {!isNewUser && (
            <>
              <p style={{ fontSize: 13, color: '#64748B', marginTop: 6 }}>
                of {formatCurrency(taxTarget)} needed by {taxDeadline.label}
              </p>
              <ProgressBar pct={taxPct} color={barColor} />
              <p style={{ fontSize: 11, marginTop: 8, color: onTrack ? '#1D6B35' : '#9A7B0A', fontWeight: 500 }}>
                {onTrack ? '✓ On track for January' : `Save ${formatCurrency(weeklySaveNeeded)}/week to stay on track`}
              </p>
            </>
          )}
          {isNewUser && <p style={SUB_STYLE}>We'll calculate exactly what to save for your January tax bill as you earn. Start by sending an invoice.</p>}
        </div>
      </Link>

      {/* Pot 3 — Safe to spend */}
      <div style={{ ...CARD, background: '#fff', flex: 1, position: 'relative' }}>
        {/* Header row: label + info icon */}
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
            <p style={{ ...HERO_STYLE, fontSize: 22, lineHeight: 1.3, color: '#0F172A' }}>Set up needed</p>
            <p style={{ ...SUB_STYLE, marginTop: 8 }}>
              Tell us your monthly personal outgoings (rent, food, bills) and we'll show you what's truly safe to spend.{' '}
              <span style={{ color: '#1D6B35', fontWeight: 500 }}>Set it up →</span>
            </p>
          </Link>
        ) : safeToSpend !== null && safeToSpend <= 0 ? (
          <>
            <p style={{ ...HERO_STYLE, color: '#C0392B' }}>{formatCurrency(0)}</p>
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
