'use client';

import React from 'react';
import { DecisionsResponse } from '@/types/scenario';
import { formatPct, formatUSD } from '@/lib/format';
import { SectionLabel } from '@/components/ui';

export const StatTiles: React.FC<{ data: DecisionsResponse }> = ({ data }) => {
  const funded = data.businesses.filter((b) => b.status === 'funded');
  const exposed = data.businesses.filter((b) => b.status === 'exposed_not_funded');
  const reached = funded.length + exposed.length;
  const committed = funded.reduce((sum, b) => sum + b.amount, 0);
  const budget = data.scenario.budget;
  const used = budget > 0 ? Math.min(1, committed / budget) : 0;
  const eq = data.equity_audit;

  return (
    <section aria-label="Summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Tile label="Committed">
        <Value>{formatUSD(committed)}</Value>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-idle-soft" aria-hidden>
          <div className="h-full rounded-full bg-funded" style={{ width: `${used * 100}%` }} />
        </div>
        <Caption>
          {formatPct(used)} of {formatUSD(budget)} budget
        </Caption>
      </Tile>

      <Tile label="Funded">
        <Value>
          {funded.length}
          <span className="ml-1 text-base font-normal text-ink-3">of {reached} exposed</span>
        </Value>
        <Caption>Hover a business to see what its grant protects</Caption>
      </Tile>

      <Tile label="Exposed, not funded">
        <Value className={exposed.length ? 'text-exposed' : undefined}>{exposed.length}</Value>
        <Caption>Each one is named in the memo with the reason</Caption>
      </Tile>

      <Tile label="Equity check">
        <div className="mt-1.5 space-y-2">
          <CompareRow label="High-poverty tracts" funded={eq.high_poverty_tract_share_funded} corridor={eq.high_poverty_tract_share_corridor} />
          <CompareRow label="Restaurants" funded={eq.restaurant_share_funded} corridor={eq.restaurant_share_corridor} />
        </div>
        <Caption>Share of funded vs. corridor</Caption>
      </Tile>
    </section>
  );
};

function Tile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-line sm:p-5">
      <SectionLabel>{label}</SectionLabel>
      {children}
    </div>
  );
}

function Value({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`tabular mt-1.5 text-2xl font-semibold tracking-tight text-ink sm:text-[28px] ${className ?? ''}`}>
      {children}
    </div>
  );
}

function Caption({ children }: { children: React.ReactNode }) {
  return <p className="mt-auto pt-2 text-xs text-ink-3">{children}</p>;
}

function CompareRow({ label, funded, corridor }: { label: string; funded: number; corridor: number }) {
  return (
    <div className="text-xs">
      <div className="flex flex-wrap items-baseline justify-between gap-x-2">
        <span className="text-ink-2">{label}</span>
        <span className="tabular font-medium text-ink">
          {formatPct(funded)} <span className="font-normal text-ink-3">vs {formatPct(corridor)}</span>
        </span>
      </div>
      <div className="relative mt-1 h-1.5 rounded-full bg-idle-soft" aria-hidden>
        <div className="absolute inset-y-0 left-0 rounded-full bg-brand" style={{ width: `${funded * 100}%` }} />
        <div className="absolute -inset-y-0.5 w-0.5 rounded-full bg-exposed-dot" style={{ left: `calc(${corridor * 100}% - 1px)` }} />
      </div>
    </div>
  );
}
