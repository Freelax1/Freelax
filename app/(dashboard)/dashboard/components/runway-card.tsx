interface Props { months: number | null; label: string }

export default function RunwayCard({ months, label }: Props) {
  const color = !months ? '#888' : months >= 3 ? '#1D6B35' : months >= 1.5 ? '#9A7B0A' : '#C0392B'
  return (
    <div className="flex flex-col items-center gap-1.5">
      <p className="text-4xl font-extrabold tracking-tight leading-none text-slate-900">
        {months !== null ? months : '—'}
        {months !== null && <span className="text-xl font-bold text-slate-400 ml-1">mo</span>}
      </p>
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color }}>{label}</p>
      <p className="text-[10px] text-slate-400 text-center leading-snug">
        Cash + unpaid invoices ÷ avg expenses
      </p>
    </div>
  )
}
