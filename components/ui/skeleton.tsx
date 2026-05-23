import { cn } from '@/lib/utils'

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'line' | 'card' | 'circle'
  lines?: number
}

export default function Skeleton({ variant = 'line', lines = 1, className, ...props }: SkeletonProps) {
  if (variant === 'card') {
    return (
      <div className={cn('bg-surface-sunken rounded-xl animate-pulse', className)} {...props} />
    )
  }
  if (variant === 'circle') {
    return (
      <div className={cn('bg-surface-sunken rounded-full animate-pulse', className)} {...props} />
    )
  }
  if (lines > 1) {
    return (
      <div className={cn('space-y-2', className)} {...props}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="h-4 bg-surface-sunken rounded animate-pulse"
            style={{ width: i === lines - 1 ? '60%' : '100%' }}
          />
        ))}
      </div>
    )
  }
  return (
    <div className={cn('h-4 bg-surface-sunken rounded animate-pulse', className)} {...props} />
  )
}
