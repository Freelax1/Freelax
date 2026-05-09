'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

const taglines = [
  "Know exactly what you owe. Instantly.",
  "See your real income after tax.",
  "Your business finances. Finally clear.",
]

function RightPanel() {
  const [taglineIdx, setTaglineIdx] = useState(0)
  const [taglineVisible, setTaglineVisible] = useState(true)
  useEffect(() => {
    const interval = setInterval(() => {
      setTaglineVisible(false)
      setTimeout(() => {
        setTaglineIdx(i => (i + 1) % taglines.length)
        setTaglineVisible(true)
      }, 400)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div
      className="auth-right"
      style={{
        flex: '0 0 40%',
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
        overflowY: 'hidden',
        backgroundImage: "url('/left-panel-bg.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div style={{
        position: 'relative',
        zIndex: 1,
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        overflowY: 'hidden',
        padding: '80px 40px 24px',
      }}>
        <div style={{ width: '100%', maxWidth: 420, marginTop: 32 }}>
          <div style={{
            fontSize: 17,
            fontWeight: 800,
            color: '#0F172A',
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
            marginBottom: 12,
            opacity: taglineVisible ? 1 : 0,
            transition: 'opacity 400ms ease',
            minHeight: 44,
          }}>
            {taglines[taglineIdx]}
          </div>

          <p style={{
            fontSize: 13,
            color: '#64748B',
            lineHeight: 1.5,
            marginBottom: 16,
            marginTop: -4,
          }}>
            Freelax shows your real income after tax — so you're never surprised again.
          </p>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            {['✓ Real-time tax calculations', '✓ IR35 status clarity', '✓ Self Assessment ready'].map(pill => (
              <div key={pill} style={{
                background: '#fff',
                border: '0.5px solid #E2E8F0',
                borderRadius: 20,
                padding: '4px 10px',
                fontSize: 10,
                fontWeight: 600,
                color: '#1D6B35',
              }}>{pill}</div>
            ))}
          </div>

          <img
            src="/dashboard-mockup.svg"
            alt="Freelax dashboard preview"
            style={{
              width: '100%',
              maxWidth: 360,
              maxHeight: 200,
              objectFit: 'cover',
              objectPosition: 'top',
              borderRadius: 12,
              opacity: 0.92,
              marginBottom: 24,
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            }}
          />

          <div style={{
            background: '#fff',
            borderRadius: 12,
            border: '0.5px solid #E2E8F0',
            padding: '14px 16px',
            marginBottom: 14,
          }}>
            <p style={{ fontSize: 10, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
              Built for UK freelancers
            </p>
            {[
              { icon: '⚡', text: 'Real-time tax bill — updated every time you log income or expenses' },
              { icon: '🧾', text: 'Send professional invoices in under 60 seconds' },
              { icon: '📊', text: "Safe to Spend — know exactly what's yours after tax each month" },
              { icon: '🔒', text: 'Bank-grade encryption · UK GDPR compliant · Never sold' },
            ].map(({ icon, text }) => (
              <div key={text} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 8 }}>
                <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>{icon}</span>
                <p style={{ fontSize: 11, color: '#334155', lineHeight: 1.5 }}>{text}</p>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            {['A', 'J', 'S'].map((initial, i) => (
              <div key={i} style={{
                width: 24, height: 24, borderRadius: '50%',
                background: '#1D6B35',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700, color: '#fff',
                marginRight: -6,
                border: '2px solid #f0ede4',
                zIndex: 3 - i,
                position: 'relative',
              }}>{initial}</div>
            ))}
            <span style={{ fontSize: 11, color: '#64748B', marginLeft: 18 }}>
              Join UK freelancers who actually know their tax bill
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isSplitPanel = pathname === '/auth/login' || pathname === '/auth/signup' || pathname === '/auth/forgot-password' || pathname === '/auth/reset-password'

  if (!isSplitPanel) {
    return (
      <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        {children}
      </div>
    )
  }

  return (
    <>
      <style>{`
        @keyframes fd-spin { to { transform: rotate(360deg) } }
        @keyframes auth-form-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .auth-left input::placeholder { color: rgba(255,255,255,0.35) !important; }
        @media (max-width: 768px) {
          .auth-right { display: none !important; }
          .auth-left { flex: none !important; width: 100% !important; justify-content: center !important; padding-bottom: 48px !important; }
          .auth-split-wordmark { display: none !important; }
          .auth-wordmark-mobile { display: block !important; }
        }
        @media (min-width: 769px) {
          .auth-wordmark-mobile { display: none !important; }
          .auth-split-wordmark { display: flex !important; }
        }
      `}</style>

      <div style={{ height: '100vh', overflow: 'hidden', display: 'flex', position: 'relative' }}>

        <div
          className="auth-split-wordmark"
          style={{
            position: 'absolute',
            top: 48,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'flex-start',
            paddingLeft: 'calc(60% - 124px)',
            alignItems: 'baseline',
            zIndex: 10,
            pointerEvents: 'none',
            fontSize: 64,
            fontWeight: 800,
            letterSpacing: '-0.03em',
            lineHeight: 1,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
        >
          <span style={{ color: '#FFFFFF' }}>Free</span>
          <span style={{ color: '#0F172A' }}>lax</span>
          <span style={{ color: '#1D6B35' }}>.</span>
        </div>

        <div className="auth-left" style={{
          flex: '0 0 60%',
          height: '100vh',
          backgroundImage: "linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url('/right-panel-bg.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '140px 32px 48px',
        }}>
          <div style={{ width: '100%', maxWidth: 420 }}>
            <div key={pathname} style={{ animation: 'auth-form-in 220ms ease' }}>
              {children}
            </div>

            <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 28, marginBottom: 4, lineHeight: 1.7 }}>
              Built in the UK · Your data is encrypted and never sold.
            </p>
            <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: 0 }}>
              <Link href="/security" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Security</Link>
              {' · '}
              <Link href="/privacy" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Privacy</Link>
              {' · '}
              <Link href="/terms" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Terms</Link>
            </p>
            <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.25)', margin: '6px 0 0', lineHeight: 1.5 }}>
              We use strictly necessary cookies to keep you signed in. No tracking or advertising cookies.{' '}
              <Link href="/privacy#cookies" style={{ color: 'rgba(255,255,255,0.35)', textDecoration: 'underline' }}>Learn more</Link>
            </p>
          </div>
        </div>

        <RightPanel />
      </div>
    </>
  )
}
