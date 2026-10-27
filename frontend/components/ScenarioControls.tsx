'use strict';
'use client';

import React from 'react';
import { ScenarioMeta } from '@/types/scenario';
import { RefreshCw, FileText, DollarSign, TrendingUp, Building2, Bot } from 'lucide-react';

interface ScenarioControlsProps {
  scenario: ScenarioMeta;
  isLoading: boolean;
  onBudgetChange: (budget: number) => void;
  onGrantEffectChange: (effect: number) => void;
  onRerun: () => void;
  onOpenMemo: () => void;
  onOpenAgent?: () => void;
}

export const ScenarioControls: React.FC<ScenarioControlsProps> = ({
  scenario,
  isLoading,
  onBudgetChange,
  onGrantEffectChange,
  onRerun,
  onOpenMemo,
  onOpenAgent,
}) => {
  const budgetPresets = [25000, 50000, 75000, 100000];
  const effectOptions = [
    { value: 0.15, label: '0.5×', desc: 'Conservative' },
    { value: 0.3, label: '1.0×', desc: 'Baseline' },
    { value: 0.6, label: '2.0×', desc: 'Acute' },
  ];

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-md flex flex-wrap items-center justify-between gap-4 text-slate-100">
      {/* Anchor Closure Context */}
      <div className="flex items-center gap-3 pr-4 border-r border-slate-800">
        <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
          <Building2 className="w-5 h-5" />
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 block">
            Closing Anchor Event
          </span>
          <h3 className="font-bold text-sm text-white leading-tight">
            {scenario.block_name}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {scenario.jobs.toLocaleString()} workplace jobs closing · {scenario.corridor}
          </p>
        </div>
      </div>

      {/* Budget Selector */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
          <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
          Budget Allocation
        </label>
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
          {budgetPresets.map((b) => (
            <button
              key={b}
              onClick={() => onBudgetChange(b)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                scenario.budget === b
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              ${b / 1000}k
            </button>
          ))}
        </div>
      </div>

      {/* Grant-Effect Assumption */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
          <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
          Effect Assumption
        </label>
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
          {effectOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onGrantEffectChange(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                Math.abs(scenario.grant_effect - opt.value) < 0.05
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span>{opt.label}</span>
              <span className="text-[10px] opacity-75 font-normal">({opt.desc})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={onRerun}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-600/20 disabled:opacity-50 transition active:scale-95"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Running Agent...' : 'Re-run Scenario'}
        </button>

        {onOpenAgent && (
          <button
            onClick={onOpenAgent}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 font-bold text-xs border border-blue-500/30 transition"
          >
            <Bot className="w-3.5 h-3.5 text-blue-400" />
            Ask Agent
          </button>
        )}

        <button
          onClick={onOpenMemo}
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs border border-slate-700 transition"
        >
          <FileText className="w-3.5 h-3.5 text-indigo-400" />
          Grant Memo
        </button>
      </div>
    </div>
  );
};
