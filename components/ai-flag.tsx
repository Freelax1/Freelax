import { Sparkles } from 'lucide-react'

export default function AIFlag({ label = 'AI-generated — please review' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-micro font-medium text-info-700 bg-info-50 border border-info-200 rounded-full px-2 py-0.5">
      <Sparkles className="w-3 h-3" aria-hidden />
      {label}
    </span>
  )
}
