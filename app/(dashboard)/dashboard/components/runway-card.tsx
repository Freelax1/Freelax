interface Props { months: number | null; label: string }

export default function RunwayCard({ months, label }: Props) {
  const color = !months ? 'var(--text-muted)' : months >= 3 ? 'var(--success-500)' : months >= 1.5 ? 'var(--warning-500)' : 'var(--danger-500)'
  return (
    <div className="flex flex-col items-center gap-1.5">
      <p className="text-3xl font-serif font-semibold tracking-tight leading-none text-text-primary">
        {months !== null ? months : '—'}
        {months !== null && <span className="text-xl font-semibold text-text-secondary ml-1">mo</span>}
      </p>
      <p className="text-xs font-semibold" style={{ color }}>{label}</p>
      <p className="text-micro text-text-secondary text-center leading-snug">
        Cash + unpaid invoices ÷ avg expenses
      </p>
    </div>
  )
}
