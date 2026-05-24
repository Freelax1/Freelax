'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { AuthWordmark } from '@/components/auth-ui'

const taglines = [
  "Know exactly what you owe. Instantly.",
  "Your financial co-pilot.",
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
      className="auth-right flex-[0_0_40%] bg-cover bg-center"
      style={{ backgroundImage: "url('/left-panel-bg.png')" }}
    >
      <div className="relative z-[1] h-screen flex flex-col justify-center overflow-y-hidden pt-20 px-10 pb-6">
        <div className="w-full mt-8 max-w-[420px]">
          <div
            className="text-lg font-semibold text-text-primary leading-tight mb-3 min-h-11 tracking-tight transition-opacity duration-[400ms] ease-[ease]"
            style={{ opacity: taglineVisible ? 1 : 0 }}
          >
            {taglines[taglineIdx]}
          </div>

          <p className="text-sm text-text-secondary leading-normal mb-4 -mt-1">
            Freelax shows your real income after tax — so you&apos;re never surprised again.
          </p>

          <div className="flex gap-2 flex-wrap mb-3.5">
            {['✓ Real-time tax calculations', '✓ IR35 status clarity', '✓ Self Assessment ready'].map(pill => (
              <div key={pill} className="bg-surface-card border-[0.5px] border-border-default rounded-lg px-2.5 py-1 text-micro font-semibold text-brand-primary">{pill}</div>
            ))}
          </div>

          <img
            src="/dashboard-mockup.svg"
            alt="Freelax dashboard preview"
            className="w-full max-w-[360px] max-h-[200px] object-cover object-top rounded-xl opacity-[0.92] mb-6 shadow-overlay"
          />

          <div className="flex items-center">
            {['A', 'J', 'S'].map((initial, i) => (
              <div key={i} className="w-6 h-6 rounded-full bg-brand-primary flex items-center justify-center text-micro font-semibold relative -mr-1.5 text-text-on-dark border-2 border-cream-100" style={{ zIndex: 3 - i }}>{initial}</div>
            ))}
            <span className="text-caption text-text-secondary ml-4">
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
      <div className="font-sans">
        {children}
      </div>
    )
  }

  return (
    <>
      <style>{`
        .auth-left input::placeholder { color: rgba(255,255,255,0.35) !important; }
        @media (max-width: 768px) {
          .auth-right { display: none !important; }
          .auth-left { flex: none !important; width: 100% !important; min-height: 100dvh !important; height: auto !important; justify-content: flex-start !important; padding-top: 48px !important; padding-bottom: 48px !important; overflow-y: auto !important; }
          .auth-wordmark-desktop { display: none !important; }
          .auth-wordmark-mobile { display: block !important; }
        }
        @media (min-width: 769px) {
          .auth-wordmark-mobile { display: none !important; }
          .auth-wordmark-desktop { display: block !important; }
        }
      `}</style>

      <div className="min-h-screen md:h-screen md:overflow-hidden flex flex-col md:flex-row relative">

        <div
          className="auth-left min-h-screen md:h-screen flex-[0_0_60%] flex flex-col items-center md:overflow-y-auto pt-24 md:pt-16 px-8 pb-12 bg-cover bg-center"
          style={{ backgroundImage: "linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url('/right-panel-bg.png')" }}
        >
          <div className="w-full max-w-[420px] flex flex-col flex-1 justify-center md:justify-center md:pt-8">
            <AuthWordmark variant="desktop" />

            <div key={pathname} className="animate-auth-in">
              {children}
            </div>

            <p className="text-center text-xs mt-7 mb-1 leading-relaxed text-white/35">
              Built in the UK · Your data is encrypted and never sold.
            </p>
            <p className="text-center text-xs m-0 text-white/35">
              <Link href="/security" className="no-underline text-white/50">Security</Link>
              {' · '}
              <Link href="/privacy" className="no-underline text-white/50">Privacy</Link>
              {' · '}
              <Link href="/terms" className="no-underline text-white/50">Terms</Link>
            </p>
            <p className="text-center text-caption mt-1.5 mb-0 leading-normal text-white/25">
              We use strictly necessary cookies to keep you signed in. No tracking or advertising cookies.{' '}
              <Link href="/privacy#cookies" className="underline text-white/35">Learn more</Link>
            </p>
          </div>
        </div>

        <RightPanel />
      </div>
    </>
  )
}
