'use client';

// ============================================================
// FINOVA — Innovation One & Two: Portfolio Future Lab 2.0 Page
// Shared Future Lab and Financial Goals workspace
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
// - Baseline allocation reset invariant: eqItem?.percentage_of_valued ?? 0 and invitItem?.percentage_of_valued ?? 0
// ============================================================

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usePrivateQuery as useQuery } from '@/lib/hooks/usePrivateQuery';
import {
  FlaskConical,
  Target,
  Sparkles,
  RefreshCw,
  Plus,
  X,
  BookOpen,
} from 'lucide-react';

import {
  calculateStrategyAllocation,
  calculatePortfolioBeforeAfter,
  STRATEGY_TEMPLATES,
  type StrategyId,
} from '@/lib/calculations/futureLab';
import type { GoalCategory, GoalPriority } from '@/types/database';
import type { HoldingWithMetrics } from '@/types/portfolio';
import { goalPayloadFromForm, type GoalWritePayload } from '@/lib/goals/goalForm';
import { useDialogFocus } from '@/lib/hooks/useDialogFocus';
import { FinancialGoalsBoard } from '@/components/goals/FinancialGoalsBoard';
import type { GoalRecord } from '@/lib/goals/planning';

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
  if (!res.ok) throw new Error('Failed to load holdings');
  const json = await res.json();
  return json.holdings || [];
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

export function FutureLabWorkspace({ tab }: { tab: 'simulator' | 'goals' }) {
  const queryClient = useQueryClient();
  const activeMainTab = tab;

  // Education Modal State
  const [showEducationModal, setShowEducationModal] = useState<boolean>(false);

  // Strategy Simulator State
  const [investmentAmount, setInvestmentAmount] = useState<number>(100000);
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyId>('balanced');

  // Baseline X-Ray, Holdings & Goals Queries
  const { data: xrayData } = useQuery({
    queryKey: ['portfolio-xray-baseline'],
    queryFn: fetchBaselineXRay,
    enabled: activeMainTab === 'simulator',
    staleTime: 60000,
  });

  const { data: holdingsData = [], isLoading: holdingsLoading, error: holdingsError } = useQuery<HoldingWithMetrics[]>({
    queryKey: ['portfolio-holdings'],
    queryFn: fetchHoldings,
    enabled: activeMainTab === 'simulator',
    staleTime: 60000,
  });

  const { data: goalsData, isLoading: goalsLoading, error: goalsError, refetch: refetchGoals } = useQuery<GoalRecord[]>({
    queryKey: ['investment-goals'],
    queryFn: fetchGoals,
    staleTime: 30000,
  });

  const { data: newsArticles = [] } = useQuery({
    queryKey: ['portfolio-news-future-lab'],
    queryFn: fetchNews,
    enabled: activeMainTab === 'simulator',
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
  const [editingGoal, setEditingGoal] = useState<GoalRecord | null>(null);
  const [goalName, setGoalName] = useState<string>('');
  const [goalTarget, setGoalTarget] = useState<string>('');
  const [goalCurrent, setGoalCurrent] = useState<string>('');
  const [goalDate, setGoalDate] = useState<string>('');
  const [goalCategory, setGoalCategory] = useState<GoalCategory>('GENERAL');
  const [goalPriority, setGoalPriority] = useState<GoalPriority>('MEDIUM');
  const [goalFormError, setGoalFormError] = useState<string | null>(null);

  // Zero-Growth Contribution Calculator State
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);

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
    mutationFn: async (payload: GoalWritePayload) => {
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
    onSuccess: (result) => {
      if (typeof result.data?.id === 'string') setSelectedGoalId(result.data.id);
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
    onSuccess: (_data, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['investment-goals'] });
      if (selectedGoalId === deletedId) {
        setSelectedGoalId(null);
      }
    },
  });

  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    setGoalFormError(null);
    const result = goalPayloadFromForm({
      goal_name: goalName,
      target_amount: goalTarget,
      current_amount: goalCurrent,
      target_date: goalDate,
      category: goalCategory,
      priority: goalPriority,
    });
    if (result.payload) saveGoalMutation.mutate(result.payload);
    else setGoalFormError(result.error);
  };

  const closeGoalModal = () => { if (!saveGoalMutation.isPending) setShowGoalModal(false); };
  const goalDialogRef = useDialogFocus(showGoalModal, closeGoalModal);
  const aiDialogRef = useDialogFocus(Boolean(aiQuestion), () => setAiQuestion(null));
  const openNewGoal = (draft: Partial<GoalWritePayload> = {}) => {
    setEditingGoal(null); setGoalName(draft.goal_name || '');
    setGoalTarget(draft.target_amount === undefined ? '' : String(draft.target_amount));
    setGoalCurrent(draft.current_amount === undefined ? '' : String(draft.current_amount));
    setGoalDate(draft.target_date || ''); setGoalCategory(draft.category || 'GENERAL');
    setGoalPriority(draft.priority || 'MEDIUM'); setGoalFormError(null);
    saveGoalMutation.reset(); setShowGoalModal(true);
  };
  const editGoal = (goal: GoalRecord) => {
    setEditingGoal(goal); setGoalName(goal.goal_name); setGoalTarget(String(goal.target_amount));
    setGoalCurrent(String(goal.current_amount)); setGoalDate(goal.target_date);
    setGoalCategory(goal.category); setGoalPriority(goal.priority); setGoalFormError(null);
    saveGoalMutation.reset(); setShowGoalModal(true);
  };

  const handleDeleteGoal = (id: string) => {
    if (window.confirm('Are you sure you want to delete this financial goal?')) {
      deleteGoalMutation.mutate(id);
    }
  };

  return (
    <div className="page-container space-y-6 pb-16">
      {/* ─── Hero Header ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-border px-6 py-5" style={{ background: 'linear-gradient(135deg, rgb(var(--surface)), rgb(var(--surface-raised)))' }}>
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20 flex items-center gap-1.5">
              {activeMainTab === 'goals' ? <Target className="w-3.5 h-3.5" /> : <FlaskConical className="w-3.5 h-3.5" />}
              {activeMainTab === 'goals' ? 'Financial Goals' : 'Future Lab'}
            </span>
            <span className="text-xs text-muted dark:text-slate-500">•</span>
            <span className="text-xs text-muted dark:text-slate-400">{activeMainTab === 'goals' ? 'Savings & Funding Plans' : 'Simulation & Planning Sandbox'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground dark:text-white tracking-tight mt-1">
            {activeMainTab === 'goals' ? 'Financial Goals & Savings Planner' : 'Smart Investment Strategy Simulator'}
          </h1>
          <p className="text-sm text-muted dark:text-slate-400 max-w-2xl mt-1">
            {activeMainTab === 'goals' ? 'Track recorded goal funding and calculate the monthly savings needed under a zero-growth assumption.' : 'Simulate allocation scenarios, compare strategic trade-offs, and inspect hypothetical diversification impact without executing real trades.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {activeMainTab === 'goals' ? <button type="button" onClick={() => openNewGoal()} className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors"><Plus className="w-4 h-4" />Create New Goal</button> : <>
          <button
            type="button"
            onClick={() => setShowEducationModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-surface-raised dark:bg-slate-800 hover:bg-surface-raised dark:hover:bg-slate-700 text-foreground dark:text-slate-200 border border-border dark:border-slate-700 transition-colors shadow-sm"
          >
            <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
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
          </>}
        </div>
      </div>

      {/* ─── Main Tabs Navigation ───────────────────────────────── */}
      <nav aria-label="Planning pages" className="flex items-center gap-2 p-1 rounded-xl bg-surface dark:bg-slate-900 border border-border dark:border-slate-800 w-fit max-w-full">
        <Link
          href="/future-lab" aria-current={activeMainTab === 'simulator' ? 'page' : undefined}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeMainTab === 'simulator'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'text-muted dark:text-slate-400 hover:text-foreground dark:hover:text-white'
          }`}
        >
          <FlaskConical className="w-4 h-4" />
          <span>Strategy Simulator</span>
        </Link>

        <Link
          href="/goals" aria-current={activeMainTab === 'goals' ? 'page' : undefined}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeMainTab === 'goals'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'text-muted dark:text-slate-400 hover:text-foreground dark:hover:text-white'
          }`}
        >
          <Target className="w-4 h-4" />
          <span>Financial Goals ({goalsLoading ? '…' : goalsError ? '—' : goalsData?.length || 0})</span>
        </Link>
      </nav>

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
          {holdingsLoading ? <p role="status" className="text-xs text-muted">Loading recorded holdings…</p> : holdingsError ? <p role="alert" className="text-xs text-muted">{holdingsError.message}</p> : <PortfolioBeforeAfterCard
            comparison={beforeAfterComparison}
            selectedStrategy={selectedStrategy}
            strategyName={STRATEGY_TEMPLATES[selectedStrategy].name}
          />}

          {/* Your Holdings — What Should You Research Next? */}
          <ExistingHoldingsReview
            instruments={xrayData?.consolidated_instruments || []}
            articles={newsArticles}
            onExploreAlternatives={() => setShowEducationModal(true)}
          />

          {/* Advanced Rebalancing Sandbox (Relocated What-If Category Transfer) */}
          {!holdingsLoading && !holdingsError && <AdvancedRebalancingDrawer
            holdings={holdingsData}
          />}
        </div>
      )}

      {activeMainTab === 'goals' && <FinancialGoalsBoard
        goals={goalsData || []} loading={goalsLoading} error={goalsError} retry={() => { void refetchGoals(); }}
        onCreate={openNewGoal} onEdit={editGoal} onDelete={handleDeleteGoal}
        selectedId={selectedGoalId} onSelect={setSelectedGoalId}
        deletingId={deleteGoalMutation.isPending ? deleteGoalMutation.variables : undefined}
        deleteError={deleteGoalMutation.error?.message}
      />}

      {/* ─── AI Explainer Modal ──────────────────────────────────── */}
      {aiQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div ref={aiDialogRef} role="dialog" aria-modal="true" aria-label="AI Strategy Explainer" tabIndex={-1} className="bg-surface dark:bg-slate-900 border border-border dark:border-slate-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl relative space-y-4">
            <button
              type="button"
              onClick={() => setAiQuestion(null)}
              className="absolute top-4 right-4 p-1 text-muted dark:text-slate-400 hover:text-foreground dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-700 dark:text-purple-400" />
              <h3 className="text-base font-bold text-foreground dark:text-white">AI Strategy Explainer</h3>
            </div>

            <div className="p-3 rounded-lg bg-background dark:bg-slate-950 border border-border dark:border-slate-800 text-xs text-purple-700 dark:text-purple-300">
              {aiQuestion}
            </div>

            {aiLoading ? (
              <div className="p-8 text-center text-xs text-muted dark:text-slate-400 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-purple-700 dark:text-purple-400" />
                <span>Generating deterministic educational explanation...</span>
              </div>
            ) : (
              <div className="text-xs text-foreground dark:text-slate-300 leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto">
                {aiResponse}
              </div>
            )}

            <div className="pt-2 border-t border-border dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setAiQuestion(null)}
                className="px-4 py-2 rounded-lg bg-surface-raised dark:bg-slate-800 hover:bg-surface-raised dark:hover:bg-slate-700 text-foreground dark:text-white text-xs font-semibold"
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
          <div ref={goalDialogRef} role="dialog" aria-modal="true" aria-label={editingGoal ? 'Edit Investment Goal' : 'Create New Financial Goal'} tabIndex={-1} className="bg-surface dark:bg-slate-900 border border-border dark:border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative max-h-[90dvh] overflow-y-auto">
            <button
              type="button"
              onClick={closeGoalModal}
              disabled={saveGoalMutation.isPending}
              aria-label="Close goal form"
              className="absolute top-4 right-4 p-1 text-muted dark:text-slate-400 hover:text-foreground dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-lg font-bold text-foreground dark:text-white">
                {editingGoal ? 'Edit Investment Goal' : 'Create New Financial Goal'}
              </h3>
              <p className="text-xs text-muted dark:text-slate-400 mt-0.5">
                Set target amounts and dates for structured zero-growth savings planning.
              </p>
            </div>

            {goalFormError && (
              <div role="alert" className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs">
                {goalFormError}
              </div>
            )}

            <form onSubmit={handleSaveGoal} onChange={() => { if (goalFormError) setGoalFormError(null); }} className="space-y-3 text-xs">
              <div>
                <label htmlFor="goal-name" className="font-semibold text-foreground dark:text-slate-300 block mb-1">Goal Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Higher Education, Home Downpayment"
                  id="goal-name"
                  value={goalName}
                  onChange={(e) => setGoalName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border dark:border-slate-800 bg-background dark:bg-slate-950 text-foreground dark:text-white outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="goal-target" className="font-semibold text-foreground dark:text-slate-300 block mb-1">Target Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    id="goal-target"
                    min="0.01"
                    step="0.01"
                    placeholder="₹5,00,000"
                    value={goalTarget}
                    onChange={(e) => setGoalTarget(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border dark:border-slate-800 bg-background dark:bg-slate-950 text-foreground dark:text-white font-mono outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="goal-funding" className="font-semibold text-foreground dark:text-slate-300 block mb-1">Recorded Funding (₹)</label>
                  <input
                    type="number"
                    min="0"
                    id="goal-funding"
                    step="0.01"
                    placeholder="₹0"
                    value={goalCurrent}
                    onChange={(e) => setGoalCurrent(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border dark:border-slate-800 bg-background dark:bg-slate-950 text-foreground dark:text-white font-mono outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="goal-date" className="font-semibold text-foreground dark:text-slate-300 block mb-1">Target Date *</label>
                  <input
                    type="date"
                    id="goal-date"
                    required
                    value={goalDate}
                    onChange={(e) => setGoalDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border dark:border-slate-800 bg-background dark:bg-slate-950 text-foreground dark:text-white outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="goal-category" className="font-semibold text-foreground dark:text-slate-300 block mb-1">Category</label>
                  <select
                    value={goalCategory}
                    id="goal-category"
                    onChange={(e) => setGoalCategory(e.target.value as GoalCategory)}
                    className="w-full px-3 py-2 rounded-lg border border-border dark:border-slate-800 bg-background dark:bg-slate-950 text-foreground dark:text-white outline-none focus:border-blue-500"
                  >
                    <option value="GENERAL">General Wealth</option>
                    <option value="WEALTH">Wealth Building</option>
                    <option value="EMERGENCY_FUND">Emergency Fund</option>
                    <option value="EDUCATION">Higher Education</option>
                    <option value="HOME">Home Purchase</option>
                    <option value="RETIREMENT">Retirement</option>
                    <option value="VEHICLE">Vehicle Purchase</option>
                    <option value="VACATION">Vacation / Travel</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="goal-priority" className="font-semibold text-foreground block mb-1">Priority</label>
                <select id="goal-priority" value={goalPriority} onChange={event => setGoalPriority(event.target.value as GoalPriority)} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground outline-none focus:border-blue-500">
                  <option value="HIGH">High</option><option value="MEDIUM">Medium</option><option value="LOW">Low</option>
                </select>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeGoalModal}
                  disabled={saveGoalMutation.isPending}
                  className="px-3 py-2 rounded-lg bg-surface-raised dark:bg-slate-800 text-foreground dark:text-slate-300 text-xs font-semibold hover:bg-surface-raised dark:hover:bg-slate-700"
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
