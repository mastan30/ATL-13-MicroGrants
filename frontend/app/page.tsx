'use client';

import React, { useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
import { FileText, Landmark } from 'lucide-react';
import { BusinessDecision, DecisionsResponse } from '@/types/scenario';
import initialMockData from '@/data/mock_decisions.json';
import { ScenarioControls } from '@/components/ScenarioControls';
import { StatTiles } from '@/components/StatTiles';
import { DecisionList } from '@/components/DecisionList';
import { HoverCard } from '@/components/HoverCard';
import { DetailSidePanel } from '@/components/DetailSidePanel';
import { MemoModal } from '@/components/MemoModal';
import { AgentChatPanel, AgentStatus } from '@/components/AgentChatPanel';
import { StatusDot, cx } from '@/components/ui';

// Leaflet touches `window`, so the map only renders in the browser.
const MapView = dynamic(() => import('@/components/MapView').then((mod) => mod.MapView), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center bg-[#eef1f0] text-sm text-ink-3">Loading map…</div>,
});

const INITIAL: DecisionsResponse = { ...(initialMockData as unknown as DecisionsResponse), source: 'sample' };

type Tab = 'decisions' | 'agent';

export default function MicroGrantsDashboard() {
  const [data, setData] = useState<DecisionsResponse>(INITIAL);
  const [lastRun, setLastRun] = useState({ budget: INITIAL.scenario.budget, effect: INITIAL.scenario.grant_effect });
  const [isLoading, setIsLoading] = useState(false);
  const [tab, setTab] = useState<Tab>('decisions');
  const [agentStatus, setAgentStatus] = useState<AgentStatus>('connecting');

  const [hoverId, setHoverId] = useState<string | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [selected, setSelected] = useState<BusinessDecision | null>(null);
  const [isMemoOpen, setIsMemoOpen] = useState(false);

  const source = data.source ?? 'sample';
  const hovered = hoverId ? data.businesses.find((b) => b.business_id === hoverId) ?? null : null;
  const isDirty = data.scenario.budget !== lastRun.budget || Math.abs(data.scenario.grant_effect - lastRun.effect) > 0.001;

  const handleMapHover = useCallback((biz: BusinessDecision | null, pos: { x: number; y: number } | null) => {
    setHoverId(biz?.business_id ?? null);
    setHoverPos(pos);
  }, []);

  const handleListHover = useCallback((biz: BusinessDecision | null) => {
    setHoverId(biz?.business_id ?? null);
    setHoverPos(null);
  }, []);

  const handleSelect = useCallback((biz: BusinessDecision) => {
    setHoverId(null);
    setHoverPos(null);
    setSelected(biz);
  }, []);

  const closeDetail = useCallback(() => setSelected(null), []);
  const closeMemo = useCallback(() => setIsMemoOpen(false), []);

  const runScenario = async () => {
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
        setLastRun({ budget: result.scenario.budget, effect: result.scenario.grant_effect });
        setSelected((prev) => (prev ? result.businesses.find((b) => b.business_id === prev.business_id) ?? null : null));
      }
    } catch (e) {
      console.error('Failed to run scenario:', e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-[900] border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-3 px-4 sm:px-6">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand text-white">
            <Landmark className="size-[18px]" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[15px] font-semibold tracking-tight text-ink">Micro-Grants Decision Desk</h1>
            <p className="truncate text-xs text-ink-3">Anchor-closure track · Central Market, San Francisco</p>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <Pill
              tone={source === 'agent' ? 'ok' : 'warn'}
              title={
                source === 'agent'
                  ? 'Decisions come from the deployed agent'
                  : 'Map and decisions come from the bundled sample file, not from BigQuery'
              }
            >
              {source === 'agent' ? 'Live agent data' : 'Sample data'}
            </Pill>
            <Pill
              tone={agentStatus === 'connected' ? 'ok' : agentStatus === 'connecting' ? 'busy' : 'off'}
              pulse={agentStatus === 'connecting'}
            >
              {agentStatus === 'connected' ? 'Agent connected' : agentStatus === 'connecting' ? 'Connecting to agent' : 'Agent offline'}
            </Pill>
          </div>

          <button
            type="button"
            onClick={() => setIsMemoOpen(true)}
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg bg-brand px-3.5 text-[13px] font-medium text-white transition-colors hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <FileText className="size-4" />
            <span className="hidden sm:inline">Grant memo</span>
            <span className="sm:hidden">Memo</span>
          </button>
        </div>
      </header>

      <main className="mx-auto flex max-w-[1440px] flex-col gap-4 px-4 py-4 sm:gap-5 sm:px-6 sm:py-6">
        {source === 'sample' && (
          <div className="flex items-start gap-2.5 rounded-xl bg-exposed-soft px-4 py-2.5 text-[13px] text-exposed md:hidden">
            <StatusDot tone="warn" />
            <span className="-mt-1">Showing sample data, not results from BigQuery.</span>
          </div>
        )}

        <ScenarioControls
          scenario={data.scenario}
          sensitivity={data.sensitivity}
          isLoading={isLoading}
          isDirty={isDirty}
          onBudgetChange={(budget) => setData((prev) => ({ ...prev, scenario: { ...prev.scenario, budget } }))}
          onGrantEffectChange={(grant_effect) => setData((prev) => ({ ...prev, scenario: { ...prev.scenario, grant_effect } }))}
          onRun={runScenario}
        />

        <StatTiles data={data} />

        <div className="grid gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
          <section
            aria-label="Corridor map"
            className="h-[440px] overflow-hidden rounded-2xl bg-surface shadow-sm ring-1 ring-line sm:h-[520px] lg:h-[620px]"
          >
            <MapView
              anchor={data.anchor}
              businesses={data.businesses}
              highlightId={hoverId}
              selectedId={selected?.business_id ?? null}
              onHoverBusiness={handleMapHover}
              onSelectBusiness={handleSelect}
            />
          </section>

          <section className="flex h-[560px] flex-col overflow-hidden rounded-2xl bg-surface shadow-sm ring-1 ring-line lg:h-[620px]">
            <div role="tablist" aria-label="Side panel" className="flex shrink-0 gap-1 border-b border-line px-3 pt-2">
              <TabButton active={tab === 'decisions'} onClick={() => setTab('decisions')} id="decisions">
                Decisions
                <span className="tabular ml-1.5 rounded-full bg-idle-soft px-1.5 text-[11px] text-ink-2">{data.businesses.length}</span>
              </TabButton>
              <TabButton active={tab === 'agent'} onClick={() => setTab('agent')} id="agent">
                Ask the agent
                <span className="ml-1.5">
                  <StatusDot tone={agentStatus === 'connected' ? 'ok' : agentStatus === 'connecting' ? 'busy' : 'off'} />
                </span>
              </TabButton>
            </div>

            {/* Both panels stay mounted so the agent session survives tab switches. */}
            <div role="tabpanel" id="panel-decisions" aria-labelledby="tab-decisions" className={cx('min-h-0 flex-1', tab !== 'decisions' && 'hidden')}>
              <DecisionList
                businesses={data.businesses}
                highlightId={hoverId}
                selectedId={selected?.business_id ?? null}
                onHover={handleListHover}
                onSelect={handleSelect}
              />
            </div>
            <div role="tabpanel" id="panel-agent" aria-labelledby="tab-agent" className={cx('min-h-0 flex-1', tab !== 'agent' && 'hidden')}>
              <AgentChatPanel businesses={data.businesses} onSelectBusiness={handleSelect} onStatusChange={setAgentStatus} />
            </div>
          </section>
        </div>

        <footer className="pb-2 text-center text-xs text-ink-3">
          Businesses, loans, job counts and demographics are measured. Which business buys from which, and which shops a block&apos;s workers use, is modeled.
        </footer>
      </main>

      <HoverCard business={hoverPos ? hovered : null} position={hoverPos} />
      <DetailSidePanel business={selected} runnerUp={data.runner_up} onClose={closeDetail} />
      <MemoModal isOpen={isMemoOpen} onClose={closeMemo} memoMarkdown={data.memo_markdown} source={source} />
    </div>
  );
}

function Pill({
  tone,
  pulse,
  title,
  children,
}: {
  tone: 'ok' | 'warn' | 'off' | 'busy';
  pulse?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <span title={title} className="inline-flex h-8 items-center gap-2 rounded-full px-3 text-xs font-medium text-ink-2 ring-1 ring-line">
      <StatusDot tone={tone} pulse={pulse} />
      {children}
    </span>
  );
}

function TabButton({
  active,
  onClick,
  id,
  children,
}: {
  active: boolean;
  onClick: () => void;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      id={`tab-${id}`}
      aria-selected={active}
      aria-controls={`panel-${id}`}
      onClick={onClick}
      className={cx(
        '-mb-px inline-flex h-10 items-center border-b-2 px-3 text-[13px] font-medium transition-colors',
        active ? 'border-brand text-ink' : 'border-transparent text-ink-3 hover:text-ink'
      )}
    >
      {children}
    </button>
  );
}
