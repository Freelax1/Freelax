import Link from 'next/link'
import { Info } from 'lucide-react'

// Shared with app/api/tax/export-pack/route.ts — keep as plain string, no JSX.
export const DISCLAIMER_FOOTER_TEXT =
  'Freelax provides estimates to help you plan — not professional tax advice. ' +
  'Confirm figures with a qualified adviser before filing.'

export const DISCLAIMER_INLINE_TEXT =
  'These are estimates to help you plan. Not professional tax advice — ' +
  'confirm with a qualified adviser before filing.'

interface Props {
  variant?: 'inline' | 'footer'
}

export default function NotTaxAdviceDisclaimer({ variant = 'inline' }: Props) {
  if (variant === 'footer') {
    return (
      <p className="text-xs text-slate-400 text-center mt-8 max-w-2xl mx-auto leading-relaxed">
        {DISCLAIMER_FOOTER_TEXT}{' '}
        <Link href="/terms" className="underline hover:text-slate-600">Learn more</Link>.
      </p>
    )
  }

  return (
    <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-xs text-amber-900">
      <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" strokeWidth={2} />
      <p>{DISCLAIMER_INLINE_TEXT}</p>
    </div>
  )
}
