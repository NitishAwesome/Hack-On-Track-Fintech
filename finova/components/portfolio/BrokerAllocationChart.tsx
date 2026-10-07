'use client';

import {
  PieChart, Pie, Cell, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';
import { motion } from 'framer-motion';
import type { BrokerAllocation } from '@/types/portfolio';
import { formatCurrency } from '@/lib/utils';

interface BrokerAllocationChartProps {
  data: BrokerAllocation[];
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: BrokerAllocation }> }) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="card px-3 py-2 text-xs space-y-1" style={{ minWidth: 160 }}>
      <p className="font-semibold" style={{ color: 'rgb(var(--foreground))' }}>{item.broker_name}</p>
      <p style={{ color: 'rgb(var(--muted))' }}>
        {item.percentage.toFixed(1)}% · {formatCurrency(item.value, true)}
      </p>
    </div>
  );
}

export function BrokerAllocationChart({ data }: BrokerAllocationChartProps) {
  if (!data.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.25 }}
      className="card p-5"
    >
      <h2 className="text-sm font-semibold mb-4" style={{ color: 'rgb(var(--foreground))' }}>
        Broker-wise Allocation
      </h2>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={100}
            paddingAngle={3}
            dataKey="value"
            nameKey="broker_name"
          >
            {data.map((item, i) => (
              <Cell key={i} fill={item.color_hex} stroke="transparent" />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(value) => (
              <span style={{ color: 'rgb(var(--muted))', fontSize: '0.75rem' }}>{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend table */}
      <div className="mt-2 space-y-1.5">
        {data.map((item) => (
          <div key={item.broker_account_id} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: item.color_hex }}
              />
              <span style={{ color: 'rgb(var(--foreground))' }}>{item.broker_name}</span>
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
