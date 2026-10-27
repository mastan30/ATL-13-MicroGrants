'use strict';
'use client';

import React from 'react';
import { BusinessDecision } from '@/types/scenario';
import { ShieldAlert, CheckCircle2, AlertTriangle, Building2, TrendingDown } from 'lucide-react';

interface HoverCardProps {
  business: BusinessDecision | null;
  position: { x: number; y: number } | null;
}

export const HoverCard: React.FC<HoverCardProps> = ({ business, position }) => {
  if (!business || !position) return null;

  const isFunded = business.status === 'funded';
  const isExposed = business.status === 'exposed_not_funded';

  const badgeColor = isFunded
    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
    : isExposed
    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
    : 'bg-slate-700/40 text-slate-400 border-slate-600/40';

  const statusLabel = isFunded
    ? 'FUNDED'
    : isExposed
    ? 'EXPOSED (NOT FUNDED)'
    : 'UNAFFECTED';

  // Ensure card stays on screen
  const left = Math.min(Math.max(position.x + 16, 20), window.innerWidth - 380);
  const top = Math.min(Math.max(position.y - 40, 70), window.innerHeight - 320);

  return (
    <div
      style={{ left: `${left}px`, top: `${top}px` }}
      className="fixed z-50 w-88 pointer-events-none rounded-xl border border-slate-700/80 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-md transition-all duration-150 ease-out text-slate-100"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2.5">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-base text-white leading-tight">{business.name}</h4>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">{business.address} · NAICS {business.naics4}</p>
        </div>
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${badgeColor}`}>
          {isFunded && <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-400" />}
          {isExposed && <AlertTriangle className="w-3 h-3 mr-1 text-amber-400" />}
          {statusLabel}
        </span>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-2 my-2.5">
        <div className="bg-slate-800/60 rounded-lg p-2 border border-slate-700/40">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Grant Allocation</span>
          <p className="text-lg font-black text-emerald-400 leading-tight mt-0.5">
            {business.amount > 0 ? `$${business.amount.toLocaleString()}` : '$0'}
          </p>
        </div>
        <div className="bg-slate-800/60 rounded-lg p-2 border border-slate-700/40">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Exposure Score</span>
          <div className="flex items-center justify-between mt-0.5">
            <p className="text-lg font-black text-amber-400 leading-tight">
              {(business.exposure * 100).toFixed(0)}%
            </p>
            <span className="text-[10px] text-slate-400 bg-slate-700/50 px-1.5 py-0.5 rounded">
              {business.hops_from_anchor === 0 ? 'Leaf' : `${business.hops_from_anchor} hop${business.hops_from_anchor > 1 ? 's' : ''}`}
            </span>
          </div>
        </div>
      </div>

      {/* Downstream Protections */}
      {business.protects.length > 0 && (
        <div className="mb-2 bg-indigo-950/40 border border-indigo-800/40 rounded-lg p-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-300 flex items-center gap-1">
            <Building2 className="w-3 h-3" /> Protects Downstream ({business.protects.length}):
          </span>
          <p className="text-xs text-indigo-200 mt-0.5 font-medium">
            {business.protects.map((p) => `${p.name} (${(p.intensity * 100).toFixed(0)}% supply)`).join(', ')}
          </p>
        </div>
      )}

      {/* Instant Justification */}
      <div className="mt-2 text-xs text-slate-300 leading-relaxed bg-slate-800/40 p-2 rounded border border-slate-700/30">
        <p className="line-clamp-3">
          <strong className="text-slate-200">Decision: </strong>
          {business.justification}
        </p>
      </div>

      <div className="mt-2 text-[10px] text-slate-500 text-right">
        Click marker for full path traversal & equity audit →
      </div>
    </div>
  );
};
