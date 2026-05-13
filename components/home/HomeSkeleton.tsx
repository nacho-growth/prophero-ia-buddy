import { SkeletonCard } from '@/components/shared/Skeleton'

export default function HomeSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <SkeletonCard height={80} />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <SkeletonCard height={140} />
        <SkeletonCard height={140} />
        <SkeletonCard height={140} />
        <SkeletonCard height={200} />
        <SkeletonCard height={200} />
        <SkeletonCard height={140} />
      </div>
    </div>
  )
}
