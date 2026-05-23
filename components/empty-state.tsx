// ── SVG illustrations — one per entity type ───────────────────────────────

function IllustrationClients() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="36" cy="36" r="36" fill="var(--cream-100)" />
      {/* Primary person */}
      <circle cx="30" cy="26" r="8" stroke="var(--cream-400)" strokeWidth="2" fill="none" />
      <path d="M14 52c0-8.837 7.163-16 16-16h0c8.837 0 16 7.163 16 16" stroke="var(--cream-400)" strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* Secondary person (offset) */}
      <circle cx="46" cy="28" r="6" stroke="var(--cream-300)" strokeWidth="2" fill="none" />
      <path d="M34 52c0-6.627 5.373-12 12-12h0c3.314 0 6.314 1.343 8.485 3.515" stroke="var(--cream-300)" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  )
}

function IllustrationProjects() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="36" cy="36" r="36" fill="var(--cream-100)" />
      {/* Folder shape */}
      <path d="M18 30a2 2 0 0 1 2-2h8l3 4h21a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H20a2 2 0 0 1-2-2V30Z" stroke="var(--cream-400)" strokeWidth="2" fill="none" strokeLinejoin="round" />
      {/* Lines inside folder suggesting content */}
      <path d="M25 38h22M25 43h14" stroke="var(--cream-300)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function IllustrationInvoices() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="36" cy="36" r="36" fill="var(--cream-100)" />
      {/* Document */}
      <rect x="21" y="16" width="30" height="40" rx="3" stroke="var(--cream-400)" strokeWidth="2" fill="none" />
      {/* Fold corner */}
      <path d="M39 16v8h12" stroke="var(--cream-400)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Lines */}
      <path d="M27 30h18M27 36h18M27 42h12" stroke="var(--cream-300)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function IllustrationExpenses() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="36" cy="36" r="36" fill="var(--cream-100)" />
      {/* Receipt shape with torn bottom */}
      <path d="M24 18h24v36l-4-3-4 3-4-3-4 3-4-3-4 3V18Z" stroke="var(--cream-400)" strokeWidth="2" fill="none" strokeLinejoin="round" />
      {/* Lines */}
      <path d="M30 26h12M30 32h12M30 38h8" stroke="var(--cream-300)" strokeWidth="2" strokeLinecap="round" />
      {/* £ symbol */}
      <path d="M33 26v-2a3 3 0 1 1 6 0" stroke="var(--cream-400)" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </svg>
  )
}

function IllustrationGeneric() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="36" cy="36" r="36" fill="var(--cream-100)" />
      <circle cx="36" cy="36" r="14" stroke="var(--cream-400)" strokeWidth="2" fill="none" />
      <path d="M36 28v8l5 3" stroke="var(--cream-400)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const ILLUSTRATIONS: Record<string, React.FC> = {
  '👥': IllustrationClients,
  '📁': IllustrationProjects,
  '🧾': IllustrationInvoices,
  '🧾invoice': IllustrationInvoices,
  '🧾expense': IllustrationExpenses,
  'invoice': IllustrationInvoices,
  'expense': IllustrationExpenses,
  clients: IllustrationClients,
  projects: IllustrationProjects,
  invoices: IllustrationInvoices,
  expenses: IllustrationExpenses,
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
  const Illustration = icon ? (ILLUSTRATIONS[icon] ?? IllustrationGeneric) : IllustrationGeneric

  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-5 opacity-90">
        <Illustration />
      </div>
      <h3 className="text-base font-semibold text-text-primary font-[inherit]">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-text-muted mt-1.5 max-w-[280px] leading-relaxed font-[inherit]">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
