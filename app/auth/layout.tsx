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
      className="auth-right flex-[0_0_40%] bg-cover bg-center bg-brand-primary"
      style={{
        backgroundImage:
          "linear-gradient(rgba(15, 46, 36, 0.88), rgba(15, 46, 36, 0.92)), url('/right-panel-bg.png')",
      }}
    >
      <div className="relative z-[1] h-screen flex flex-col justify-center overflow-y-hidden pt-20 px-10 pb-6">
        <div className="w-full mt-8 max-w-[420px]">
          <div
            className="text-lg font-semibold text-white leading-tight mb-3 min-h-11 tracking-tight transition-opacity duration-slow ease-in-out"
            style={{ opacity: taglineVisible ? 1 : 0 }}
          >
            {taglines[taglineIdx]}
          </div>

          <p className="text-sm text-white/70 leading-normal mb-4 -mt-1">
            Freelax shows your real income after tax — so you&apos;re never surprised again.
          </p>

          <div className="flex gap-2 flex-wrap mb-3.5">
            {['✓ Real-time tax calculations', '✓ IR35 status clarity', '✓ Self Assessment ready'].map(pill => (
              <div
                key={pill}
                className="rounded-lg px-2.5 py-1 text-micro font-semibold text-white/90 bg-white/10 border border-white/15"
              >
                {pill}
              </div>
            ))}
          </div>

          <img
            src="/dashboard-mockup.svg"
            alt="Freelax dashboard preview"
            className="w-full max-w-[360px] max-h-[200px] object-cover object-top rounded-xl mb-6 shadow-overlay ring-1 ring-white/10"
          />

          <div className="flex items-center">
            {['A', 'J', 'S'].map((initial, i) => (
              <div
                key={i}
                className="w-6 h-6 rounded-full bg-brand-primary flex items-center justify-center text-micro font-semibold relative -mr-1.5 text-white border-2 border-forest-800"
                style={{ zIndex: 3 - i }}
              >
                {initial}
              </div>
            ))}
            <span className="text-caption text-white/60 ml-4">
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
  const isSplitPanel =
    pathname === '/auth/login' ||
    pathname === '/auth/signup' ||
    pathname === '/auth/forgot-password' ||
    pathname === '/auth/reset-password'

  if (!isSplitPanel) {
    return <div className="font-sans">{children}</div>
  }

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .auth-right { display: none !important; }
          .auth-left {
            flex: none !important;
            width: 100% !important;
            min-height: 100dvh !important;
            height: auto !important;
            justify-content: flex-start !important;
            padding-top: 48px !important;
            padding-bottom: 48px !important;
            overflow-y: auto !important;
          }
          .auth-wordmark-desktop { display: none !important; }
          .auth-wordmark-mobile { display: block !important; }
        }
        @media (min-width: 769px) {
          .auth-wordmark-mobile { display: none !important; }
          .auth-wordmark-desktop { display: block !important; }
        }
      `}</style>

      <div className="min-h-screen md:h-screen md:overflow-hidden flex flex-col md:flex-row relative bg-surface-sunken">
        <div className="auth-left min-h-screen md:h-screen flex-[0_0_60%] flex flex-col items-center md:overflow-y-auto pt-24 md:pt-16 px-8 pb-12 bg-surface-sunken">
          <div className="w-full max-w-[420px] flex flex-col flex-1 justify-center md:justify-center md:pt-8">
            <AuthWordmark variant="desktop" />

            <div key={pathname} className="animate-auth-in">
              {children}
            </div>

            <p className="text-center text-xs mt-7 mb-1 leading-relaxed text-text-muted">
              Built in the UK · Your data is encrypted and never sold.
            </p>
            <p className="text-center text-xs m-0 text-text-muted">
              <Link href="/security" className="no-underline text-text-secondary hover:text-text-primary">
                Security
              </Link>
              {' · '}
              <Link href="/privacy" className="no-underline text-text-secondary hover:text-text-primary">
                Privacy
              </Link>
              {' · '}
              <Link href="/terms" className="no-underline text-text-secondary hover:text-text-primary">
                Terms
              </Link>
            </p>
            <p className="text-center text-caption mt-1.5 mb-0 leading-normal text-text-muted">
              We use strictly necessary cookies to keep you signed in. No tracking or advertising cookies.{' '}
              <Link href="/privacy#cookies" className="underline text-text-secondary hover:text-text-primary">
                Learn more
              </Link>
            </p>
          </div>
        </div>

        <RightPanel />
      </div>
    </>
  )
}
