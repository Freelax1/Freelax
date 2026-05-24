import Link from 'next/link'
import Alert from '@/components/ui/alert'
import { DISCLAIMER_FOOTER_TEXT, DISCLAIMER_INLINE_TEXT } from '@/lib/disclaimer-text'

export { DISCLAIMER_FOOTER_TEXT, DISCLAIMER_INLINE_TEXT } from '@/lib/disclaimer-text'

interface Props {
  variant?: 'inline' | 'footer'
}

export default function NotTaxAdviceDisclaimer({ variant = 'inline' }: Props) {
  if (variant === 'footer') {
    return (
      <p className="text-xs text-text-secondary text-center mt-8 max-w-2xl mx-auto leading-relaxed">
        {DISCLAIMER_FOOTER_TEXT}{' '}
        <Link href="/terms" className="underline hover:text-text-secondary">Learn more</Link>.
      </p>
    )
  }

  return (
    <Alert intent="helper">
      {DISCLAIMER_INLINE_TEXT}
    </Alert>
  )
}
