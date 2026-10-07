'use client';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  height?: number;
  className?: string;
  loading?: boolean;
}

/**
 * ChartCard — consistent wrapper for all Recharts charts.
 * Provides title, subtitle, optional header action, and loading skeleton.
 */
export function ChartCard({
  title,
  subtitle,
  headerRight,
  children,
  height = 260,
  className,
  loading = false,
}: ChartCardProps) {
  return (
    <div
      className={`card overflow-hidden ${className ?? ''}`}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 border-b"
        style={{ borderColor: 'rgb(var(--border))' }}
      >
        <div>
          <p className="text-sm font-semibold" style={{ color: 'rgb(var(--foreground))' }}>
            {title}
          </p>
          {subtitle && (
            <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--muted))' }}>
              {subtitle}
            </p>
          )}
        </div>
        {headerRight && (
          <div className="flex items-center gap-2">
            {headerRight}
          </div>
        )}
      </div>

      {/* Chart area */}
      <div className="p-4" style={{ height }}>
        {loading ? (
          <div className="h-full flex flex-col gap-2 justify-end pb-2">
            <div className="flex items-end gap-2 h-full">
              {[40, 70, 55, 85, 60, 90, 50, 75].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 skeleton rounded-t"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>
        ) : children}
      </div>
    </div>
  );
}
