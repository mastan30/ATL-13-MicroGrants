'use strict';
'use client';

import React from 'react';
import { SensitivityReport } from '@/types/scenario';
import { AlertCircle, CheckCircle2, SlidersHorizontal } from 'lucide-react';

interface SensitivityBannerProps {
  sensitivity: SensitivityReport;
  grantEffect: number;
}

export const SensitivityBanner: React.FC<SensitivityBannerProps> = ({
  sensitivity,
  grantEffect,
}) => {
  const isHighEffect = grantEffect >= 0.5;
  const isLowEffect = grantEffect <= 0.2;

  const isStable = isLowEffect
    ? sensitivity['top_pick_stable_at_0.5x']
    : isHighEffect
    ? sensitivity['top_pick_stable_at_2x']
    : true;

  return (
    <div
      className={`rounded-xl p-3 border text-xs flex items-center justify-between gap-3 shadow-md transition-all ${
        isStable
          ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-200'
          : 'bg-amber-950/40 border-amber-800/50 text-amber-200'
      }`}
    >
      <div className="flex items-center gap-2.5">
        {isStable ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
        ) : (
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
        )}
        <div>
          <span className="font-bold">
            {isStable
              ? 'Sensitivity Audit: Invariant Top Recommendation'
              : 'Sensitivity Alert: Acute Distress Shift Detected'}
          </span>
          <p className="text-[11px] opacity-90 mt-0.5">{sensitivity.notes}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 font-mono text-[11px] bg-slate-900/60 px-2.5 py-1 rounded border border-slate-800">
        <SlidersHorizontal className="w-3 h-3 text-slate-400" />
        <span>0.5×: {sensitivity['top_pick_stable_at_0.5x'] ? 'Stable' : 'Shifts'}</span>
        <span className="text-slate-600">|</span>
        <span>2.0×: {sensitivity['top_pick_stable_at_2x'] ? 'Stable' : 'Shifts'}</span>
      </div>
    </div>
  );
};
