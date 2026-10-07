'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { AllocationChart } from '@/components/portfolio/AllocationChart';
import { BrokerAllocationChart } from '@/components/portfolio/BrokerAllocationChart';
import { SkeletonChart } from '@/components/shared/Skeletons';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatCurrency, ASSET_CLASS_LABELS } from '@/lib/utils';
import { PieChart } from 'lucide-react';
import { AIInsightCard } from '@/components/insights/AIInsightCard';
import type { AssetAllocation, BrokerAllocation } from '@/types/portfolio';

async function fetchSummary() {
  const res = await fetch('/api/portfolio/summary');
  if (!res.ok) throw new Error('Failed to load');
  return res.json();
}

export default function AllocationPage() {
  const { data, isLoading } = useQuery({ queryKey: ['portfolio-summary'], queryFn: fetchSummary });

  const assetAllocation: AssetAllocation[] = data?.assetAllocation ?? [];
  const brokerAllocation: BrokerAllocation[] = data?.brokerAllocation ?? [];
  const totalValue = data?.summary?.total_current_value ?? 0;

  if (isLoading) {
    return (
      <div className="page-container space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SkeletonChart height={280} />
          <SkeletonChart height={280} />
        </div>
      </div>
    );
  }

  return (
    <div className="page-container space-y-6">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: 'rgb(var(--foreground))' }}>
          Allocation
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'rgb(var(--muted))' }}>
          How your investments are distributed
        </p>
      </div>

      {assetAllocation.length === 0 ? (
        <EmptyState
          icon={<PieChart className="w-8 h-8" style={{ color: 'rgb(var(--brand-500))' }} />}
          title="No allocation data"
          description="Add holdings to see your allocation breakdown."
        />
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <AllocationChart data={assetAllocation} />
            <BrokerAllocationChart data={brokerAllocation} />
          </div>

          {/* Asset class breakdown table */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card overflow-hidden"
          >
            <div className="px-5 py-4 border-b" style={{ borderColor: 'rgb(var(--border))' }}>
              <h2 className="text-sm font-semibold" style={{ color: 'rgb(var(--foreground))' }}>
                Asset Class Breakdown
              </h2>
            </div>
            <div className="divide-y" style={{ borderColor: 'rgb(var(--border))' }}>
              {assetAllocation.map((item) => (
                <div key={item.asset_class} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'rgb(var(--foreground))' }}>
                      {ASSET_CLASS_LABELS[item.asset_class] ?? item.asset_class}
                    </p>
                    <p className="text-xs" style={{ color: 'rgb(var(--muted))' }}>
                      {item.holding_count} holding{item.holding_count !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-32 hidden sm:block">
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgb(var(--surface-raised))' }}>
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${item.percentage}%`,
                            backgroundColor: 'rgb(var(--brand-500))',
                          }}
                        />
                      </div>
                    </div>
                    <div className="text-right min-w-20">
                      <p className="text-sm font-semibold" style={{ color: 'rgb(var(--foreground))' }}>
                        {item.percentage.toFixed(1)}%
                      </p>
                      <p className="text-xs" style={{ color: 'rgb(var(--muted))' }}>
                        {formatCurrency(item.value, true)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <AIInsightCard insightType="diversification_advice" />
        </>
      )}
    </div>
  );
}
