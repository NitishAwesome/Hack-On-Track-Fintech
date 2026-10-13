'use client';
import { useReducedMotionConfig } from 'framer-motion';

import {
  PieChart, Pie, Cell, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';
import { motion } from 'framer-motion';
import type { AssetAllocation } from '@/types/portfolio';
import { ASSET_CLASS_LABELS, formatCurrency } from '@/lib/utils';

const COLORS = [
  'rgb(var(--brand-500))',
  '#8B5CF6', '#F59E0B', '#10B981',
  '#3B82F6', '#EC4899', '#EF4444',
];

interface AllocationChartProps {
  data: AssetAllocation[];
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: AssetAllocation }> }) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div
      className="card px-3 py-2 text-xs space-y-1"
      style={{ minWidth: 160 }}
    >
      <p className="font-semibold" style={{ color: 'rgb(var(--foreground))' }}>
        {ASSET_CLASS_LABELS[item.name] ?? item.name}
      </p>
      <p style={{ color: 'rgb(var(--muted))' }}>
        {item.payload.percentage.toFixed(1)}% · {formatCurrency(item.payload.value, true)}
      </p>
      <p style={{ color: 'rgb(var(--muted))' }}>
        {item.payload.holding_count} holding{item.payload.holding_count !== 1 ? 's' : ''}
      </p>
    </div>
  );
}

export function AllocationChart({ data }: AllocationChartProps) {
  const reducedMotion = useReducedMotionConfig();
  if (!data.length) return null;

  const chartData = data.map((d) => ({
    ...d,
    name: d.asset_class,
    value: d.percentage,
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="card p-5"
    >
      <h2 className="text-sm font-semibold mb-4" style={{ color: 'rgb(var(--foreground))' }}>
        Asset Allocation
      </h2>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            isAnimationActive={!reducedMotion}
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={100}
            paddingAngle={3}
            dataKey="value"
          >
            {chartData.map((_, i) => (
              <Cell
                key={i}
                fill={COLORS[i % COLORS.length]}
                stroke="transparent"
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(value) => (
              <span style={{ color: 'rgb(var(--muted))', fontSize: '0.75rem' }}>
                {ASSET_CLASS_LABELS[value] ?? value}
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend table */}
      <div className="mt-2 space-y-1.5">
        {data.map((item, i) => (
          <div key={item.asset_class} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
              />
              <span style={{ color: 'rgb(var(--foreground))' }}>
                {ASSET_CLASS_LABELS[item.asset_class] ?? item.asset_class}
              </span>
            </div>
            <span className="font-medium" style={{ color: 'rgb(var(--foreground))' }}>
              {item.percentage.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
