import { Sparkles } from 'lucide-react'

export default function AIFlag({ label = 'AI-generated — please review' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-full px-2 py-0.5">
      <Sparkles className="w-3 h-3" />
      {label}
    </span>
  )
}
