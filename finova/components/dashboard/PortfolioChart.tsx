'use client';
import { useReducedMotionConfig } from 'framer-motion';

import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { ChartDataPoint } from '@/types/dashboard';
import { formatCurrency } from '@/lib/utils';

interface PortfolioChartProps {
  data: ChartDataPoint[];
  color?: string;
  gradientId?: string;
  height?: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: ChartDataPoint }>;
  label?: string;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  const current = payload[0].payload;

  return (
    <div
      className="px-3 py-2 rounded-lg border shadow-xl backdrop-blur-md text-xs space-y-1"
      style={{
        backgroundColor: 'rgb(var(--surface-overlay) / 0.95)',
        borderColor: 'rgb(var(--border))',
        color: 'rgb(var(--foreground))',
      }}
    >
      <p className="font-semibold" style={{ color: 'rgb(var(--muted))' }}>
        {current.timestamp}
      </p>
      <p className="text-sm font-bold tracking-tight text-white dark:text-white" style={{ color: 'rgb(var(--foreground))' }}>
        {formatCurrency(current.value)}
      </p>
    </div>
  );
}

const emptySubscribe = () => () => {};

export function PortfolioChart({
  data,
  color = '#0ea5e9', // Refined cyan/blue
  gradientId = 'portfolioChartGradient',
  height = 150,
}: PortfolioChartProps) {
  const reducedMotion = useReducedMotionConfig();
  const mounted = React.useSyncExternalStore(emptySubscribe, () => true, () => false);

  if (!mounted) {
    return (
      <div
        className="w-full flex items-center justify-center opacity-30 animate-pulse"
        style={{ height }}
      >
        <div className="w-full h-full bg-surface-raised/20 dark:bg-slate-800/20 rounded-lg" />
      </div>
    );
  }

  // Calculate min & max for balanced y-axis margins
  const values = data.map((d) => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const padding = (maxVal - minVal) * 0.1 || minVal * 0.05;

  return (
    <div className="w-full relative select-none" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="85%" stopColor={color} stopOpacity={0.02} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
            <filter id="subtleGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{
              fontSize: 10,
              fill: 'rgb(var(--muted))',
              opacity: 0.65,
            }}
            dy={5}
          />
          <YAxis
            hide
            domain={[minVal - padding, maxVal + padding]}
          />

          <Tooltip
            content={<CustomTooltip />}
            cursor={{
              stroke: 'rgb(var(--brand-500))',
              strokeWidth: 1,
              strokeDasharray: '3 3',
              opacity: 0.5,
            }}
          />

          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            filter="url(#subtleGlow)"
            isAnimationActive={!reducedMotion}
            animationDuration={800}
            activeDot={{
              r: 5,
              fill: '#ffffff',
              stroke: color,
              strokeWidth: 2.5,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
