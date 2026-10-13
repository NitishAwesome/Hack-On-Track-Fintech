'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Target, CalendarDays, Wallet, Plus, Edit2, Trash2, ArrowRight, Info, Sparkles } from 'lucide-react';
import { calculateGoalProgress, calculateGoalContributionProjection } from '@/lib/calculations/futureLab';
import { goalFundingSummary, goalStateLabel, GOAL_CATEGORY_LABELS, type GoalRecord } from '@/lib/goals/planning';
import { isGoalDate, type GoalWritePayload } from '@/lib/goals/goalForm';
import { formatIndianCurrency } from '@/lib/utils';

type GoalDraft = Partial<GoalWritePayload>;
const TEMPLATES = [
  { name: 'Emergency fund', category: 'EMERGENCY_FUND' as const, description: 'Set a cash buffer based on your own essential expenses.' },
  { name: 'Higher education', category: 'EDUCATION' as const, description: 'Plan a course or tuition target with a clear date.' },
  { name: 'Home downpayment', category: 'HOME' as const, description: 'Separate a purchase target from your other savings.' },
  { name: 'Personal milestone', category: 'GENERAL' as const, description: 'Give a trip, vehicle or other priority its own savings plan.' },
];
const cardClass = 'rounded-2xl border border-border bg-surface p-5';
const fieldClass = 'w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-brand tabular-nums';
const currency = (value: number) => formatIndianCurrency(value);
const dateLabel = (date: string) => isGoalDate(date) ? new Date(`${date}T12:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Date unavailable';

export function FinancialGoalsBoard({ goals, loading, error, retry, onCreate, onEdit, onDelete, selectedId, onSelect, deletingId, deleteError }: {
  goals: GoalRecord[]; loading: boolean; error: Error | null; retry: () => void;
  onCreate: (draft?: GoalDraft) => void; onEdit: (goal: GoalRecord) => void; onDelete: (id: string) => void;
  selectedId: string | null; onSelect: (id: string) => void; deletingId?: string; deleteError?: string;
}) {
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('deadline');
  const summary = goalFundingSummary(goals);
  const selected = goals.find(goal => goal.id === selectedId) || goals.find(goal => goal.status === 'ACTIVE' && goal.progress.remainingAmount > 0) || goals[0];
  const shown = goals.filter(goal => filter === 'all' || (filter === 'funded' ? goal.progress.remainingAmount === 0 && goal.status !== 'CANCELLED' : goal.status === filter))
    .sort((a, b) => sort === 'priority' ? ({ HIGH: 0, MEDIUM: 1, LOW: 2 }[a.priority] - { HIGH: 0, MEDIUM: 1, LOW: 2 }[b.priority] || a.target_date.localeCompare(b.target_date)) : a.target_date.localeCompare(b.target_date));
  const known = !loading && !error;

  return <div className="space-y-6">
    <section aria-label="Goal funding overview" className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          ['Total targets', summary.totalTarget, 'Excludes cancelled goals'],
          ['Recorded funding', summary.recordedFunding, 'Manually recorded for your goals'],
          ['Remaining gap', summary.remainingGap, 'Funding still needed across goals'],
          ['Monthly savings needed', summary.monthlySavings, 'Active goals with time remaining'],
        ].map(([label, value, detail]) => <div key={label} className={cardClass}>
          <p className="text-xs font-medium text-muted">{label}</p>
          <p className="text-xl sm:text-2xl font-bold text-foreground tabular-nums mt-2 break-words">{known ? currency(Number(value)) : '—'}</p>
          <p className="text-[11px] text-muted mt-1">{detail}</p>
        </div>)}
      </div>
      {known && goals.length > 0 && <div className={`${cardClass} flex flex-col sm:flex-row sm:items-center gap-4`}>
        <div className="flex-1 min-w-0"><div className="flex justify-between text-xs text-muted mb-2"><span>Total target coverage</span><span>{summary.progressPct.toFixed(1)}%</span></div>
          <div role="progressbar" aria-label="Total goal funding coverage" aria-valuemin={0} aria-valuemax={100} aria-valuenow={summary.progressPct} className="h-2 rounded-full bg-surface-raised overflow-hidden"><div className="h-full bg-brand rounded-full" style={{ width: `${summary.progressPct}%` }} /></div>
        </div>
        <p className="text-xs text-muted shrink-0">{summary.activeCount} active · {summary.fundedCount} funded{summary.dueNow > 0 && <span className="text-amber-700 dark:text-amber-400"> · {summary.dueNow} deadline{summary.dueNow === 1 ? '' : 's'} to review</span>}</p>
      </div>}
    </section>

    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      <section className={`${cardClass} xl:col-span-7 space-y-4`} aria-labelledby="your-goals-heading">
        <div className="flex items-center justify-between gap-3"><div><h2 id="your-goals-heading" className="text-base font-bold text-foreground">Your financial goals</h2><p className="text-xs text-muted mt-1">Choose a goal to check its savings pace.</p></div><span className="text-xs text-muted tabular-nums">{known ? `${goals.length} saved` : '—'}</span></div>
        {loading ? <p role="status" className="text-sm text-muted py-8">Loading your financial goals…</p> : error ? <div role="alert" className="text-sm text-loss py-4">{error.message} <button type="button" onClick={retry} className="underline">Retry</button></div> : goals.length === 0 ?
          <div className="rounded-xl border border-dashed border-border bg-background px-5 py-7 text-center space-y-3">
            <Target className="w-8 h-8 mx-auto text-brand" /><h3 className="text-sm font-semibold text-foreground">Start with one clear target</h3>
            <p className="text-xs text-muted max-w-md mx-auto leading-relaxed">Give it an amount, a date and any funding you have already set aside. Use the savings sandbox alongside to work out a monthly pace before saving a goal.</p>
            <button type="button" onClick={() => onCreate()} className="rounded-lg bg-brand text-white text-xs font-semibold px-4 py-2.5 inline-flex items-center gap-2"><Plus className="w-4 h-4" />Create your first goal</button>
          </div> : <>
            <div className="flex flex-wrap gap-3">
              <label className="text-xs text-muted flex items-center gap-2">Show<select aria-label="Filter goals" value={filter} onChange={event => setFilter(event.target.value)} className="rounded-lg border border-border bg-background px-2 py-2 text-foreground"><option value="all">All goals</option><option value="ACTIVE">Active</option><option value="funded">Funded</option><option value="PAUSED">Paused</option><option value="CANCELLED">Cancelled</option></select></label>
              <label className="text-xs text-muted flex items-center gap-2">Sort<select aria-label="Sort goals" value={sort} onChange={event => setSort(event.target.value)} className="rounded-lg border border-border bg-background px-2 py-2 text-foreground"><option value="deadline">Target date</option><option value="priority">Priority</option></select></label>
            </div>
            {!shown.length && <p role="status" className="text-sm text-muted py-6">No goals in this view. Choose another filter.</p>}
            <div className="space-y-3">{shown.map(goal => <article key={goal.id} className={`rounded-xl border p-4 space-y-3 ${selected?.id === goal.id ? 'border-brand bg-brand/5' : 'border-border bg-background'}`}>
              <div className="flex items-start justify-between gap-3"><button type="button" aria-pressed={selected?.id === goal.id} aria-label={`Plan savings for ${goal.goal_name}`} onClick={() => onSelect(goal.id)} className="min-w-0 text-left"><h3 className="text-sm font-bold text-foreground break-words">{goal.goal_name}</h3><p className="text-[11px] text-muted mt-1">{GOAL_CATEGORY_LABELS[goal.category] || 'General'} · {goal.priority.toLowerCase()} priority</p></button><span className="rounded-full px-2 py-1 text-[10px] border border-border text-muted shrink-0">{goalStateLabel(goal)}</span></div>
              <div className="flex justify-between gap-3 text-xs"><span className="text-muted">{currency(Number(goal.current_amount))} recorded</span><span className="text-foreground font-semibold">of {currency(Number(goal.target_amount))}</span></div>
              <div role="progressbar" aria-label={`${goal.goal_name} funding`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, goal.progress.fundingProgressPct)} className="h-1.5 rounded-full bg-surface-raised overflow-hidden"><div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(100, goal.progress.fundingProgressPct)}%` }} /></div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted"><span className="inline-flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" />{dateLabel(goal.target_date)}</span><span>{goal.progress.fundingProgressPct.toFixed(1)}% funded</span></div>
              <div className="flex flex-wrap gap-2 pt-2 border-t border-border"><button type="button" onClick={() => onSelect(goal.id)} className="text-xs text-brand px-2 py-2 rounded-lg hover:bg-surface-raised">Plan savings →</button><button type="button" aria-label={`Edit ${goal.goal_name}`} onClick={() => onEdit(goal)} className="text-xs text-muted px-2 py-2 rounded-lg hover:bg-surface-raised inline-flex items-center gap-1"><Edit2 className="w-3.5 h-3.5" />Edit / funding</button><button type="button" disabled={deletingId === goal.id} aria-label={`Delete ${goal.goal_name}`} onClick={() => onDelete(goal.id)} className="text-xs text-loss px-2 py-2 rounded-lg hover:bg-surface-raised disabled:opacity-50 inline-flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" />{deletingId === goal.id ? 'Deleting…' : 'Delete'}</button></div>
            </article>)}</div>
          </>}
        {deleteError && <p role="alert" className="text-xs text-loss">{deleteError}</p>}
      </section>
      <div className="xl:col-span-5"><SavingsPlanner key={selected ? `${selected.id}:${selected.target_amount}:${selected.current_amount}:${selected.target_date}` : 'sandbox'} goal={known ? selected : undefined} onCreate={onCreate} /></div>
    </div>

    <section aria-labelledby="goal-templates-heading" className="space-y-3"><div><h2 id="goal-templates-heading" className="text-base font-bold text-foreground">Start with a purpose</h2><p className="text-xs text-muted mt-1">Templates fill a name and category. You choose the amount and date.</p></div><div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">{TEMPLATES.map(template => <div key={template.category} className={`${cardClass} flex flex-col gap-3`}><Target className="w-5 h-5 text-brand" /><h3 className="text-sm font-semibold text-foreground">{template.name}</h3><p className="text-xs text-muted leading-relaxed flex-1">{template.description}</p><button type="button" onClick={() => onCreate({ goal_name: template.name, category: template.category })} className="text-xs font-semibold text-brand text-left inline-flex items-center gap-1 py-1">Use template<ArrowRight className="w-3.5 h-3.5" /></button></div>)}</div></section>

    <section className={cardClass} aria-labelledby="goal-review-heading"><h2 id="goal-review-heading" className="text-sm font-semibold text-foreground">Keep your plan useful</h2><div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-4 text-xs"><div><p className="font-semibold text-foreground">1. Check the target</p><p className="text-muted leading-relaxed mt-1">Review the amount and deadline as your plans change. Past deadlines need an updated date or an immediate funding decision.</p></div><div><p className="font-semibold text-foreground">2. Record funding honestly</p><p className="text-muted leading-relaxed mt-1">Update what you have actually set aside. Avoid assigning the same money to several goals.</p></div><div><p className="font-semibold text-foreground">3. Test your monthly pace</p><p className="text-muted leading-relaxed mt-1">Compare a savings budget with the required pace. A scenario does not record deposits or change holdings.</p></div></div></section>
    <p className="text-xs text-muted leading-relaxed flex items-start gap-2"><Info className="w-4 h-4 shrink-0 mt-0.5" />Goal funding is manually recorded and kept separate from portfolio value. Plans assume 0% growth and exclude inflation, investment returns and automated deposits.</p>
  </div>;
}

function SavingsPlanner({ goal, onCreate }: { goal?: GoalRecord; onCreate: (draft?: GoalDraft) => void }) {
  const [target, setTarget] = useState('');
  const [funding, setFunding] = useState('0');
  const [date, setDate] = useState('');
  const [monthly, setMonthly] = useState('');
  const amount = goal ? Number(goal.target_amount) : Number(target);
  const current = goal ? Number(goal.current_amount) : Number(funding || '0');
  const targetDate = goal?.target_date || date;
  const monthlyAmount = Number(monthly || '0');
  const valid = Number.isFinite(amount) && amount > 0 && Number.isFinite(current) && current >= 0 && isGoalDate(targetDate);
  const monthlyValid = Number.isFinite(monthlyAmount) && monthlyAmount >= 0;
  const progress = valid ? calculateGoalProgress(amount, current, targetDate) : null;
  const projection = valid && monthlyValid ? calculateGoalContributionProjection(amount, current, targetDate, monthlyAmount) : null;
  const aiQuestion = goal ? `Explain the zero-growth savings pace for my goal "${goal.goal_name}", with a target of ₹${amount}, recorded funding of ₹${current} and target date ${targetDate}.` : 'How can I turn a target amount and date into a zero-growth monthly savings plan?';

  return <section className={`${cardClass} space-y-4`} aria-labelledby="savings-planner-heading">
    <div><div className="flex items-center gap-2"><Wallet className="w-5 h-5 text-brand" /><h2 id="savings-planner-heading" className="text-base font-bold text-foreground">{goal ? 'Monthly savings planner' : 'Try a savings scenario'}</h2></div><p className="text-xs text-muted mt-1 leading-relaxed">{goal ? `Planning for ${goal.goal_name}. Change the monthly budget to compare outcomes.` : 'Work out a target before creating a goal. These inputs are a temporary scenario.'}</p></div>
    {!goal ? <div className="space-y-3"><label className="block text-xs font-medium text-muted">Scenario target amount (₹)<input type="number" min="0.01" step="0.01" value={target} onChange={event => setTarget(event.target.value)} placeholder="Enter your target" className={`${fieldClass} mt-1`} /></label><label className="block text-xs font-medium text-muted">Scenario recorded funding (₹)<input type="number" min="0" step="0.01" value={funding} onChange={event => setFunding(event.target.value)} className={`${fieldClass} mt-1`} /></label><label className="block text-xs font-medium text-muted">Scenario target date<input type="date" value={date} onChange={event => setDate(event.target.value)} className={`${fieldClass} mt-1`} /></label></div> : <div className="rounded-xl bg-background border border-border p-3 text-xs space-y-2"><p className="flex justify-between gap-2"><span className="text-muted">Recorded funding</span><span className="text-foreground tabular-nums">{currency(current)}</span></p><p className="flex justify-between gap-2"><span className="text-muted">Target</span><span className="text-foreground tabular-nums">{currency(amount)}</span></p><p className="flex justify-between gap-2"><span className="text-muted">Date</span><span className="text-foreground">{dateLabel(targetDate)}</span></p></div>}
    <label className="block text-xs font-medium text-muted">Monthly savings budget (₹)<input type="number" min="0" step="0.01" placeholder="Enter a monthly amount" value={monthly} onChange={event => setMonthly(event.target.value)} className={`${fieldClass} mt-1`} /></label>
    {!monthlyValid && <p role="alert" className="text-xs text-loss">Enter a valid non-negative monthly amount.</p>}
    {progress && projection ? <div className="space-y-3" aria-live="polite">
      <div className="rounded-xl bg-brand/5 border border-brand/20 p-4"><p className="text-xs text-muted">{progress.remainingMonths > 0 ? 'Required monthly savings' : 'Funding needed now'}</p><p className="text-2xl font-bold text-brand tabular-nums mt-1">{currency(progress.requiredMonthlyContributionZeroGrowth)}</p><p className="text-[11px] text-muted mt-1">{progress.remainingMonths > 0 ? `${progress.remainingMonths} monthly periods · ${currency(progress.remainingAmount)} remaining` : 'No future monthly periods remain. Review your target date.'}</p></div>
      {monthly.trim() && <div className="rounded-xl border border-border bg-background p-3 space-y-2 text-xs"><p className="font-semibold text-foreground">{projection.reachesTarget ? 'Budget reaches this target' : 'Budget leaves a funding gap'}</p><p className="flex justify-between gap-2 text-muted"><span>Projected funding</span><span className="text-foreground tabular-nums">{currency(projection.projectedFundingAtDeadline)}</span></p><p className="flex justify-between gap-2 text-muted"><span>Remaining gap at deadline</span><span className="text-foreground tabular-nums">{currency(projection.projectedGapAtDeadline)}</span></p><p className="text-[11px] text-muted leading-relaxed">{currency(monthlyAmount)} × {projection.remainingMonths} monthly periods, plus recorded funding. Assumes 0% growth.</p></div>}
      {!goal && <button type="button" onClick={() => onCreate({ goal_name: 'New savings goal', target_amount: amount, current_amount: current, target_date: targetDate })} className="w-full rounded-lg bg-brand px-3 py-2.5 text-xs font-semibold text-white">Review and save as a goal</button>}
    </div> : <p className="text-xs text-muted rounded-xl border border-dashed border-border p-4 leading-relaxed">Enter an amount and a valid date to see the funding gap and monthly savings needed.</p>}
    <p className="text-[11px] text-muted leading-relaxed">Scenario only. Changing the budget does not update recorded funding or portfolio holdings.</p>
    <Link href={`/insights?question=${encodeURIComponent(aiQuestion)}`} className="text-xs font-semibold text-purple-700 dark:text-purple-400 inline-flex gap-1.5 items-center py-1"><Sparkles className="w-3.5 h-3.5" />Ask FINOVA about this plan</Link>
  </section>;
}
