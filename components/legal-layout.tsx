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
      <header style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderBottom: '1px solid var(--border-subtle)',
      }}>
        <div style={{
          maxWidth: 1200, margin: '0 auto',
          padding: '14px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 16,
        }}>
          <Link href="/" style={{
            fontSize: 'var(--text-xl)', fontWeight: 600, color: 'var(--text-primary)',
            textDecoration: 'none', letterSpacing: '-0.03em', fontFamily: 'var(--font-serif)',
          }}>
            Freelax<span style={{ color: 'var(--brand-primary)' }}>.</span>
          </Link>

          <nav style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <Link href="/security" className="fd-legal-link" style={{
              fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 500,
            }}>Security</Link>
            <Link href="/privacy" className="fd-legal-link" style={{
              fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 500,
            }}>Privacy</Link>
            <Link href="/terms" className="fd-legal-link" style={{
              fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 500,
            }}>Terms</Link>
            <Link href={ctaHref} style={{
              fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-on-dark)',
              background: 'var(--brand-primary)', padding: '8px 14px', borderRadius: 8,
              textDecoration: 'none',
              display: 'inline-flex', alignItems: 'center', gap: 5,
            }}>
              {ctaLabel} <ArrowRight weight="regular" style={{ width: 12, height: 12 }} />
            </Link>
          </nav>
        </div>
      </header>

      {/* Page container */}
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '56px 24px 96px' }}>

        {/* Title block */}
        <div style={{ marginBottom: hero ? 40 : 56, maxWidth: 780 }}>
          {eyebrow && (
            <p style={{ fontSize: 'var(--text-caption)', fontWeight: 600, color: 'var(--brand-primary)', margin: '0 0 12px' }}>
              {eyebrow}
            </p>
          )}
          <h1 style={{
            fontSize: 'clamp(32px, 5vw, 44px)',
            fontWeight: 600, color: 'var(--text-primary)',
            letterSpacing: '-0.03em', lineHeight: 1.1,
            margin: 0, fontFamily: 'var(--font-serif)',
          }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{
              fontSize: 'var(--text-lg)', color: 'var(--text-secondary)',
              lineHeight: 1.55, marginTop: 16, marginBottom: 0, maxWidth: 640,
            }}>
              {subtitle}
            </p>
          )}
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: 16, marginBottom: 0 }}>
            Last updated {updated}
          </p>
        </div>

        {hero}

        {/* Content + sticky TOC */}
        <div className="fd-legal-grid" style={{
          display: 'grid',
          gridTemplateColumns: toc ? '240px 1fr' : '1fr',
          gap: 48,
          alignItems: 'start',
          marginTop: hero ? 56 : 0,
        }}>
          {toc && (
            <aside className="fd-legal-toc" style={{ position: 'sticky', top: 80 }}>
              <p style={{ fontSize: 'var(--text-micro)', fontWeight: 600, color: 'var(--text-muted)', margin: '0 0 12px' }}>
                On this page
              </p>
              <ul style={{
                listStyle: 'none', padding: 0, margin: 0,
                display: 'flex', flexDirection: 'column', gap: 2,
                borderLeft: '1px solid var(--border-subtle)',
              }}>
                {toc.map(t => (
                  <li key={t.id}>
                    <a
                      href={`#${t.id}`}
                      style={{
                        display: 'block',
                        fontSize: 'var(--text-sm)', color: 'var(--text-secondary)',
                        textDecoration: 'none', lineHeight: 1.5,
                        padding: '6px 14px',
                        marginLeft: -1,
                        borderLeft: '2px solid transparent',
                        transition: 'color 120ms, border-color 120ms',
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
      <footer style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 96px' }}>
        <div style={{
          marginTop: 80, paddingTop: 28,
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex', flexWrap: 'wrap',
          alignItems: 'center', justifyContent: 'space-between',
          gap: 16,
        }}>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: 0 }}>
            Built in the UK · Your data is encrypted and never sold.
          </p>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
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
