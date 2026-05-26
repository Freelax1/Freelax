import Link from 'next/link'
import Alert from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import { DISCLAIMER_FOOTER_TEXT, DISCLAIMER_INLINE_TEXT } from '@/lib/disclaimer-text'

export { DISCLAIMER_FOOTER_TEXT, DISCLAIMER_INLINE_TEXT } from '@/lib/disclaimer-text'

interface Props {
  variant?: 'inline' | 'footer'
  className?: string
}

export default function NotTaxAdviceDisclaimer({ variant = 'inline', className }: Props) {
  if (variant === 'footer') {
    return (
      <p className={cn('text-xs text-text-secondary text-center mt-8 max-w-2xl mx-auto leading-relaxed', className)}>
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
