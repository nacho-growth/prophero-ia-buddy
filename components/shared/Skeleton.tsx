interface SkeletonProps {
  width?: number | string
  height?: number | string
  borderRadius?: number | string
  style?: React.CSSProperties
}

export function Skeleton({ width, height = 16, borderRadius = 6, style }: SkeletonProps) {
  return <div className="skeleton" style={{ width, height, borderRadius, ...style }} />
}

interface SkeletonRowProps {
  cols?: number
}

export function SkeletonRow({ cols = 3 }: SkeletonRowProps) {
  return (
    <div className="flex gap-2">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} width={`${Math.floor(100 / cols)}%`} height={16} />
      ))}
    </div>
  )
}

interface SkeletonCardProps {
  height?: number | string
}

export function SkeletonCard({ height = 120 }: SkeletonCardProps) {
  return (
    <div
      className="flex flex-col gap-3 rounded-xl p-4"
      style={{ height, backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
    >
      <Skeleton width="40%" height={14} />
      <Skeleton width="100%" height={12} />
      <Skeleton width="70%" height={12} />
    </div>
  )
}
