'use client'
import { useEffect, useState } from 'react'

interface Props {
  actionCount:  number
  hasOverdue:   boolean
  taxProgress:  number
  isNewUser:    boolean
  taxTotal:     number
}

type State = 'onboarding' | 'clear' | 'nudge' | 'behind'

function getStatus(p: Props): { text: string; state: State } | null {
  if (p.isNewUser)
    return { text: "Welcome. Let's get you set up.", state: 'onboarding' }
  if (p.actionCount >= 2)
    return null
  if (p.hasOverdue || p.actionCount === 1)
    return { text: "Ticking along nicely — one thing waiting just below.", state: 'nudge' }
  if (p.taxProgress < 0.5 && p.taxTotal > 0)
    return { text: "Tax is a bit behind. Nothing you can't catch up on.", state: 'behind' }
  return { text: "You're in good shape. Nothing urgent today.", state: 'clear' }
}

function WeatherGlyph({ state }: { state: State }) {
  const green  = 'var(--success-500)'
  const amber  = 'var(--warning-500)'
  const red    = 'var(--danger-500)'

  // ── Sun (clear / onboarding) ──────────────────────────────────────
  if (state === 'clear' || state === 'onboarding') {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
        <circle cx="8" cy="8" r="3" stroke={green} strokeWidth="1.5" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map(deg => {
          const r = (Math.PI * deg) / 180
          const x1 = 8 + Math.cos(r) * 5
          const y1 = 8 + Math.sin(r) * 5
          const x2 = 8 + Math.cos(r) * 7
          const y2 = 8 + Math.sin(r) * 7
          return <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} stroke={green} strokeWidth="1.5" strokeLinecap="round" />
        })}
      </svg>
    )
  }

  // ── Cloud (nudge / watch / behind) — default for non-clear states ─────
  const color = state === 'behind' ? red : amber
  return (
    <svg width="18" height="13" viewBox="0 0 18 13" fill="none" className="shrink-0">
      <path
        d="M3.5 11 C1.5 11 1 9.5 1 8.5 C1 7 2 6 3.5 6 C3.5 4 5 2.5 7 2.5 C8.5 2.5 9.7 3.4 10.2 4.7 C10.6 4.5 11 4.4 11.5 4.4 C13.4 4.4 15 6 15 7.9 C15 9.7 13.6 11 11.8 11 Z"
        stroke={color}
        strokeWidth="1.3"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="14" cy="2.5" r="1.5" stroke={color} strokeWidth="1.1" />
      <line x1="14" y1="0.2" x2="14" y2="0.8" stroke={color} strokeWidth="1.1" strokeLinecap="round" />
      <line x1="15.9" y1="1.1" x2="15.5" y2="1.5" stroke={color} strokeWidth="1.1" strokeLinecap="round" />
      <line x1="16.5" y1="2.8" x2="15.9" y2="2.8" stroke={color} strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  )
}

// Soft brand-green chevron-down that nudges the eye toward the Do-this-now card.
// Clickable — smoothly scrolls to the action section right below.
function NudgeChevron() {
  function handleClick() {
    // Scroll to the first element below the status line (the Do-this-now card,
    // or the three-pots if no actions). Finds by querying parent siblings.
    if (typeof window !== 'undefined') {
      const root = document.querySelector('[data-fd-status-line]')
      const next = root?.parentElement?.nextElementSibling as HTMLElement | null
      if (next) {
        next.scrollIntoView({ behavior: 'smooth', block: 'start' })
      } else {
        window.scrollBy({ top: 200, behavior: 'smooth' })
      }
    }
  }
  return (
    <button
      onClick={handleClick}
      aria-label="Scroll to the action below"
      className="bg-transparent border-none cursor-pointer inline-flex items-center justify-center p-1 ml-1 text-brand-primary rounded-full transition-[background] duration-[120ms]"
      style={{ animation: 'fd-chevron-nudge 1.8s ease-in-out infinite' }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--forest-50)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="block">
        <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <style>{`
        @keyframes fd-chevron-nudge {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(3px); }
        }
        @media (prefers-reduced-motion: reduce) {
          button[aria-label="Scroll to the action below"] { animation: none !important; }
        }
      `}</style>
    </button>
  )
}

export default function StatusLine(props: Props) {
  const [visible, setVisible] = useState(false)
  const status = getStatus(props)
  if (!status) return null

  const { text, state } = status

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60)
    return () => clearTimeout(t)
  }, [])

  return (
    <div data-fd-status-line className="pt-1" style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(4px)',
      transition: 'opacity 200ms cubic-bezier(0.22,1,0.36,1), transform 200ms cubic-bezier(0.22,1,0.36,1)',
    }}>
      <div className="flex items-center gap-2 flex-wrap">
        <WeatherGlyph state={state} />
        <h2 className="font-semibold text-text-primary inline-flex items-center gap-1 text-lg font-sans tracking-tight leading-snug m-0">
          {text}
          {state === 'nudge' && <NudgeChevron />}
        </h2>
      </div>
    </div>
  )
}
