import { Sparkle } from '@phosphor-icons/react'

export default function AIFlag({ label = 'AI-generated — please review' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-micro font-medium text-forest-700 bg-forest-50 border border-forest-200 rounded-lg px-2 py-0.5">
      <Sparkle weight="regular" className="w-3 h-3" />
      {label}
    </span>
  )
}
