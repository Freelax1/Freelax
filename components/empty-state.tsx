const IMAGE_MAP: Record<string, string> = {
  'invoice':   '/illustrations/empty-invoices.svg',
  'invoices':  '/illustrations/empty-invoices.svg',
  'quote':     '/illustrations/empty-quotes.svg',
  'quotes':    '/illustrations/empty-quotes.svg',
  '📋':        '/illustrations/empty-quotes.svg',
  'client':    '/illustrations/empty-clients.svg',
  'clients':   '/illustrations/empty-clients.svg',
  '👥':        '/illustrations/empty-clients.svg',
  'expense':   '/illustrations/empty-expenses.svg',
  'expenses':  '/illustrations/empty-expenses.svg',
  'dashboard': '/illustrations/empty-dashboard.svg',
  'project':   '/illustrations/empty-projects.svg',
  'projects':  '/illustrations/empty-projects.svg',
  '📁':        '/illustrations/empty-projects.svg',
}

// ── Component ─────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export default function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  const src = icon ? (IMAGE_MAP[icon] ?? '/illustrations/empty-dashboard.svg') : '/illustrations/empty-dashboard.svg'

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '64px 24px', textAlign: 'center',
    }}>
      <div style={{ marginBottom: 20, opacity: 0.9 }}>
        <img src={src} alt="" width={160} height={128} style={{ opacity: 0.95 }} />
      </div>
      <h3 style={{
        fontSize: 15, fontWeight: 600, color: '#333',
        margin: 0, fontFamily: 'inherit',
      }}>
        {title}
      </h3>
      {description && (
        <p style={{
          fontSize: 13, color: '#AAA', marginTop: 6,
          maxWidth: 280, lineHeight: 1.6, fontFamily: 'inherit',
        }}>
          {description}
        </p>
      )}
      {action && <div style={{ marginTop: 20 }}>{action}</div>}
    </div>
  )
}
