import { cn } from '@/lib/utils'
import { SkeletonBone } from './content-skeletons'

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'line' | 'card' | 'circle'
  lines?: number
}

/** Generic skeleton primitives — prefer `content-skeletons` for layout-matched placeholders */
export default function Skeleton({ variant = 'line', lines = 1, className, ...props }: SkeletonProps) {
  if (variant === 'card') {
    return <SkeletonBone className={cn('h-full min-h-[120px] w-full rounded-xl', className)} {...props} />
  }
  if (variant === 'circle') {
    return <SkeletonBone className={cn('rounded-full', className)} {...props} />
  }
  if (lines > 1) {
    return (
      <div className={cn('space-y-2', className)} {...props}>
        {Array.from({ length: lines }).map((_, i) => (
          <SkeletonBone
            key={i}
            className="h-4"
            style={{ width: i === lines - 1 ? '60%' : '100%' }}
          />
        ))}
      </div>
    )
  }
  return <SkeletonBone className={cn('h-4', className)} {...props} />
}
