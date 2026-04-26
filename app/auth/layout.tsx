import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#FAFAF7',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 16px 32px',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      {/* Hero wordmark */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <h1
          style={{
            fontSize: 36,
            fontWeight: 800,
            color: '#0F172A',
            letterSpacing: '-0.03em',
            lineHeight: 1,
            margin: 0,
          }}
        >
          Freelax
          <span style={{ color: '#1D6B35' }}>.</span>
        </h1>
        <p
          style={{
            fontSize: 15,
            color: '#64748B',
            marginTop: 12,
            lineHeight: 1.5,
          }}
        >
          Tax, invoicing, and clarity for UK freelancers.
        </p>
      </div>

      {/* Card */}
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          background: '#FFFFFF',
          borderRadius: 14,
          border: '1px solid rgba(0,0,0,0.06)',
          padding: '36px 32px 32px',
        }}
      >
        {children}
      </div>

      {/* Footer */}
      <footer
        style={{
          textAlign: 'center',
          fontSize: 12,
          color: '#94A3B8',
          marginTop: 32,
          lineHeight: 1.7,
          maxWidth: 420,
        }}
      >
        <p style={{ margin: 0 }}>
          Built in the UK · Your data is encrypted and never sold.
        </p>
        <p style={{ margin: '4px 0 0' }}>
          <Link href="/security" style={{ color: '#94A3B8', textDecoration: 'none' }}>
            Security
          </Link>
          {' · '}
          <Link href="/privacy" style={{ color: '#94A3B8', textDecoration: 'none' }}>
            Privacy
          </Link>
          {' · '}
          <Link href="/terms" style={{ color: '#94A3B8', textDecoration: 'none' }}>
            Terms
          </Link>
        </p>
      </footer>
    </div>
  )
}
