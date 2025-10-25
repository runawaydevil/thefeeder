export default function ItemSkeleton() {
  return (
    <div className="bg-card rounded border border-border p-6 animate-pulse">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-7 h-7 bg-border rounded shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-6 bg-border rounded w-3/4" />
          <div className="h-4 bg-border rounded w-1/2" />
        </div>
      </div>
      <div className="h-4 bg-border rounded w-full mb-2" />
      <div className="h-4 bg-border rounded w-5/6" />
      <div className="flex items-center gap-4 mt-3">
        <div className="h-4 bg-border rounded w-24" />
        <div className="h-4 bg-border rounded w-32" />
      </div>
    </div>
  );
}

export function ItemListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {[...Array(count)].map((_, i) => (
        <ItemSkeleton key={i} />
      ))}
    </div>
  );
}




