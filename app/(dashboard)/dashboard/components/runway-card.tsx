interface Props { months: number | null; label: string }

function runwayLabelColor(months: number | null): string {
  if (months == null) return 'var(--text-muted)'
  if (months >= 3) return 'var(--success-600)'
  if (months >= 1.5) return 'var(--warning-500)'
  return 'var(--danger-500)'
}

export default function RunwayCard({ months, label }: Props) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <p className="text-4xl font-extrabold tracking-tight leading-none tabular-nums text-text-primary">
        {months !== null ? months : '—'}
        {months !== null && <span className="text-xl font-bold text-text-muted ml-1">mo</span>}
      </p>
      <p
        className="text-xs font-semibold uppercase tracking-wide"
        style={{ color: runwayLabelColor(months) }}
      >
        {label}
      </p>
      <p className="text-micro text-text-muted text-center leading-snug">
        Cash + unpaid invoices ÷ avg expenses
      </p>
    </div>
  )
}
