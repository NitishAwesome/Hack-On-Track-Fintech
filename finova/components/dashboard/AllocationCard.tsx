'use client';

import React, { useState } from 'react';
import { AllocationSegment } from '@/types/dashboard';
import { AllocationBar } from './AllocationBar';
import { SectionHeader } from '@/components/shared/SectionHeader';
import { cn } from '@/lib/utils';

interface AllocationCardProps {
  segments: AllocationSegment[];
  className?: string;
}

export function AllocationCard({
  segments,
  className,
}: AllocationCardProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div
      className={cn(
        'relative flex flex-col justify-between p-6 sm:p-7 rounded-2xl border transition-all duration-200',
        className
      )}
      style={{
        backgroundColor: 'rgb(var(--surface))',
        borderColor: 'rgb(var(--border))',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div>
        {/* Header */}
        <SectionHeader
          title="Allocation"
          subtitle="Diversified across asset classes"
          actionText="Analyze"
          actionHref="/analysis"
        />

        {/* Horizontal Segmented Bar */}
        <div className="my-5">
          <AllocationBar
            segments={segments}
            hoveredId={hoveredId}
            onHoverSegment={setHoveredId}
            height={12}
          />
        </div>
      </div>

      {/* Compact Legend Rows */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5 pt-2">
        {segments.map((segment) => {
          const isHovered = hoveredId === segment.id;
          const isAnyHovered = hoveredId !== null;

          return (
            <div
              key={segment.id}
              className={cn(
                'flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all duration-150 cursor-pointer',
                isHovered && 'scale-[1.02]'
              )}
              style={{
                backgroundColor: isHovered
                  ? 'rgb(var(--surface-raised))'
                  : 'transparent',
                opacity: isAnyHovered && !isHovered ? 0.6 : 1,
              }}
              onMouseEnter={() => setHoveredId(segment.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {/* Dot & Label */}
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0 transition-transform duration-150"
                  style={{
                    backgroundColor: segment.color,
                    transform: isHovered ? 'scale(1.3)' : 'scale(1)',
                    boxShadow: isHovered ? `0 0 8px ${segment.color}` : 'none',
                  }}
                />
                <span
                  className="text-xs font-medium truncate"
                  style={{ color: 'rgb(var(--foreground))' }}
                >
                  {segment.name}
                </span>
              </div>

              {/* Percentage & Value */}
              <div className="flex items-center gap-2 pl-2">
                <span
                  className="text-xs font-bold tabular-nums"
                  style={{ color: 'rgb(var(--foreground))' }}
                >
                  {segment.percentage}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
