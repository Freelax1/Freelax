import { cn } from '@/lib/utils'

export interface ProgressBarProps {
  pct: number
  color: string
  className?: string
  trackClassName?: string
  animate?: boolean
}

export default function ProgressBar({
  pct,
  color,
  className,
  trackClassName,
  animate = false,
}: ProgressBarProps) {
  const width = Math.min(100, Math.max(0, pct))

  return (
    <div className={cn('h-[5px] rounded-full overflow-hidden bg-border-subtle', trackClassName, className)}>
      <div
        className={cn(
          'h-full rounded-full',
          animate && 'transition-[width] duration-progress ease-out-expo',
        )}
        style={{ background: color, width: `${width}%` }}
      />
    </div>
  )
}
