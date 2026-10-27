'use client';

import React from 'react';
import { Play, LoaderCircle, ShieldCheck, TriangleAlert } from 'lucide-react';
import { ScenarioMeta, SensitivityReport } from '@/types/scenario';
import { formatInt } from '@/lib/format';
import { Segmented, SectionLabel, cx } from '@/components/ui';

interface ScenarioControlsProps {
  scenario: ScenarioMeta;
  sensitivity: SensitivityReport;
  isLoading: boolean;
  isDirty: boolean;
  onBudgetChange: (budget: number) => void;
  onGrantEffectChange: (effect: number) => void;
  onRun: () => void;
}

const BUDGETS = [25000, 50000, 75000, 100000].map((v) => ({ value: v, label: `$${v / 1000}k` }));
const EFFECTS = [
  { value: 0.15, label: '0.5×', hint: 'Conservative: a grant cuts closure risk by half as much' },
  { value: 0.3, label: '1×', hint: 'Baseline assumption' },
  { value: 0.6, label: '2×', hint: 'Acute: a grant cuts closure risk twice as much' },
];

export const ScenarioControls: React.FC<ScenarioControlsProps> = ({
  scenario,
  sensitivity,
  isLoading,
  isDirty,
  onBudgetChange,
  onGrantEffectChange,
  onRun,
}) => {
  const stableLow = sensitivity['top_pick_stable_at_0.5x'];
  const stableHigh = sensitivity['top_pick_stable_at_2x'];
  const stable = stableLow && stableHigh;

  return (
    <section aria-label="Scenario" className="rounded-2xl bg-surface shadow-sm ring-1 ring-line">
      <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1.3fr)_auto_auto_auto] lg:items-end lg:gap-8">
        <div className="min-w-0">
          <SectionLabel className="text-anchor">Closing employer</SectionLabel>
          <h2 className="mt-1 truncate text-[17px] font-semibold tracking-tight text-ink" title={scenario.block_name}>
            {scenario.block_name}
          </h2>
          <p className="tabular mt-0.5 text-[13px] text-ink-2">
            {formatInt(scenario.jobs)} jobs · leaves in 90 days · {scenario.corridor}
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <SectionLabel>Budget</SectionLabel>
          <Segmented label="Budget" value={scenario.budget} options={BUDGETS} onChange={onBudgetChange} />
        </div>

        <div className="flex flex-col gap-1.5">
          <SectionLabel>Assumed grant effect</SectionLabel>
          <Segmented
            label="Assumed grant effect"
            value={scenario.grant_effect}
            options={EFFECTS}
            onChange={onGrantEffectChange}
            isActive={(opt, val) => Math.abs(opt - val) < 0.05}
          />
        </div>

        <button
          type="button"
          onClick={onRun}
          disabled={isLoading}
          className={cx(
            'relative inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg px-4 text-[13px] font-medium text-white transition-colors sm:w-fit',
            'bg-brand hover:bg-brand-hover disabled:cursor-wait disabled:opacity-70',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'
          )}
        >
          {isLoading ? <LoaderCircle className="size-4 animate-spin" /> : <Play className="size-3.5 fill-current" />}
          {isLoading ? 'Running…' : 'Run scenario'}
          {isDirty && !isLoading && (
            <span className="absolute -top-1 -right-1 size-2.5 rounded-full bg-exposed-dot ring-2 ring-surface" aria-label="Unapplied changes" />
          )}
        </button>
      </div>

      <div className="flex flex-col gap-2 border-t border-line px-5 py-3 text-[13px] text-ink-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex min-w-0 items-start gap-2.5">
          {stable ? (
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-funded" />
          ) : (
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-exposed" />
          )}
          <p className="min-w-0">
            <span className="font-medium text-ink">
              {stable ? 'Top pick holds under both assumptions.' : 'Top pick changes under one assumption.'}
            </span>{' '}
            {sensitivity.notes}
          </p>
        </div>
        <div className="flex shrink-0 gap-1.5 text-xs">
          <SensitivityChip label="0.5×" stable={stableLow} />
          <SensitivityChip label="2×" stable={stableHigh} />
        </div>
      </div>
    </section>
  );
};

function SensitivityChip({ label, stable }: { label: string; stable: boolean }) {
  return (
    <span
      className={cx(
        'tabular inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium',
        stable ? 'bg-funded-soft text-funded' : 'bg-exposed-soft text-exposed'
      )}
    >
      {label} {stable ? 'stable' : 'shifts'}
    </span>
  );
}
