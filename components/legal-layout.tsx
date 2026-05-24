import Link from 'next/link'
import { ArrowRight } from '@phosphor-icons/react/dist/ssr'
import { createClient } from '@/lib/supabase/server'

interface TocItem { id: string; label: string }

interface Props {
  title:       string
  eyebrow?:    string
  subtitle?:   string
  updated:     string
  toc?:        TocItem[]
  hero?:       React.ReactNode
  children:    React.ReactNode
}

export default async function LegalLayout({
  title, eyebrow, subtitle, updated, toc, hero, children,
}: Props) {
  let signedIn = false
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    signedIn = !!session?.user
  } catch {
    signedIn = false
  }
  const ctaHref  = signedIn ? '/dashboard' : '/auth/login'
  const ctaLabel = signedIn ? 'Dashboard'  : 'Sign in'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-paper)', color: 'var(--text-primary)' }}>

      {/* Top header */}
      <header className="sticky top-0 z-sticky border-b border-border-subtle" style={{
        background: 'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}>
        <div className="flex items-center justify-between gap-4 py-3.5 px-6" style={{
          maxWidth: 1200, margin: '0 auto',
        }}>
          <Link href="/" style={{
            fontSize: 'var(--text-xl)', fontWeight: 600, color: 'var(--text-primary)',
            textDecoration: 'none', letterSpacing: '-0.03em', fontFamily: 'var(--font-serif)',
          }}>
            Freelax<span style={{ color: 'var(--brand-primary)' }}>.</span>
          </Link>

          <nav className="flex items-center gap-6">
            <Link href="/security" className="fd-legal-link" style={{
              fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 500,
            }}>Security</Link>
            <Link href="/privacy" className="fd-legal-link" style={{
              fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 500,
            }}>Privacy</Link>
            <Link href="/terms" className="fd-legal-link" style={{
              fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 500,
            }}>Terms</Link>
            <Link href={ctaHref} className="inline-flex items-center gap-1.5 py-2 px-3.5 rounded" style={{
              fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-on-dark)',
              background: 'var(--brand-primary)',
              textDecoration: 'none',
            }}>
              {ctaLabel} <ArrowRight weight="regular" className="w-3 h-3" />
            </Link>
          </nav>
        </div>
      </header>

      {/* Page container */}
      <main className="mx-auto pt-14 px-6 pb-24" style={{ maxWidth: 1200 }}>

        {/* Title block */}
        <div style={{ marginBottom: hero ? 40 : 56, maxWidth: 780 }}>
          {eyebrow && (
            <p className="mb-3" style={{ fontSize: 'var(--text-caption)', fontWeight: 600, color: 'var(--brand-primary)' }}>
              {eyebrow}
            </p>
          )}
          <h1 className="m-0" style={{
            fontSize: 'clamp(32px, 5vw, 44px)',
            fontWeight: 600, color: 'var(--text-primary)',
            letterSpacing: '-0.03em', lineHeight: 1.1,
            fontFamily: 'var(--font-serif)',
          }}>
            {title}
          </h1>
          {subtitle && (
            <p className="mt-4 mb-0" style={{
              fontSize: 'var(--text-lg)', color: 'var(--text-secondary)',
              lineHeight: 1.55, maxWidth: 640,
            }}>
              {subtitle}
            </p>
          )}
          <p className="mt-4 mb-0" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
            Last updated {updated}
          </p>
        </div>

        {hero}

        {/* Content + sticky TOC */}
        <div className="fd-legal-grid gap-12" style={{
          display: 'grid',
          gridTemplateColumns: toc ? '240px 1fr' : '1fr',
          alignItems: 'start',
          marginTop: hero ? 56 : 0,
        }}>
          {toc && (
            <aside className="fd-legal-toc sticky top-20">
              <p className="mb-3" style={{ fontSize: 'var(--text-micro)', fontWeight: 600, color: 'var(--text-muted)' }}>
                On this page
              </p>
              <ul className="list-none p-0 m-0 flex flex-col gap-0.5" style={{
                borderLeft: '1px solid var(--border-subtle)',
              }}>
                {toc.map(t => (
                  <li key={t.id}>
                    <a
                      href={`#${t.id}`}
                      className="block py-1.5 px-3.5 -ml-px leading-body transition-colors duration-fast"
                      style={{
                        fontSize: 'var(--text-sm)', color: 'var(--text-secondary)',
                        textDecoration: 'none',
                        borderLeft: '2px solid transparent',
                      }}
                    >
                      {t.label}
                    </a>
                  </li>
                ))}
              </ul>
            </aside>
          )}
          <div style={{ maxWidth: 720, minWidth: 0 }}>
            {children}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mx-auto px-6 pb-24" style={{ maxWidth: 1200 }}>
        <div className="mt-20 pt-7 border-t border-border-subtle flex flex-wrap items-center justify-between gap-4">
          <p className="m-0" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            Built in the UK · Your data is encrypted and never sold.
          </p>
          <div className="flex gap-5 flex-wrap">
            <Link href="/security" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', textDecoration: 'none' }}>Security</Link>
            <Link href="/privacy"  style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', textDecoration: 'none' }}>Privacy</Link>
            <Link href="/terms"    style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', textDecoration: 'none' }}>Terms</Link>
            <a href="mailto:support@freelax.co.uk" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', textDecoration: 'none' }}>Contact</a>
          </div>
        </div>
      </footer>

      <style>{`
        .fd-legal-link:hover { color: var(--text-primary) !important; }
        .fd-legal-toc a:hover { color: var(--text-primary) !important; border-left-color: var(--brand-primary) !important; }

        @media (max-width: 900px) {
          .fd-legal-grid { grid-template-columns: 1fr !important; }
          .fd-legal-toc { display: none; }
        }

        html { scroll-behavior: smooth; scroll-padding-top: 80px; }
      `}</style>
    </div>
  )
}
