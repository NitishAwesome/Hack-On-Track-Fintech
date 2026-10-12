'use client';

// ============================================================
// FINOVA — Innovation One & Two: Portfolio Future Lab 2.0 Page
// app/(dashboard)/future-lab/page.tsx
//
// Primary Experience: Smart Investment Strategy Simulator
// - Step A: Investment Amount Input & Quick Chips (₹10k, ₹25k, ₹50k, ₹1L)
// - Step B: Interactive Three-Strategy Selection (Conservative, Balanced, Aggressive)
// - Step C: Optional Investor Preferences Context
// - Instant Recharts Donut & Reconciled Rupee Category Breakdown
// - Side-by-Side Comparison Table for all 3 Strategies
// - Grounded Before-versus-After Portfolio Comparison Card
// - Review Your Existing Holdings (X-Ray Holding Outlook & Research Steps)
// - Optional Advanced Rebalancing Sandbox (Relocated Category Transfer)
// - Preserved Financial Goals Planner & Zero-Growth Savings Pacemaker
// ============================================================

import React, { useState, useMemo } from 'react';
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
  BookOpen,
  ArrowRight,
  HelpCircle,
} from 'lucide-react';

import {
  calculateStrategyAllocation,
  calculatePortfolioBeforeAfter,
  STRATEGY_TEMPLATES,
  type StrategyId,
  type GoalProgressMetrics,
} from '@/lib/calculations/futureLab';
import type { GoalCategory, GoalPriority } from '@/types/database';
import type { HoldingWithMetrics } from '@/types/portfolio';
import { formatIndianCurrency } from '@/lib/utils';

// Future Lab 2.0 Modular Components
import { StrategySelector } from '@/components/futureLab/StrategySelector';
import { SimulatedAllocationDisplay } from '@/components/futureLab/SimulatedAllocationDisplay';
import { StrategyComparisonTable } from '@/components/futureLab/StrategyComparisonTable';
import { PortfolioBeforeAfterCard } from '@/components/futureLab/PortfolioBeforeAfterCard';
import { ExistingHoldingsReview } from '@/components/futureLab/ExistingHoldingsReview';
import { AssetClassEducationModal } from '@/components/futureLab/AssetClassEducationModal';
import { AdvancedRebalancingDrawer } from '@/components/futureLab/AdvancedRebalancingDrawer';

async function fetchBaselineXRay() {
  const res = await fetch('/api/portfolio/xray');
  if (!res.ok) throw new Error('Failed to load portfolio baseline');
  const json = await res.json();
  return json.data;
}

async function fetchHoldings() {
  const res = await fetch('/api/portfolio/holdings');
  if (!res.ok) return [];
  const json = await res.json();
  return json.data || [];
}

async function fetchGoals() {
  const res = await fetch('/api/goals');
  if (!res.ok) throw new Error('Failed to load investment goals');
  const json = await res.json();
  return json.data || [];
}

async function fetchNews() {
  const res = await fetch('/api/news');
  if (!res.ok) return [];
  const json = await res.json();
  return json.articles || [];
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
  const [activeMainTab, setActiveMainTab] = useState<'simulator' | 'goals'>('simulator');

  // Education Modal State
  const [showEducationModal, setShowEducationModal] = useState<boolean>(false);

  // Strategy Simulator State
  const [investmentAmount, setInvestmentAmount] = useState<number>(100000);
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyId>('balanced');

  // Baseline X-Ray, Holdings & Goals Queries
  const { data: xrayData, isLoading: xrayLoading } = useQuery({
    queryKey: ['portfolio-xray-baseline'],
    queryFn: fetchBaselineXRay,
    staleTime: 60000,
  });

  const { data: holdingsData = [] } = useQuery<HoldingWithMetrics[]>({
    queryKey: ['portfolio-holdings'],
    queryFn: fetchHoldings,
    staleTime: 60000,
  });

  const { data: goalsData, isLoading: goalsLoading } = useQuery<GoalRowDecorated[]>({
    queryKey: ['investment-goals'],
    queryFn: fetchGoals,
    staleTime: 30000,
  });

  const { data: newsArticles = [] } = useQuery({
    queryKey: ['portfolio-news-future-lab'],
    queryFn: fetchNews,
    staleTime: 60000,
  });

  // Calculate allocation deterministically & immediately
  const simulatedAllocation = useMemo(() => {
    return calculateStrategyAllocation(investmentAmount, selectedStrategy);
  }, [investmentAmount, selectedStrategy]);

  // Calculate before-after comparison against real portfolio
  const beforeAfterComparison = useMemo(() => {
    return calculatePortfolioBeforeAfter(holdingsData, [], investmentAmount, selectedStrategy);
  }, [holdingsData, investmentAmount, selectedStrategy]);

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

  async function handleAskAi(queryLabel: string, topic = 'scenario_planning') {
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
            simulatedAmount: investmentAmount,
            strategyChosen: selectedStrategy,
            equityPct: simulatedAllocation.exposures.equityPct,
            defensivePct: simulatedAllocation.exposures.defensivePct,
            currentEquityPct: beforeAfterComparison.baseline.equityWeightPct,
            simulatedEquityPct: beforeAfterComparison.simulated.equityWeightPct,
            topHoldingName: xrayData?.consolidated_instruments?.[0]?.name,
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

  // Create or Update Goal Mutation
  const saveGoalMutation = useMutation({
    mutationFn: async (payload: {
      name: string;
      target_amount: number;
      current_amount: number;
      target_date: string;
      category: GoalCategory;
      priority: GoalPriority;
    }) => {
      const url = editingGoal ? `/api/goals/${editingGoal.id}` : '/api/goals';
      const method = editingGoal ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save goal');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investment-goals'] });
      setShowGoalModal(false);
      setEditingGoal(null);
      setGoalName('');
      setGoalTarget('');
      setGoalCurrent('');
      setGoalDate('');
      setGoalFormError(null);
    },
    onError: (err: Error) => {
      setGoalFormError(err.message);
    },
  });

  // Delete Goal Mutation
  const deleteGoalMutation = useMutation({
    mutationFn: async (goalId: string) => {
      const res = await fetch(`/api/goals/${goalId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete goal');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investment-goals'] });
      if (selectedGoalForPlanning?.id) {
        setSelectedGoalForPlanning(null);
      }
    },
  });

  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    setGoalFormError(null);
    const targetNum = Number(goalTarget);
    const currentNum = Number(goalCurrent || '0');

    if (!goalName.trim()) {
      setGoalFormError('Goal name is required.');
      return;
    }
    if (isNaN(targetNum) || targetNum <= 0) {
      setGoalFormError('Please enter a valid positive target amount.');
      return;
    }
    if (!goalDate) {
      setGoalFormError('Please select a target date.');
      return;
    }

    saveGoalMutation.mutate({
      name: goalName.trim(),
      target_amount: targetNum,
      current_amount: currentNum,
      target_date: goalDate,
      category: goalCategory,
      priority: goalPriority,
    });
  };

  const handleDeleteGoal = (id: string) => {
    if (window.confirm('Are you sure you want to delete this financial goal?')) {
      deleteGoalMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* ─── Hero Header ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center gap-1.5">
              <FlaskConical className="w-3.5 h-3.5" />
              Future Lab
            </span>
            <span className="text-xs text-slate-500">•</span>
            <span className="text-xs text-slate-400">Simulation & Planning Sandbox</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
            Smart Investment Strategy Simulator
          </h1>
          <p className="text-sm text-slate-400 max-w-2xl mt-1">
            Simulate allocation scenarios, compare strategic trade-offs, and inspect hypothetical diversification impact without executing real trades.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowEducationModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors shadow-sm"
          >
            <BookOpen className="w-4 h-4 text-blue-400" />
            <span>Asset Classes Guide</span>
          </button>

          <button
            type="button"
            onClick={() => handleAskAi(`How does a ${selectedStrategy} strategy allocation of ₹${investmentAmount.toLocaleString('en-IN')} impact my overall portfolio balance?`)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/20 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            <span>Ask AI Explainer</span>
          </button>
        </div>
      </div>

      {/* ─── Main Tabs Navigation ───────────────────────────────── */}
      <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-900 border border-slate-800 w-fit">
        <button
          type="button"
          onClick={() => setActiveMainTab('simulator')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeMainTab === 'simulator'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <FlaskConical className="w-4 h-4" />
          <span>Strategy Simulator</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('goals')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeMainTab === 'goals'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Target className="w-4 h-4" />
          <span>Financial Goals ({goalsData?.length || 0})</span>
        </button>
      </div>

      {/* ─── TAB 1: STRATEGY SIMULATOR ──────────────────────────── */}
      {activeMainTab === 'simulator' && (
        <div className="space-y-8">
          {/* Step A & B: Strategy Builder Input & Cards */}
          <StrategySelector
            investmentAmount={investmentAmount}
            onAmountChange={setInvestmentAmount}
            selectedStrategy={selectedStrategy}
            onSelectStrategy={setSelectedStrategy}
            onOpenEducationModal={() => setShowEducationModal(true)}
          />

          {/* Real-time Allocation Breakdown */}
          <SimulatedAllocationDisplay
            allocation={simulatedAllocation}
            selectedStrategy={selectedStrategy}
          />

          {/* Side-by-Side Comparison Matrix */}
          <StrategyComparisonTable
            selectedStrategy={selectedStrategy}
            onSelectStrategy={setSelectedStrategy}
          />

          {/* Before vs After Real Portfolio Comparison */}
          <PortfolioBeforeAfterCard
            comparison={beforeAfterComparison}
            selectedStrategy={selectedStrategy}
            strategyName={STRATEGY_TEMPLATES[selectedStrategy].name}
          />

          {/* Your Holdings — What Should You Research Next? */}
          <ExistingHoldingsReview
            instruments={xrayData?.consolidated_instruments || []}
            articles={newsArticles}
            onExploreAlternatives={() => setShowEducationModal(true)}
          />

          {/* Advanced Rebalancing Sandbox (Relocated What-If Category Transfer) */}
          <AdvancedRebalancingDrawer
            holdings={holdingsData}
          />
        </div>
      )}

      {/* ─── TAB 2: FINANCIAL GOALS PLANNER ─────────────────────── */}
      {activeMainTab === 'goals' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                Financial Goals & Savings Pacemaker
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Calculate required monthly savings under a conservative 0% return benchmark to isolate your exact funding progress.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingGoal(null);
                setGoalName('');
                setGoalTarget('');
                setGoalCurrent('');
                setGoalDate('');
                setGoalFormError(null);
                setShowGoalModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Goal</span>
            </button>
          </div>

          {/* Funding Safeguard Notice */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <span className="font-semibold text-slate-300">Funding Integrity Notice: </span>
              Goal funding is recorded as <strong>Manually Tracked Funding</strong>. It is not automatically deducted from or added to your total portfolio value to prevent artificial double-counting across overlapping goals.
            </div>
          </div>

          {/* Goals List */}
          {goalsData && goalsData.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
              <Target className="w-10 h-10 text-purple-400 mx-auto" />
              <h4 className="text-base font-bold text-white">No Financial Goals Set Yet</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Define an emergency fund, higher education target, or home purchase goal to project your monthly savings pace.
              </p>
              <button
                type="button"
                onClick={() => setShowGoalModal(true)}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors mt-2"
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
                    onClick={() => setSelectedGoalForPlanning(g)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer bg-slate-900/70 space-y-3 ${
                      isSelected
                        ? 'border-blue-500 ring-1 ring-blue-500 bg-slate-900'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-sm font-bold text-white">{g.goal_name}</h4>
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-slate-800 text-slate-300 uppercase">
                            {g.category}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          <span>Target: {new Date(g.target_date).toLocaleDateString('en-IN')}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
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
                          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                          title="Edit Goal"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteGoal(g.id)}
                          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-400"
                          title="Delete Goal"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Funding Progress:</span>
                        <span className={`font-bold font-mono ${prog.isOverfunded ? 'text-emerald-400' : 'text-blue-400'}`}>
                          {prog.fundingProgressPct.toFixed(1)}% {prog.isOverfunded ? '(Overfunded)' : ''}
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${prog.isOverfunded ? 'bg-emerald-500' : 'bg-blue-500'}`}
                          style={{ width: `${Math.min(prog.fundingProgressPct, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Numerical Stats */}
                    <div className="pt-2 border-t border-slate-800/80 text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Recorded Funding:</span>
                        <span className="font-mono font-bold text-white">{formatIndianCurrency(g.current_amount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Target Amount:</span>
                        <span className="font-mono text-slate-400">{formatIndianCurrency(g.target_amount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Remaining Gap:</span>
                        <span className="font-mono font-semibold text-amber-400">{formatIndianCurrency(prog.remainingAmount)}</span>
                      </div>
                    </div>

                    <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400">
                      <span>{prog.remainingMonths} month(s) left</span>
                      <span className="text-blue-400 font-semibold">Click to Plan Contributions →</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Interactive Zero-Growth Contribution Planner */}
          {selectedGoalForPlanning && (
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 border-l-4 border-l-blue-500">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <h4 className="text-base font-bold text-white">
                    Zero-Growth Contribution Planner: {selectedGoalForPlanning.goal_name}
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Isolate the exact savings contribution required under a 0% return assumption.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleAskAi(`How much more would I need to contribute toward my ${selectedGoalForPlanning.goal_name} goal?`)}
                  className="text-xs text-purple-400 hover:underline inline-flex items-center gap-1 self-start sm:self-auto"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Ask AI: Goal Funding Pace</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-0.5">
                  <span className="text-slate-400">Remaining Gap to Target:</span>
                  <p className="text-lg font-bold font-mono text-amber-400">
                    {formatIndianCurrency(selectedGoalForPlanning.progress.remainingAmount)}
                  </p>
                  <p className="text-[11px] text-slate-500">{selectedGoalForPlanning.progress.remainingMonths} months remaining</p>
                </div>

                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 space-y-0.5">
                  <span className="text-slate-400">Required Monthly Savings:</span>
                  <p className="text-lg font-bold font-mono text-blue-400">
                    {formatIndianCurrency(selectedGoalForPlanning.progress.requiredMonthlyContributionZeroGrowth)}
                  </p>
                  <p className="text-[11px] text-slate-500">Pure monthly savings without market risk</p>
                </div>

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-slate-400">Simulate Your Monthly Savings:</span>
                  <input
                    type="number"
                    step="1000"
                    min="0"
                    value={monthlyContributionInput}
                    onChange={(e) => setMonthlyContributionInput(Math.max(Number(e.target.value), 0))}
                    className="w-full text-xs px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-white font-mono outline-none"
                  />
                </div>
              </div>

              {/* Simulation Result */}
              {(() => {
                const totalSimulatedSavings =
                  selectedGoalForPlanning.current_amount +
                  monthlyContributionInput * selectedGoalForPlanning.progress.remainingMonths;
                const reachesGoal = totalSimulatedSavings >= selectedGoalForPlanning.target_amount;
                const simulatedGap = Math.max(selectedGoalForPlanning.target_amount - totalSimulatedSavings, 0);

                return (
                  <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/70 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">Plan Feasibility Check:</span>
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${reachesGoal ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                        {reachesGoal ? 'Reaches Stated Goal ✓' : 'Leaves Funding Gap'}
                      </span>
                    </div>
                    <p className="text-slate-300 leading-relaxed text-[11px]">
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

      {/* ─── AI Explainer Modal ──────────────────────────────────── */}
      {aiQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl relative space-y-4">
            <button
              type="button"
              onClick={() => setAiQuestion(null)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <h3 className="text-base font-bold text-white">AI Strategy Explainer</h3>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-purple-300">
              {aiQuestion}
            </div>

            {aiLoading ? (
              <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-purple-400" />
                <span>Generating deterministic educational explanation...</span>
              </div>
            ) : (
              <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto">
                {aiResponse}
              </div>
            )}

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setAiQuestion(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Add / Edit Goal Modal ───────────────────────────────── */}
      {showGoalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowGoalModal(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-lg font-bold text-white">
                {editingGoal ? 'Edit Investment Goal' : 'Create New Financial Goal'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Set target amounts and dates for structured zero-growth savings planning.
              </p>
            </div>

            {goalFormError && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {goalFormError}
              </div>
            )}

            <form onSubmit={handleSaveGoal} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-300 block mb-1">Goal Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Higher Education, Home Downpayment"
                  value={goalName}
                  onChange={(e) => setGoalName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-800 bg-slate-950 text-white outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Target Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1000"
                    step="5000"
                    placeholder="₹5,00,000"
                    value={goalTarget}
                    onChange={(e) => setGoalTarget(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-800 bg-slate-950 text-white font-mono outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Recorded Funding (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="₹0"
                    value={goalCurrent}
                    onChange={(e) => setGoalCurrent(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-800 bg-slate-950 text-white font-mono outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Target Date *</label>
                  <input
                    type="date"
                    required
                    value={goalDate}
                    onChange={(e) => setGoalDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-800 bg-slate-950 text-white outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Category</label>
                  <select
                    value={goalCategory}
                    onChange={(e) => setGoalCategory(e.target.value as GoalCategory)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-800 bg-slate-950 text-white outline-none focus:border-blue-500"
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
                  className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveGoalMutation.isPending}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
                >
                  {saveGoalMutation.isPending ? 'Saving...' : editingGoal ? 'Update Goal' : 'Save Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Educational Guide Modal ────────────────────────────── */}
      <AssetClassEducationModal
        isOpen={showEducationModal}
        onClose={() => setShowEducationModal(false)}
      />
    </div>
  );
}
