'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { TimeRange, PortfolioSummaryData } from '@/types/dashboard';
import { PortfolioChart } from './PortfolioChart';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface PortfolioSummaryCardProps {
  data: PortfolioSummaryData;
  className?: string;
}

const TIME_RANGES: TimeRange[] = ['1D', '1W', '1M', 'YTD', '1Y', 'All'];

export function PortfolioSummaryCard({
  data,
  className,
}: PortfolioSummaryCardProps) {
  const [selectedRange, setSelectedRange] = useState<TimeRange>('1Y');

  const currentChartData = data.chartDataByRange[selectedRange] || data.chartDataByRange['1Y'];

  return (
    <div
      className={cn(
        'relative flex flex-col justify-between p-6 sm:p-7 rounded-2xl border overflow-hidden transition-all duration-200',
        className
      )}
      style={{
        backgroundColor: 'rgb(var(--surface))',
        borderColor: 'rgb(var(--border))',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {/* Subtle background ambient glow at top-left */}
      <div
        className="absolute -top-24 -left-24 w-72 h-72 rounded-full pointer-events-none opacity-10 dark:opacity-20 blur-3xl"
        style={{ background: 'radial-gradient(circle, #0ea5e9, transparent)' }}
      />

      {/* Top Section: Header & Returns */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-start justify-between gap-5 pb-5">
        {/* Left: Total Portfolio Value & Gains */}
        <div>
          <span
            className="text-[11px] font-bold uppercase tracking-wider block mb-1.5"
            style={{ color: 'rgb(var(--muted))' }}
          >
            Total Portfolio Value
          </span>

          <div className="flex items-baseline gap-2">
            <h1
              className="text-3xl sm:text-4xl lg:text-[40px] font-bold tracking-tight text-white dark:text-white"
              style={{ color: 'rgb(var(--foreground))', fontVariantNumeric: 'tabular-nums' }}
            >
              {data.formattedTotalValue}
            </h1>
          </div>

          {/* Overall gain pill */}
          <div className="flex flex-wrap items-center gap-2 mt-2.5">
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold"
              style={{
                backgroundColor: 'rgb(var(--gain) / 0.12)',
                color: 'rgb(var(--gain))',
                border: '1px solid rgb(var(--gain) / 0.25)',
              }}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>+{formatCurrency(data.overallReturnAmount)} Overall</span>
              <span className="opacity-40">·</span>
              <span>+{formatPercent(data.overallReturnPercentage)}</span>
            </div>
          </div>
        </div>

        {/* Right: Returns (1Y) & Time-Range Controls */}
        <div className="flex flex-col sm:items-end justify-between gap-3">
          <div className="text-left sm:text-right">
            <span
              className="text-[11px] font-bold uppercase tracking-wider block"
              style={{ color: 'rgb(var(--muted))' }}
            >
              Returns (1Y)
            </span>
            <div
              className="text-2xl sm:text-3xl font-bold tracking-tight mt-0.5"
              style={{ color: 'rgb(var(--brand-500))' }}
            >
              +{formatPercent(data.oneYearReturnPercentage)}
            </div>
          </div>

          {/* Time range switcher */}
          <div
            className="inline-flex items-center p-1 rounded-lg border text-xs"
            style={{
              backgroundColor: 'rgb(var(--surface-raised))',
              borderColor: 'rgb(var(--border))',
            }}
          >
            {TIME_RANGES.map((range) => {
              const isSelected = selectedRange === range;
              return (
                <button
                  key={range}
                  onClick={() => setSelectedRange(range)}
                  className={cn(
                    'relative px-2.5 py-1 font-semibold rounded-md transition-all duration-150',
                    isSelected
                      ? 'text-white'
                      : 'hover:text-foreground'
                  )}
                  style={{
                    color: isSelected ? '#ffffff' : 'rgb(var(--muted))',
                  }}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="time-range-active-pill"
                      className="absolute inset-0 rounded-md shadow-sm"
                      style={{
                        backgroundColor: 'rgb(var(--brand-500))',
                      }}
                      transition={{ type: 'spring', bounce: 0.15, duration: 0.3 }}
                    />
                  )}
                  <span className="relative z-10">{range}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Section: Area Chart */}
      <div className="relative z-10 pt-2 -mb-2">
        <PortfolioChart
          data={currentChartData}
          color="#0ea5e9"
          height={160}
          gradientId={`portfolio-area-${selectedRange}`}
        />
      </div>
    </div>
  );
}
