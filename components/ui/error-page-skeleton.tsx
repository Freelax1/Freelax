import { cn } from '@/lib/utils'
import { SkeletonBone } from './content-skeletons'

/** Compact ghost of a list page — used on error boundaries instead of an alert icon. */
export function ErrorPageSkeleton({
  className,
  size = 'md',
}: {
  className?: string
  size?: 'sm' | 'md'
}) {
  const w = size === 'sm' ? 'max-w-[220px]' : 'max-w-[280px]'

  return (
    <div
      className={cn(
        'w-full mx-auto opacity-[0.45] pointer-events-none select-none',
        '[&_.fd-skeleton]:!animate-none',
        w,
        className,
      )}
      aria-hidden
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <SkeletonBone className={size === 'sm' ? 'h-5 w-24' : 'h-6 w-28'} />
        <SkeletonBone className={cn('rounded-lg', size === 'sm' ? 'h-7 w-20' : 'h-8 w-24')} />
      </div>
      <div className="flex gap-4 mb-3">
        <SkeletonBone className="h-3 w-[4.5rem]" />
        <SkeletonBone className="h-3 w-16" />
      </div>
      <div className="rounded-xl border border-border-default bg-surface-card overflow-hidden">
        <div className="flex gap-3 px-3 py-2.5 bg-surface-sunken border-b border-border-subtle">
          <SkeletonBone className="h-3 w-12" />
          <SkeletonBone className="h-3 flex-1 max-w-[5rem]" />
          <SkeletonBone className="h-3 w-10" />
        </div>
        {Array.from({ length: size === 'sm' ? 2 : 3 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-3 py-2.5 border-t border-border-subtle"
          >
            <SkeletonBone className="h-3.5 w-14" />
            <SkeletonBone className="h-3.5 flex-1 max-w-[6rem]" />
            <SkeletonBone className="h-3.5 w-12 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  )
}
