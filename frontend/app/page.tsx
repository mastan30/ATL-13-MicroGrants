'use strict';
'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { DecisionsResponse, BusinessDecision } from '@/types/scenario';
import initialMockData from '@/data/mock_decisions.json';
import { ScenarioControls } from '@/components/ScenarioControls';
import { SensitivityBanner } from '@/components/SensitivityBanner';
import { HoverCard } from '@/components/HoverCard';
import { DetailSidePanel } from '@/components/DetailSidePanel';
import { MemoModal } from '@/components/MemoModal';
import { AgentChatPanel } from '@/components/AgentChatPanel';
import {
  ShieldCheck,
  Building2,
  PieChart,
  DollarSign,
  TrendingUp,
  Sparkles,
} from 'lucide-react';

// Dynamic import for Leaflet / MapView to disable SSR
const MapView = dynamic(
  () => import('@/components/MapView').then((mod) => mod.MapView),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[680px] rounded-2xl bg-slate-950 flex flex-col items-center justify-center border border-slate-800 text-slate-400">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-sm font-medium">Loading BigQuery Property Graph Map...</p>
      </div>
    ),
  }
);

export default function MicroGrantsDashboard() {
  const [data, setData] = useState<DecisionsResponse>(initialMockData as unknown as DecisionsResponse);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Hover state (instantaneous, never triggers network)
  const [hoveredBusiness, setHoveredBusiness] = useState<BusinessDecision | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null);

  // Click selection state for full inspection side panel
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessDecision | null>(null);

  // Memo modal state
  const [isMemoOpen, setIsMemoOpen] = useState<boolean>(false);

  // Scenario parameter changes
  const handleBudgetChange = (budget: number) => {
    setData((prev) => ({
      ...prev,
      scenario: { ...prev.scenario, budget },
    }));
  };

  const handleGrantEffectChange = (effect: number) => {
    setData((prev) => ({
      ...prev,
      scenario: { ...prev.scenario, grant_effect: effect },
    }));
  };

  const handleRerun = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          block_id: data.scenario.block_id,
          budget: data.scenario.budget,
          grant_effect: data.scenario.grant_effect,
        }),
      });

      if (res.ok) {
        const result = (await res.json()) as DecisionsResponse;
        setData(result);
        if (selectedBusiness) {
          const updated = result.businesses.find((b) => b.business_id === selectedBusiness.business_id);
          if (updated) setSelectedBusiness(updated);
        }
      }
    } catch (e) {
      console.error('Failed to rerun scenario:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const totalFunded = data.businesses
    .filter((b) => b.status === 'funded')
    .reduce((sum, b) => sum + b.amount, 0);

  const fundedCount = data.businesses.filter((b) => b.status === 'funded').length;
  const exposedCount = data.businesses.filter((b) => b.status === 'exposed_not_funded').length;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md sticky top-0 z-30 px-6 py-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-black text-white text-base shadow-lg shadow-blue-500/20">
            A4I
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base text-white tracking-tight">
                Community Economic Resilience & Micro-Grants
              </h1>
              <span className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded uppercase flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Live Agent
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Corridor: <strong className="text-slate-300">Central Market, SF</strong> · Target Table:{' '}
              <code className="text-blue-400 font-mono text-[11px]">
                qwiklabs-gcp-04-e4952d3717e9.a4i_econ.businesses
              </code>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-700/50">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Anchor Agent GQL Graph Connected</span>
          </div>

          <button
            onClick={() => setIsMemoOpen(true)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-md shadow-blue-600/20 transition active:scale-95"
          >
            <ShieldCheck className="w-4 h-4" />
            Decision Memo
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 p-6 max-w-[1600px] w-full mx-auto flex flex-col gap-5">
        {/* Scenario Controls Bar */}
        <ScenarioControls
          scenario={data.scenario}
          isLoading={isLoading}
          onBudgetChange={handleBudgetChange}
          onGrantEffectChange={handleGrantEffectChange}
          onRerun={handleRerun}
          onOpenMemo={() => setIsMemoOpen(true)}
        />

        {/* Sensitivity Banner */}
        <SensitivityBanner
          sensitivity={data.sensitivity}
          grantEffect={data.scenario.grant_effect}
        />

        {/* Side-by-Side Split Workspace: Map on Left, Agent Chat on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch h-[680px] min-h-[680px]">
          {/* Left Column: Interactive Leaflet Property Graph Map (7 cols) */}
          <div className="lg:col-span-7 xl:col-span-7 relative w-full h-[680px] min-h-[680px] rounded-2xl overflow-hidden shadow-2xl border border-slate-800">
            <MapView
              anchor={data.anchor}
              businesses={data.businesses}
              activeBusiness={hoveredBusiness}
              selectedBusiness={selectedBusiness}
              onHoverBusiness={(biz, pos) => {
                setHoveredBusiness(biz);
                setHoverPosition(pos);
              }}
              onSelectBusiness={(biz) => setSelectedBusiness(biz)}
            />
          </div>

          {/* Right Column: Interactive Docked Agent Chat Panel (5 cols) */}
          <div className="lg:col-span-5 xl:col-span-5 w-full h-[680px] min-h-[680px]">
            <AgentChatPanel
              businesses={data.businesses}
              onSelectBusiness={(biz) => setSelectedBusiness(biz)}
              selectedBusiness={selectedBusiness}
            />
          </div>
        </div>

        {/* Global Floating Overlays */}
        <HoverCard business={hoveredBusiness} position={hoverPosition} />
        <DetailSidePanel
          business={selectedBusiness}
          runnerUp={data.runner_up}
          onClose={() => setSelectedBusiness(null)}
        />

        {/* Bottom Equity Audit & Performance Metrics Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-1">
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-4 shadow-md flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Total Committed
              </span>
              <p className="text-xl font-black text-white mt-0.5">
                ${totalFunded.toLocaleString()}
              </p>
              <span className="text-[11px] text-emerald-400 font-medium">
                {fundedCount} of {data.businesses.length} businesses funded
              </span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-4 shadow-md flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Exposed Cascade
              </span>
              <p className="text-xl font-black text-white mt-0.5">
                {exposedCount} Unfunded
              </p>
              <span className="text-[11px] text-amber-400 font-medium">
                Full justification on map hover
              </span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-4 shadow-md flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/30">
              <PieChart className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                High-Poverty Equity Share
              </span>
              <p className="text-xl font-black text-white mt-0.5">
                {(data.equity_audit.high_poverty_tract_share_funded * 100).toFixed(0)}%
              </p>
              <span className="text-[11px] text-slate-400">
                vs {(data.equity_audit.high_poverty_tract_share_corridor * 100).toFixed(0)}% corridor baseline
              </span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-4 shadow-md flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/30">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Restaurant Sector Share
              </span>
              <p className="text-xl font-black text-white mt-0.5">
                {(data.equity_audit.restaurant_share_funded * 100).toFixed(0)}%
              </p>
              <span className="text-[11px] text-slate-400">
                vs {(data.equity_audit.restaurant_share_corridor * 100).toFixed(0)}% corridor baseline
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grant Decision Memorandum Modal */}
      <MemoModal
        isOpen={isMemoOpen}
        onClose={() => setIsMemoOpen(false)}
        memoMarkdown={data.memo_markdown}
      />
    </main>
  );
}
