'use client';

// ============================================================
// FINOVA — PROMPT 11: Portfolio Future Lab Page
// app/(dashboard)/future-lab/page.tsx
//
// Dual-Innovation Interface:
// 1. What-If Portfolio Allocation Simulator & Before-After Analyzer
// 2. Goal-Based Investment Planning & Zero-Growth Contribution Planner
//
// Strictly Educational & Read-Only:
// - Zero trades executed
// - Real holdings, transactions, and broker balances are NEVER modified
// - Pure reallocation preserves total modeled capital
// - Grounded Gemini-powered educational decision intelligence
// ============================================================

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FlaskConical,
  Target,
  Shield,
  Sparkles,
  RefreshCw,
  Info,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  X,
} from 'lucide-react';
import { formatIndianCurrency } from '@/lib/utils';
import type {
  WhatIfSimulationResult,
  WhatIfSimulationInput,
  GoalProgressMetrics,
} from '@/lib/calculations/futureLab';
import type { GoalCategory, GoalPriority } from '@/types/database';

async function fetchBaselineXRay() {
  const res = await fetch('/api/portfolio/xray');
  if (!res.ok) throw new Error('Failed to load portfolio baseline');
  const json = await res.json();
  return json.data;
}

async function fetchGoals() {
  const res = await fetch('/api/goals');
  if (!res.ok) throw new Error('Failed to load investment goals');
  const json = await res.json();
  return json.data || [];
}

interface GoalRowDecorated {
  id: string;
  goal_name: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
  category: GoalCategory;
  priority: GoalPriority;
  status: string;
  progress: GoalProgressMetrics;
}

export default function PortfolioFutureLabPage() {
  const queryClient = useQueryClient();
  const [activeMainTab, setActiveMainTab] = useState<'simulator' | 'goals'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('tab') === 'goals') return 'goals';
    }
    return 'simulator';
  });

  // Baseline X-Ray & Goals Queries
  const { data: xrayData } = useQuery({
    queryKey: ['portfolio-xray-baseline'],
    queryFn: fetchBaselineXRay,
    staleTime: 60000,
  });

  const { data: goalsData } = useQuery<GoalRowDecorated[]>({
    queryKey: ['investment-goals'],
    queryFn: fetchGoals,
    staleTime: 30000,
  });

  // -------------------------------------------------------------------
  // SIMULATOR STATE
  // -------------------------------------------------------------------
  const [scenarioType, setScenarioType] = useState<'TARGET_ALLOCATION' | 'REALLOCATION' | 'NEW_CONTRIBUTION'>(
    'TARGET_ALLOCATION'
  );
  const [additionalContribution, setAdditionalContribution] = useState<number>(0);
  const [targetPercentages, setTargetPercentages] = useState<{
    equity: number;
    bond: number;
    mf: number;
    sgb: number;
    reit: number;
    invit: number;
  }>({
    equity: 55,
    bond: 25,
    mf: 10,
    sgb: 5,
    reit: 5,
    invit: 0,
  });

  // Transfer simulation state (for REALLOCATION mode)
  const [transferFrom, setTransferFrom] = useState<'equity' | 'bond' | 'mf'>('equity');
  const [transferTo, setTransferTo] = useState<'bond' | 'reit' | 'sgb'>('bond');
  const [transferPercent, setTransferPercent] = useState<number>(20);

  // Simulation Mutation
  const simulateMutation = useMutation({
    mutationFn: async (input: WhatIfSimulationInput) => {
      const res = await fetch('/api/simulation/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input, requestAiExplanation: true }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to compute scenario');
      }
      return res.json();
    },
  });

  // -------------------------------------------------------------------
  // GOAL MANAGEMENT STATE
  // -------------------------------------------------------------------
  const [showGoalModal, setShowGoalModal] = useState<boolean>(false);
  const [editingGoal, setEditingGoal] = useState<GoalRowDecorated | null>(null);
  const [goalName, setGoalName] = useState<string>('');
  const [goalTarget, setGoalTarget] = useState<string>('');
  const [goalCurrent, setGoalCurrent] = useState<string>('');
  const [goalDate, setGoalDate] = useState<string>('');
  const [goalCategory, setGoalCategory] = useState<GoalCategory>('GENERAL');
  const [goalPriority, setGoalPriority] = useState<GoalPriority>('MEDIUM');
  const [goalFormError, setGoalFormError] = useState<string | null>(null);

  // Zero-Growth Contribution Calculator State
  const [selectedGoalForPlanning, setSelectedGoalForPlanning] = useState<GoalRowDecorated | null>(null);
  const [monthlyContributionInput, setMonthlyContributionInput] = useState<number>(10000);

  // AI Explainer State
  const [aiQuestion, setAiQuestion] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);

  async function handleAskAi(queryLabel: string, topic = 'custom') {
    setAiQuestion(queryLabel);
    setAiLoading(true);
    setAiResponse(null);

    try {
      const res = await fetch('/api/ai/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: topic,
          query: queryLabel,
          context: {
            topHoldingName: xrayData?.consolidated_instruments[0]?.name,
            topHoldingWeight: xrayData?.consolidated_instruments[0]?.percentage_of_valued_portfolio,
            overlapCount: xrayData?.summary.cross_broker_overlaps_count,
            unquotedCount: xrayData?.summary.unpriced_positions_count,
          },
        }),
      });
      const data = await res.json();
      setAiResponse(data.explanation || 'Educational analysis currently unavailable.');
    } catch {
      setAiResponse('Unable to contact intelligence engine. Please check connection.');
    } finally {
      setAiLoading(false);
    }
  }

  // Handle Preset Scenarios
  function applyPreset(presetKey: 'DEFENSIVE' | 'FRESH_CAPITAL' | 'BALANCED_GROWTH') {
    if (presetKey === 'DEFENSIVE') {
      setScenarioType('TARGET_ALLOCATION');
      setAdditionalContribution(0);
      setTargetPercentages({ equity: 40, bond: 40, mf: 10, sgb: 5, reit: 5, invit: 0 });
      runSimulationWithParams({
        scenarioType: 'TARGET_ALLOCATION',
        targetPercentages: { equity: 40, bond: 40, mf: 10, sgb: 5, reit: 5, invit: 0 },
      });
    } else if (presetKey === 'FRESH_CAPITAL') {
      setScenarioType('NEW_CONTRIBUTION');
      setAdditionalContribution(50000);
      setTargetPercentages({ equity: 20, bond: 50, mf: 10, sgb: 10, reit: 10, invit: 0 });
      runSimulationWithParams({
        scenarioType: 'NEW_CONTRIBUTION',
        additionalContribution: 50000,
        targetPercentages: { equity: 20, bond: 50, mf: 10, sgb: 10, reit: 10, invit: 0 },
      });
    } else if (presetKey === 'BALANCED_GROWTH') {
      setScenarioType('TARGET_ALLOCATION');
      setAdditionalContribution(0);
      setTargetPercentages({ equity: 60, bond: 20, mf: 10, sgb: 5, reit: 5, invit: 0 });
      runSimulationWithParams({
        scenarioType: 'TARGET_ALLOCATION',
        targetPercentages: { equity: 60, bond: 20, mf: 10, sgb: 5, reit: 5, invit: 0 },
      });
    }
  }

  function runSimulationWithParams(input: WhatIfSimulationInput) {
    simulateMutation.mutate(input);
  }

  function handleTriggerSimulation() {
    if (scenarioType === 'TARGET_ALLOCATION') {
      runSimulationWithParams({
        scenarioType: 'TARGET_ALLOCATION',
        additionalContribution,
        targetPercentages,
      });
    } else if (scenarioType === 'REALLOCATION') {
      runSimulationWithParams({
        scenarioType: 'REALLOCATION',
        transfer: {
          fromClass: transferFrom,
          toClass: transferTo,
          percentage: transferPercent,
        },
      });
    } else if (scenarioType === 'NEW_CONTRIBUTION') {
      runSimulationWithParams({
        scenarioType: 'NEW_CONTRIBUTION',
        additionalContribution: Math.max(additionalContribution, 10000),
        targetPercentages,
      });
    }
  }

  // Reset to Current Baseline
  function handleResetToBaseline() {
    setAdditionalContribution(0);
    setScenarioType('TARGET_ALLOCATION');
    if (xrayData) {
      const eqItem = xrayData.asset_class_breakdown.find((a: { asset_class: string }) => a.asset_class === 'equity');
      const bondItem = xrayData.asset_class_breakdown.find((a: { asset_class: string }) => a.asset_class === 'bond');
      const mfItem = xrayData.asset_class_breakdown.find((a: { asset_class: string }) => a.asset_class === 'mf');
      const sgbItem = xrayData.asset_class_breakdown.find((a: { asset_class: string }) => a.asset_class === 'sgb');
      const reitItem = xrayData.asset_class_breakdown.find((a: { asset_class: string }) => a.asset_class === 'reit');

      setTargetPercentages({
        equity: Math.round(eqItem?.percentage_of_valued || 60),
        bond: Math.round(bondItem?.percentage_of_valued || 20),
        mf: Math.round(mfItem?.percentage_of_valued || 10),
        sgb: Math.round(sgbItem?.percentage_of_valued || 5),
        reit: Math.round(reitItem?.percentage_of_valued || 5),
        invit: 0,
      });
    }
    simulateMutation.reset();
  }

  // Goal Form Handlers
  async function handleSaveGoal(e: React.FormEvent) {
    e.preventDefault();
    setGoalFormError(null);

    const targetNum = Number(goalTarget);
    const currentNum = Number(goalCurrent || 0);

    if (!goalName.trim()) {
      setGoalFormError('Goal name is required.');
      return;
    }
    if (isNaN(targetNum) || targetNum <= 0) {
      setGoalFormError('Target amount must be a positive number.');
      return;
    }
    if (isNaN(currentNum) || currentNum < 0) {
      setGoalFormError('Recorded funding cannot be negative.');
      return;
    }
    if (!goalDate) {
      setGoalFormError('Target date is required.');
      return;
    }

    try {
      if (editingGoal) {
        const res = await fetch(`/api/goals/${editingGoal.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            goal_name: goalName.trim(),
            target_amount: targetNum,
            current_amount: currentNum,
            target_date: goalDate,
            category: goalCategory,
            priority: goalPriority,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Failed to update goal');
        }
      } else {
        const res = await fetch('/api/goals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            goal_name: goalName.trim(),
            target_amount: targetNum,
            current_amount: currentNum,
            target_date: goalDate,
            category: goalCategory,
            priority: goalPriority,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Failed to create goal');
        }
      }

      queryClient.invalidateQueries({ queryKey: ['investment-goals'] });
      setShowGoalModal(false);
      setEditingGoal(null);
    } catch (err: unknown) {
      setGoalFormError(err instanceof Error ? err.message : 'Database error saving goal.');
    }
  }

  async function handleDeleteGoal(goalId: string) {
    if (!confirm('Are you sure you want to delete this goal? Real holdings remain unaffected.')) return;
    try {
      const res = await fetch(`/api/goals/${goalId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete goal');
      queryClient.invalidateQueries({ queryKey: ['investment-goals'] });
      if (selectedGoalForPlanning?.id === goalId) {
        setSelectedGoalForPlanning(null);
      }
    } catch {
      alert('Failed to delete goal.');
    }
  }

  const targetSum = Object.values(targetPercentages).reduce((a, b) => a + b, 0);
  const simResult: WhatIfSimulationResult | null = simulateMutation.data?.data || null;

  return (
    <div className="page-container space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Portfolio Future Lab
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-brand-500/10 text-brand-500 border border-brand-500/20">
              Interactive What-If Modeling & Goals
            </span>
          </div>
          <p className="text-sm mt-0.5 text-muted">
            Experiment with hypothetical allocations and track goal funding progress without altering real investments.
          </p>
        </div>

        {/* Global Safety Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-warning/30 bg-warning/5 text-warning text-xs font-semibold self-start sm:self-auto">
          <Shield className="w-4 h-4 flex-shrink-0" />
          <span>Hypothetical Scenario — No Real Investments Changed</span>
        </div>
      </div>

      {/* Main Mode Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <button
          onClick={() => setActiveMainTab('simulator')}
          className={`text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
            activeMainTab === 'simulator'
              ? 'bg-brand-500 text-white shadow-sm'
              : 'text-muted hover:text-foreground hover:bg-muted/10'
          }`}
        >
          <FlaskConical className="w-4 h-4" />
          <span>What-If Portfolio Simulator</span>
        </button>

        <button
          onClick={() => setActiveMainTab('goals')}
          className={`text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
            activeMainTab === 'goals'
              ? 'bg-brand-500 text-white shadow-sm'
              : 'text-muted hover:text-foreground hover:bg-muted/10'
          }`}
        >
          <Target className="w-4 h-4" />
          <span>Goal-Based Investment Planning</span>
        </button>
      </div>

      {/* AI Q&A Modal / Banner */}
      <AnimatePresence>
        {aiQuestion && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="card p-5 border-brand-500/40 bg-brand-500/5 space-y-3 relative"
          >
            <button
              onClick={() => {
                setAiQuestion(null);
                setAiResponse(null);
              }}
              className="absolute top-4 right-4 p-1 text-muted hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400 font-semibold text-sm">
              <Sparkles className="w-4 h-4" />
              <span>AI Decision Intelligence: {aiQuestion}</span>
            </div>

            {aiLoading ? (
              <div className="flex items-center gap-2 text-xs text-muted py-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Formulating grounded scenario interpretation...</span>
              </div>
            ) : (
              <div className="text-xs text-foreground/90 leading-relaxed whitespace-pre-line">
                {aiResponse}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================================================= */}
      {/* TAB 1: WHAT-IF PORTFOLIO SIMULATOR                           */}
      {/* ============================================================= */}
      {activeMainTab === 'simulator' && (
        <div className="space-y-6">
          {/* Baseline Summary Card */}
          {xrayData && (
            <div className="card p-5 space-y-3 border-l-4 border-l-brand-500">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Current Portfolio Baseline</h3>
                  <p className="text-xs text-muted">
                    Sourced from your {xrayData.summary.tracked_brokers_count} manually tracked broker accounts.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-mono text-muted">Baseline Capital:</span>
                  <span className="font-mono font-bold text-foreground">
                    {xrayData.summary.market_valued_capital !== null
                      ? formatIndianCurrency(xrayData.summary.market_valued_capital)
                      : formatIndianCurrency(xrayData.summary.total_invested_capital)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
                <div className="p-2.5 rounded-lg bg-muted/10">
                  <span className="text-muted text-[11px]">Quote Coverage</span>
                  <p className="font-bold text-foreground mt-0.5">{xrayData.summary.quote_coverage_pct}%</p>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/10">
                  <span className="text-muted text-[11px]">Distinct Instruments</span>
                  <p className="font-bold text-foreground mt-0.5">{xrayData.summary.distinct_instruments_count}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/10">
                  <span className="text-muted text-[11px]">Cross-Broker Overlaps</span>
                  <p className="font-bold text-brand-500 mt-0.5">{xrayData.summary.cross_broker_overlaps_count}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/10">
                  <span className="text-muted text-[11px]">Unquoted Holdings</span>
                  <p className="font-bold text-warning mt-0.5">{xrayData.data_quality.unquoted_positions}</p>
                </div>
              </div>
            </div>
          )}

          {/* Scenario Configuration Controls */}
          <div className="card p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground">Model a Hypothetical Scenario</h3>
                <p className="text-xs text-muted mt-0.5">
                  Select a pre-calibrated scenario or customize allocation weights and hypothetical contributions.
                </p>
              </div>

              {/* Preset Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => applyPreset('DEFENSIVE')}
                  className="px-2.5 py-1.5 rounded-lg bg-muted/10 hover:bg-muted/20 text-muted hover:text-foreground text-xs font-semibold transition-colors"
                >
                  Preset: Defensive Buffer
                </button>
                <button
                  onClick={() => applyPreset('FRESH_CAPITAL')}
                  className="px-2.5 py-1.5 rounded-lg bg-muted/10 hover:bg-muted/20 text-muted hover:text-foreground text-xs font-semibold transition-colors"
                >
                  Preset: +₹50k Fresh Capital
                </button>
                <button
                  onClick={() => applyPreset('BALANCED_GROWTH')}
                  className="px-2.5 py-1.5 rounded-lg bg-muted/10 hover:bg-muted/20 text-muted hover:text-foreground text-xs font-semibold transition-colors"
                >
                  Preset: Balanced Growth
                </button>
              </div>
            </div>

            {/* Mode Switcher */}
            <div className="flex items-center gap-3">
              {[
                { id: 'TARGET_ALLOCATION', label: 'Target Allocation Percentages' },
                { id: 'REALLOCATION', label: 'Transfer Between Categories' },
                { id: 'NEW_CONTRIBUTION', label: 'Allocate Fresh Contribution' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setScenarioType(m.id as typeof scenarioType)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                    scenarioType === m.id
                      ? 'border-brand-500 bg-brand-500/10 text-brand-600 dark:text-brand-400'
                      : 'border-border text-muted hover:text-foreground'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Mode Controls: TARGET_ALLOCATION */}
            {scenarioType === 'TARGET_ALLOCATION' && (
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { key: 'equity', label: 'Equities & Stocks' },
                    { key: 'bond', label: 'Bonds & Fixed Income' },
                    { key: 'mf', label: 'Mutual Funds' },
                    { key: 'sgb', label: 'Gold & SGBs' },
                    { key: 'reit', label: 'REITs (Real Estate)' },
                    { key: 'invit', label: 'InvITs (Infrastructure)' },
                  ].map((field) => (
                    <div key={field.key} className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-foreground">{field.label}</span>
                        <span className="font-mono text-brand-500 font-bold">
                          {targetPercentages[field.key as keyof typeof targetPercentages]}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={targetPercentages[field.key as keyof typeof targetPercentages]}
                        onChange={(e) =>
                          setTargetPercentages({
                            ...targetPercentages,
                            [field.key]: Number(e.target.value),
                          })
                        }
                        className="w-full accent-brand-500 cursor-pointer"
                      />
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-border/60">
                  <div className="flex items-center gap-2">
                    <span className="text-muted">Allocation Total:</span>
                    <span
                      className={`font-mono font-bold ${
                        targetSum === 100 ? 'text-gain' : 'text-loss'
                      }`}
                    >
                      {targetSum}% {targetSum === 100 ? '✓ (Valid)' : '(Must sum to 100%)'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-muted">Optional Fresh Capital:</span>
                    <input
                      type="number"
                      placeholder="₹0"
                      min="0"
                      step="5000"
                      value={additionalContribution || ''}
                      onChange={(e) => setAdditionalContribution(Math.max(Number(e.target.value), 0))}
                      className="w-28 text-xs px-2 py-1 rounded border border-border bg-surface text-foreground font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Mode Controls: REALLOCATION */}
            {scenarioType === 'REALLOCATION' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
                <div>
                  <label className="font-semibold text-foreground block mb-1">Shift From Category:</label>
                  <select
                    value={transferFrom}
                    onChange={(e) => setTransferFrom(e.target.value as typeof transferFrom)}
                    className="w-full text-xs px-2.5 py-2 rounded-lg border border-border bg-surface text-foreground"
                  >
                    <option value="equity">Equities & Stocks</option>
                    <option value="mf">Mutual Funds</option>
                    <option value="bond">Bonds & Fixed Income</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-foreground block mb-1">Reallocate To Category:</label>
                  <select
                    value={transferTo}
                    onChange={(e) => setTransferTo(e.target.value as typeof transferTo)}
                    className="w-full text-xs px-2.5 py-2 rounded-lg border border-border bg-surface text-foreground"
                  >
                    <option value="bond">Bonds & Fixed Income</option>
                    <option value="reit">REITs (Real Estate)</option>
                    <option value="sgb">Gold & SGBs</option>
                  </select>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <label className="font-semibold text-foreground">Portion to Transfer:</label>
                    <span className="font-mono text-brand-500 font-bold">{transferPercent}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    step="5"
                    value={transferPercent}
                    onChange={(e) => setTransferPercent(Number(e.target.value))}
                    className="w-full accent-brand-500 cursor-pointer mt-1"
                  />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleTriggerSimulation}
                  disabled={simulateMutation.isPending || (scenarioType === 'TARGET_ALLOCATION' && targetSum !== 100)}
                  className="btn-primary text-xs py-2 px-4 inline-flex items-center gap-1.5"
                >
                  <FlaskConical className="w-3.5 h-3.5" />
                  <span>{simulateMutation.isPending ? 'Simulating...' : 'Run Simulation'}</span>
                </button>

                <button
                  onClick={handleResetToBaseline}
                  className="btn-secondary text-xs py-2 px-3"
                >
                  Reset Baseline
                </button>
              </div>

              {/* Quick AI Explanation */}
              <button
                onClick={() => handleAskAi('How does this hypothetical allocation compare with my current portfolio?')}
                className="text-xs text-brand-500 hover:underline inline-flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Explain allocation tradeoff with AI</span>
              </button>
            </div>
          </div>

          {/* Before-versus-After Comparison Section */}
          {simResult && (
            <div className="space-y-4">
              <div className="card p-5 space-y-4 border-l-4 border-l-brand-500">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-foreground">
                      {simResult.educationalScenarioSummary.title}
                    </h3>
                    <p className="text-xs text-muted mt-0.5">
                      {simResult.educationalScenarioSummary.description}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded text-xs font-semibold bg-brand-500/10 text-brand-500">
                    Modeled Total: {formatIndianCurrency(simResult.simulatedSummary.totalSimulatedCapital)}
                  </span>
                </div>

                {/* Key Metric Comparison Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/10 text-muted uppercase text-[10px] border-b border-border">
                      <tr>
                        <th className="py-2.5 px-3">Metric</th>
                        <th className="py-2.5 px-3">Current Portfolio</th>
                        <th className="py-2.5 px-3 font-semibold text-brand-500">Hypothetical Scenario</th>
                        <th className="py-2.5 px-3">Change Delta</th>
                        <th className="py-2.5 px-3">Diagnostic Consideration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {simResult.metricComparisons.map((m) => (
                        <tr key={m.metricName} className="hover:bg-muted/5">
                          <td className="py-2.5 px-3 font-semibold text-foreground">{m.metricName}</td>
                          <td className="py-2.5 px-3 font-mono text-muted">{m.currentValue}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-foreground">{m.simulatedValue}</td>
                          <td className="py-2.5 px-3 font-mono">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                m.direction === 'INCREASED'
                                  ? 'bg-gain/10 text-gain'
                                  : m.direction === 'DECREASED'
                                  ? 'bg-warning/10 text-warning'
                                  : 'bg-muted/10 text-muted'
                              }`}
                            >
                              {m.changeDelta}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-muted text-[11px]">{m.educationalNote}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Educational Takeaway & Assumptions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-border text-xs">
                  <div className="p-3 rounded-lg bg-muted/10">
                    <p className="font-semibold text-foreground">Key Financial Takeaway:</p>
                    <p className="text-muted mt-1 leading-relaxed">
                      {simResult.educationalScenarioSummary.keyTakeaway}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-muted/10">
                    <p className="font-semibold text-foreground">Assumptions & Limitations:</p>
                    <ul className="list-disc list-inside text-muted mt-1 space-y-0.5 text-[11px]">
                      {simResult.educationalScenarioSummary.assumptionsAndLimitations.map((a, i) => (
                        <li key={i}>{a}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 2: GOAL-BASED INVESTMENT PLANNING                         */}
      {/* ============================================================= */}
      {activeMainTab === 'goals' && (
        <div className="space-y-6">
          {/* Goals Header & Add Goal Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
            <div>
              <h2 className="text-lg font-bold text-foreground">Personal Financial Goals</h2>
              <p className="text-xs text-muted mt-0.5">
                Track funding targets for education, housing, retirement, and emergency funds.
              </p>
            </div>

            <button
              onClick={() => {
                setEditingGoal(null);
                setGoalName('');
                setGoalTarget('');
                setGoalCurrent('');
                setGoalDate('');
                setGoalCategory('GENERAL');
                setGoalPriority('MEDIUM');
                setShowGoalModal(true);
              }}
              className="btn-primary text-xs py-2 px-3 inline-flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Financial Goal</span>
            </button>
          </div>

          {/* Goal Funding Safeguard Banner */}
          <div className="p-3.5 rounded-xl bg-muted/10 border border-border text-xs text-muted flex items-start gap-2.5">
            <Info className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground">Funding Integrity Notice</p>
              <p className="mt-0.5">
                Goal funding is recorded as <strong>Manually Tracked Funding</strong>. It is not automatically deducted from or added to your total portfolio value to prevent artificial double-counting across overlapping goals.
              </p>
            </div>
          </div>

          {/* Goals List */}
          {goalsData && goalsData.length === 0 ? (
            <div className="card p-12 text-center space-y-3">
              <Target className="w-10 h-10 text-brand-500 mx-auto" />
              <h3 className="text-base font-bold text-foreground">No Financial Goals Set Yet</h3>
              <p className="text-xs text-muted max-w-sm mx-auto">
                Define an emergency fund, higher education target, or home purchase goal to project your monthly savings pace.
              </p>
              <button
                onClick={() => setShowGoalModal(true)}
                className="btn-primary text-xs py-2 px-4 mt-2"
              >
                Create Your First Goal
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {goalsData?.map((g) => {
                const prog = g.progress;
                const isSelected = selectedGoalForPlanning?.id === g.id;

                return (
                  <div
                    key={g.id}
                    className={`card p-4 space-y-3 transition-all cursor-pointer ${
                      isSelected ? 'border-brand-500 ring-1 ring-brand-500' : 'hover:border-border/80'
                    }`}
                    onClick={() => setSelectedGoalForPlanning(g)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-sm font-bold text-foreground">{g.goal_name}</h4>
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-muted/10 text-muted uppercase">
                            {g.category}
                          </span>
                        </div>
                        <p className="text-xs text-muted mt-0.5 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>Target: {new Date(g.target_date).toLocaleDateString('en-IN')}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            setEditingGoal(g);
                            setGoalName(g.goal_name);
                            setGoalTarget(String(g.target_amount));
                            setGoalCurrent(String(g.current_amount));
                            setGoalDate(g.target_date);
                            setGoalCategory(g.category);
                            setGoalPriority(g.priority);
                            setShowGoalModal(true);
                          }}
                          className="p-1 rounded hover:bg-muted/10 text-muted hover:text-foreground"
                          title="Edit Goal"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteGoal(g.id)}
                          className="p-1 rounded hover:bg-muted/10 text-muted hover:text-loss"
                          title="Delete Goal"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted">Funding Progress:</span>
                        <span
                          className={`font-bold font-mono ${
                            prog.isOverfunded ? 'text-gain' : 'text-brand-500'
                          }`}
                        >
                          {prog.fundingProgressPct.toFixed(1)}% {prog.isOverfunded ? '(Overfunded)' : ''}
                        </span>
                      </div>
                      <div className="w-full bg-muted/20 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            prog.isOverfunded ? 'bg-gain' : 'bg-brand-500'
                          }`}
                          style={{ width: `${Math.min(prog.fundingProgressPct, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Numerical Stats */}
                    <div className="pt-2 border-t border-border/60 text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted">Recorded Funding:</span>
                        <span className="font-mono font-bold text-foreground">
                          {formatIndianCurrency(g.current_amount)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted">Target Amount:</span>
                        <span className="font-mono text-muted">
                          {formatIndianCurrency(g.target_amount)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted">Remaining Gap:</span>
                        <span className="font-mono font-semibold text-warning">
                          {formatIndianCurrency(prog.remainingAmount)}
                        </span>
                      </div>
                    </div>

                    <div className="pt-1 flex items-center justify-between text-[11px] text-muted">
                      <span>{prog.remainingMonths} month(s) left</span>
                      <span className="text-brand-500 font-semibold">
                        Click to Plan Contributions →
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Interactive Zero-Growth Contribution Planner */}
          {selectedGoalForPlanning && (
            <div className="card p-6 space-y-4 border-l-4 border-l-brand-500">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    Zero-Growth Contribution Planner: {selectedGoalForPlanning.goal_name}
                  </h3>
                  <p className="text-xs text-muted mt-0.5">
                    Isolate the exact savings contribution required under a 0% return assumption.
                  </p>
                </div>
                <button
                  onClick={() => handleAskAi(`How much more would I need to contribute toward my ${selectedGoalForPlanning.goal_name} goal?`)}
                  className="text-xs text-brand-500 hover:underline inline-flex items-center gap-1 self-start sm:self-auto"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Ask AI: Goal Funding Pace</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-3 rounded-lg bg-muted/10 space-y-0.5">
                  <span className="text-muted">Remaining Gap to Target:</span>
                  <p className="text-lg font-bold font-mono text-warning">
                    {formatIndianCurrency(selectedGoalForPlanning.progress.remainingAmount)}
                  </p>
                  <p className="text-[11px] text-muted">{selectedGoalForPlanning.progress.remainingMonths} months remaining</p>
                </div>

                <div className="p-3 rounded-lg bg-brand-500/10 space-y-0.5">
                  <span className="text-muted">Required Monthly Savings (Zero-Growth):</span>
                  <p className="text-lg font-bold font-mono text-brand-600 dark:text-brand-400">
                    {formatIndianCurrency(selectedGoalForPlanning.progress.requiredMonthlyContributionZeroGrowth)}
                  </p>
                  <p className="text-[11px] text-muted">Pure monthly savings without investment risk</p>
                </div>

                <div className="p-3 rounded-lg bg-muted/10 space-y-1">
                  <span className="text-muted">Simulate Your Monthly Savings:</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="1000"
                      min="0"
                      value={monthlyContributionInput}
                      onChange={(e) => setMonthlyContributionInput(Math.max(Number(e.target.value), 0))}
                      className="w-full text-xs px-2.5 py-1.5 rounded border border-border bg-surface text-foreground font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Simulation Result for this Goal */}
              {(() => {
                const totalSimulatedSavings =
                  selectedGoalForPlanning.current_amount +
                  monthlyContributionInput * selectedGoalForPlanning.progress.remainingMonths;
                const reachesGoal = totalSimulatedSavings >= selectedGoalForPlanning.target_amount;
                const simulatedGap = Math.max(selectedGoalForPlanning.target_amount - totalSimulatedSavings, 0);

                return (
                  <div className="p-3.5 rounded-xl border border-border/80 bg-surface text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">Plan Feasibility Check:</span>
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          reachesGoal ? 'bg-gain/10 text-gain' : 'bg-warning/10 text-warning'
                        }`}
                      >
                        {reachesGoal ? 'Reaches Stated Goal ✓' : 'Leaves Funding Gap'}
                      </span>
                    </div>
                    <p className="text-muted leading-relaxed">
                      At {formatIndianCurrency(monthlyContributionInput)}/month, you will contribute {formatIndianCurrency(monthlyContributionInput * selectedGoalForPlanning.progress.remainingMonths)} over {selectedGoalForPlanning.progress.remainingMonths} months. Total funding at target date will be {formatIndianCurrency(totalSimulatedSavings)}.
                      {!reachesGoal && ` An illustrative gap of ${formatIndianCurrency(simulatedGap)} remains.`}
                    </p>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Goal Modal */}
      <AnimatePresence>
        {showGoalModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="card max-w-md w-full p-6 space-y-4 shadow-2xl relative"
            >
              <button
                onClick={() => setShowGoalModal(false)}
                className="absolute top-4 right-4 p-1 text-muted hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>

              <div>
                <h3 className="text-lg font-bold text-foreground">
                  {editingGoal ? 'Edit Investment Goal' : 'Create New Financial Goal'}
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  Set target amounts and target dates for structured savings planning.
                </p>
              </div>

              {goalFormError && (
                <div className="p-2.5 rounded-lg bg-loss/10 border border-loss/20 text-loss text-xs">
                  {goalFormError}
                </div>
              )}

              <form onSubmit={handleSaveGoal} className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-foreground block mb-1">Goal Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Higher Education Fund, Home Downpayment"
                    value={goalName}
                    onChange={(e) => setGoalName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-foreground"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-foreground block mb-1">Target Amount (₹) *</label>
                    <input
                      type="number"
                      required
                      min="1000"
                      step="5000"
                      placeholder="₹5,00,000"
                      value={goalTarget}
                      onChange={(e) => setGoalTarget(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-foreground font-mono"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-foreground block mb-1">Recorded Funding (₹)</label>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      placeholder="₹0"
                      value={goalCurrent}
                      onChange={(e) => setGoalCurrent(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-foreground font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-foreground block mb-1">Target Date *</label>
                    <input
                      type="date"
                      required
                      value={goalDate}
                      onChange={(e) => setGoalDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-foreground"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-foreground block mb-1">Category</label>
                    <select
                      value={goalCategory}
                      onChange={(e) => setGoalCategory(e.target.value as GoalCategory)}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-foreground"
                    >
                      <option value="GENERAL">General Wealth</option>
                      <option value="EMERGENCY_FUND">Emergency Fund</option>
                      <option value="EDUCATION">Higher Education</option>
                      <option value="HOME">Home Purchase</option>
                      <option value="RETIREMENT">Retirement</option>
                      <option value="VEHICLE">Vehicle Purchase</option>
                      <option value="VACATION">Vacation / Travel</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowGoalModal(false)}
                    className="btn-secondary text-xs py-2 px-3"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary text-xs py-2 px-4">
                    {editingGoal ? 'Update Goal' : 'Save Goal'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
