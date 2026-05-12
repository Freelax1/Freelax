import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
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
  // Auth-aware CTA — signed-in users see "Dashboard", signed-out see "Sign in".
  // Use getSession() (local cookie read) not getUser() (network call + cookie refresh)
  // so we don't trigger a cookie write from a Server Component.
  let signedIn = false
  try {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    signedIn = !!session?.user
  } catch {
    signedIn = false
  }
  const ctaHref  = signedIn ? '/dashboard' : '/auth/login'
  const ctaLabel = signedIn ? 'Dashboard'  : 'Sign in'
  return (
    <div style={{
      minHeight: '100vh',
      background: '#FAFAF7',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      color: '#0F172A',
    }}>
      {/* Top header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'rgba(250,250,247,0.88)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
      }}>
        <div style={{
          maxWidth: 1200, margin: '0 auto',
          padding: '14px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 16,
        }}>
          <Link href="/" style={{
            fontSize: 20, fontWeight: 800, color: '#0F172A',
            textDecoration: 'none', letterSpacing: '-0.03em',
          }}>
            Freelax<span style={{ color: '#1D6B35' }}>.</span>
          </Link>

          <nav style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <Link href="/security" className="fd-legal-link" style={{
              fontSize: 13.5, color: '#475569', textDecoration: 'none', fontWeight: 500,
            }}>Security</Link>
            <Link href="/privacy" className="fd-legal-link" style={{
              fontSize: 13.5, color: '#475569', textDecoration: 'none', fontWeight: 500,
            }}>Privacy</Link>
            <Link href="/terms" className="fd-legal-link" style={{
              fontSize: 13.5, color: '#475569', textDecoration: 'none', fontWeight: 500,
            }}>Terms</Link>
            <Link href={ctaHref} style={{
              fontSize: 13, fontWeight: 600, color: '#fff',
              background: '#0F172A', padding: '8px 14px', borderRadius: 8,
              textDecoration: 'none',
              display: 'inline-flex', alignItems: 'center', gap: 5,
            }}>
              {ctaLabel} <ArrowRight style={{ width: 12, height: 12 }} />
            </Link>
          </nav>
        </div>
      </header>

      {/* Page container — grid with sticky TOC */}
      <div style={{
        maxWidth: 1200, margin: '0 auto',
        padding: '56px 24px 96px',
      }}>
        {/* Title block */}
        <div style={{ marginBottom: hero ? 40 : 56, maxWidth: 780 }}>
          {eyebrow && (
            <p style={{
              fontSize: 11, fontWeight: 600, color: '#1D6B35',
              textTransform: 'uppercase', letterSpacing: '0.14em',
              margin: '0 0 12px',
            }}>
              {eyebrow}
            </p>
          )}
          <h1 style={{
            fontSize: 'clamp(32px, 5vw, 44px)',
            fontWeight: 800, color: '#0F172A',
            letterSpacing: '-0.025em', lineHeight: 1.1,
            margin: 0,
          }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{
              fontSize: 17, color: '#475569',
              lineHeight: 1.55, marginTop: 16, marginBottom: 0,
              maxWidth: 640,
            }}>
              {subtitle}
            </p>
          )}
          <p style={{
            fontSize: 13, color: '#475569',
            marginTop: 16, marginBottom: 0, letterSpacing: '0.01em',
          }}>
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
            <aside className="fd-legal-toc" style={{
              position: 'sticky',
              top: 80,
              fontSize: 13,
            }}>
              <p style={{
                fontSize: 10, fontWeight: 700, color: '#475569',
                textTransform: 'uppercase', letterSpacing: '0.12em',
                margin: '0 0 12px',
              }}>
                On this page
              </p>
              <ul style={{
                listStyle: 'none', padding: 0, margin: 0,
                display: 'flex', flexDirection: 'column', gap: 2,
                borderLeft: '1px solid rgba(0,0,0,0.08)',
              }}>
                {toc.map(t => (
                  <li key={t.id}>
                    <a
                      href={`#${t.id}`}
                      style={{
                        display: 'block',
                        fontSize: 13, color: '#475569',
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

          <main style={{ maxWidth: 720, minWidth: 0 }}>
            {children}
          </main>
        </div>

        {/* Footer row */}
        <div style={{
          marginTop: 80, paddingTop: 28,
          borderTop: '1px solid rgba(0,0,0,0.06)',
          display: 'flex', flexWrap: 'wrap',
          alignItems: 'center', justifyContent: 'space-between',
          gap: 16,
        }}>
          <p style={{ fontSize: 12, color: '#475569', margin: 0 }}>
            Built in the UK · Your data is encrypted and never sold.
          </p>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <Link href="/security" style={{ fontSize: 13, color: '#64748B', textDecoration: 'none' }}>Security</Link>
            <Link href="/privacy" style={{ fontSize: 13, color: '#64748B', textDecoration: 'none' }}>Privacy</Link>
            <Link href="/terms" style={{ fontSize: 13, color: '#64748B', textDecoration: 'none' }}>Terms</Link>
            <a href="mailto:support@freelax.co.uk" style={{ fontSize: 13, color: '#64748B', textDecoration: 'none' }}>Contact</a>
          </div>
        </div>
      </div>

      {/* Inline styles for hover/mobile */}
      <style>{`
        .fd-legal-link:hover { color: #0F172A !important; }
        .fd-legal-toc a:hover { color: #0F172A !important; border-left-color: #1D6B35 !important; }

        @media (max-width: 900px) {
          .fd-legal-grid {
            grid-template-columns: 1fr !important;
          }
          .fd-legal-toc { display: none; }
        }

        html { scroll-behavior: smooth; scroll-padding-top: 80px; }
      `}</style>
    </div>
  )
}
