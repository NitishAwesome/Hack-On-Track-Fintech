export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="card p-5 space-y-3">
      <div className="skeleton h-4 w-1/3" />
      <div className="skeleton h-7 w-1/2" />
      {Array.from({ length: lines - 2 }).map((_, i) => (
        <div key={i} className="skeleton h-3" style={{ width: `${60 + i * 10}%` }} />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="card overflow-hidden">
      <div className="p-4 border-b" style={{ borderColor: 'rgb(var(--border))' }}>
        <div className="skeleton h-4 w-32" />
      </div>
      <div className="divide-y" style={{ borderColor: 'rgb(var(--border))' }}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3">
            <div className="skeleton h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <div className="skeleton h-3.5 w-32" />
              <div className="skeleton h-3 w-20" />
            </div>
            <div className="skeleton h-4 w-20" />
            <div className="skeleton h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonChart({ height = 200 }: { height?: number }) {
  return (
    <div className="card p-5">
      <div className="skeleton h-4 w-32 mb-4" />
      <div className="skeleton rounded-lg" style={{ height }} />
    </div>
  );
}
