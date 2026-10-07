'use client';

import React from 'react';
import { AllocationSegment } from '@/types/dashboard';
import { cn } from '@/lib/utils';

interface AllocationBarProps {
  segments: AllocationSegment[];
  hoveredId?: string | null;
  onHoverSegment?: (id: string | null) => void;
  className?: string;
  height?: number;
}

export function AllocationBar({
  segments,
  hoveredId,
  onHoverSegment,
  className,
  height = 10,
}: AllocationBarProps) {
  return (
    <div
      className={cn('w-full flex rounded-full overflow-hidden p-0.5 border shadow-inner', className)}
      style={{
        backgroundColor: 'rgb(var(--surface-raised))',
        borderColor: 'rgb(var(--border))',
        height: height + 4,
      }}
    >
      {segments.map((segment) => {
        const isHovered = hoveredId === segment.id;
        const isAnyHovered = hoveredId !== null && hoveredId !== undefined;
        const opacity = isAnyHovered ? (isHovered ? 1 : 0.4) : 1;

        return (
          <div
            key={segment.id}
            className="h-full first:rounded-l-full last:rounded-r-full transition-all duration-200 cursor-pointer"
            style={{
              width: `${segment.percentage}%`,
              backgroundColor: segment.color,
              opacity,
              transform: isHovered ? 'scaleY(1.15)' : 'scaleY(1)',
            }}
            title={`${segment.name}: ${segment.percentage}%`}
            onMouseEnter={() => onHoverSegment?.(segment.id)}
            onMouseLeave={() => onHoverSegment?.(null)}
          />
        );
      })}
    </div>
  );
}
