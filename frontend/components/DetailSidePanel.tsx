'use strict';
'use client';

import React from 'react';
import { BusinessDecision, RunnerUp } from '@/types/scenario';
import {
  X,
  ShieldCheck,
  ShieldAlert,
  GitFork,
  ArrowRight,
  Database,
  Building,
  TrendingUp,
  MapPin,
  CheckCircle,
  HelpCircle,
} from 'lucide-react';

interface DetailSidePanelProps {
  business: BusinessDecision | null;
  runnerUp: RunnerUp | null;
  onClose: () => void;
}

export const DetailSidePanel: React.FC<DetailSidePanelProps> = ({
  business,
  runnerUp,
  onClose,
}) => {
  if (!business) return null;

  const isFunded = business.status === 'funded';
  const isExposed = business.status === 'exposed_not_funded';

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full sm:w-[460px] bg-slate-900/98 border-l border-slate-700/80 shadow-2xl backdrop-blur-xl flex flex-col text-slate-100 overflow-hidden transition-transform duration-300 ease-in-out">
      {/* Header */}
      <div className="p-5 border-b border-slate-800 bg-slate-950/60 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border ${
                isFunded
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : isExposed
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                  : 'bg-slate-700/40 text-slate-400 border-slate-600/40'
              }`}
            >
              {business.status.replace(/_/g, ' ')}
            </span>
            <span className="text-xs text-slate-400 font-mono">NAICS {business.naics4}</span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1 leading-snug">{business.name}</h2>
          <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
            <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            {business.address} · {business.industry_name}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
          aria-label="Close detail panel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Metric Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Grant Award
            </span>
            <span className="text-2xl font-black text-emerald-400 mt-1 block">
              {business.amount > 0 ? `$${business.amount.toLocaleString()}` : '$0'}
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              {isFunded ? 'Resilience Stabilization' : 'No Allocation'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Exposure Risk
            </span>
            <span className="text-2xl font-black text-amber-400 mt-1 block">
              {(business.exposure * 100).toFixed(0)}%
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              {business.hops_from_anchor} hop(s) from anchor
            </span>
          </div>
        </div>

        {/* Role & Protection Summary */}
        <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-900/50">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold text-indigo-300 uppercase tracking-wider text-[10px]">
              Network Role
            </span>
            <span className="bg-indigo-900/60 text-indigo-200 px-2 py-0.5 rounded text-[11px] font-mono">
              {business.role.replace(/_/g, ' ')}
            </span>
          </div>

          {business.protects.length > 0 ? (
            <div className="mt-2 text-xs">
              <span className="text-slate-400 block mb-1 font-medium">Downstream Dependents Protected:</span>
              <ul className="space-y-1">
                {business.protects.map((dep) => (
                  <li
                    key={dep.business_id}
                    className="flex items-center justify-between bg-slate-900/60 px-2.5 py-1.5 rounded border border-indigo-900/30"
                  >
                    <span className="text-white font-medium">{dep.name}</span>
                    <span className="text-emerald-400 font-mono text-[11px]">
                      {(dep.intensity * 100).toFixed(0)}% supply link
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-xs text-slate-400 mt-1">
              Direct storefront consumer endpoint. No downstream commercial businesses depend on this entity for supply.
            </p>
          )}
        </div>

        {/* Full Justification */}
        <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/40">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Decision Justification
          </h3>
          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans">
            {business.justification}
          </p>
        </div>

        {/* Multi-Hop Traversal Paths */}
        {business.paths.length > 0 && (
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/40">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <GitFork className="w-4 h-4 text-cyan-400" />
              GQL Graph Traversal Paths ({business.paths.length})
            </h3>
            <div className="space-y-2.5">
              {business.paths.map((p, idx) => (
                <div
                  key={idx}
                  className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 text-xs flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-semibold text-cyan-300">
                      Edge {idx + 1}: -[:{p.relationship}]-&gt;
                    </span>
                    <span className="font-mono text-slate-400">
                      {p.relationship === 'DrawsFootfall'
                        ? `${((p.worker_share || 0) * 100).toFixed(0)}% worker share`
                        : `${((p.intensity || 0) * 100).toFixed(0)}% supply intensity`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-200">
                    <span className="truncate font-medium">{p.from.name}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="truncate font-medium text-emerald-300">{p.to.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Evidence: Real vs Modeled */}
        <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/40 space-y-3">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Database className="w-4 h-4 text-purple-400" />
            Evidence Attribution (Audit Rigor)
          </h3>

          <div className="space-y-2 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                ✓ Verified Ground Truth (Real)
              </span>
              <ul className="mt-1 space-y-1">
                {business.evidence.real.map((ev, i) => (
                  <li key={i} className="text-slate-300 bg-emerald-950/20 px-2.5 py-1 rounded border border-emerald-900/30">
                    {ev}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                ~ Modeled Coefficients (Simulated)
              </span>
              <ul className="mt-1 space-y-1">
                {business.evidence.modeled.map((ev, i) => (
                  <li key={i} className="text-slate-300 bg-amber-950/20 px-2.5 py-1 rounded border border-amber-900/30">
                    {ev}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Census Tract Demographics */}
        <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/40">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <Building className="w-4 h-4 text-blue-400" />
            Census Tract Demographics
          </h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase">Poverty Rate</span>
              <span className="text-base font-bold text-white mt-0.5 block">
                {(business.tract.poverty_rate * 100).toFixed(0)}%
              </span>
              <span className="text-[10px] text-slate-500">Above corridor avg</span>
            </div>
            <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase">Transit Dependency</span>
              <span className="text-base font-bold text-white mt-0.5 block">
                {(business.tract.no_vehicle_rate * 100).toFixed(0)}%
              </span>
              <span className="text-[10px] text-slate-500">Zero-vehicle HHs</span>
            </div>
          </div>
        </div>

        {/* Runner-Up Comparison */}
        {runnerUp && (
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-amber-400" />
              Counterfactual Audit vs. Runner-Up
            </h3>
            <p className="text-xs text-slate-400 mb-2">
              Comparison against <strong>{runnerUp.name}</strong> ($
              {runnerUp.amount_proposed.toLocaleString()} marginal allocation):
            </p>
            <p className="text-xs text-slate-300 leading-relaxed bg-slate-900 p-2.5 rounded border border-slate-800">
              {runnerUp.why_not}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
