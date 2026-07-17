import { Skeleton } from '@/components/ui/Skeleton'

export function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="bg-white rounded-DEFAULT border border-border overflow-hidden">
          <Skeleton className="aspect-[4/3] rounded-none" />
          <div className="p-3 space-y-2">
            <Skeleton height={18} />
            <Skeleton height={14} width="60%" />
            <Skeleton height={22} width="70%" className="mt-2" />
          </div>
        </div>
      ))}
    </div>
  )
}