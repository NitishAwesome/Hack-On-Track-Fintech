'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveTableProps {
  children: React.ReactNode;
  className?: string;
  wrapperClassName?: string;
}

export function ResponsiveTable({
  children,
  className,
  wrapperClassName,
}: ResponsiveTableProps) {
  return (
    <div className={cn('w-full overflow-x-auto overflow-y-hidden', wrapperClassName)}>
      <table className={cn('w-full text-left border-collapse text-sm', className)}>
        {children}
      </table>
    </div>
  );
}
