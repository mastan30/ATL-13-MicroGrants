'use client';

import React, { useEffect, useRef } from 'react';
import { X, MapPin, ArrowRight } from 'lucide-react';
import { BusinessDecision, RunnerUp } from '@/types/scenario';
import { ROLE_LABEL, formatPct, formatUSD } from '@/lib/format';
import { SectionLabel, StatusBadge, cx } from '@/components/ui';

interface DetailSidePanelProps {
  business: BusinessDecision | null;
  runnerUp: RunnerUp | null;
  onClose: () => void;
}

export const DetailSidePanel: React.FC<DetailSidePanelProps> = ({ business, runnerUp, onClose }) => {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!business) return;
    closeRef.current?.focus({ focusVisible: false } as FocusOptions);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [business, onClose]);

  if (!business) return null;

  const isRunnerUp = runnerUp?.business_id === business.business_id;

  return (
    <div className="fixed inset-0 z-[1100]">
      <div className="absolute inset-0 animate-fade-in bg-ink/25" onClick={onClose} aria-hidden />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-title"
        className="absolute inset-y-0 right-0 flex w-full animate-drawer-in flex-col bg-surface shadow-2xl ring-1 ring-line sm:w-[460px]"
      >
        <header className="flex items-start gap-4 border-b border-line px-6 py-5">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={business.status} />
              <span className="text-xs text-ink-3">{ROLE_LABEL[business.role]}</span>
            </div>
            <h2 id="detail-title" className="mt-2 text-xl font-semibold tracking-tight text-ink">
              {business.name}
            </h2>
            <p className="mt-1 flex items-start gap-1.5 text-[13px] text-ink-2">
              <MapPin className="mt-0.5 size-3.5 shrink-0 text-ink-3" />
              <span>
                {business.address} · {business.industry_name} · <span className="whitespace-nowrap">NAICS {business.naics4}</span>
              </span>
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 rounded-lg p-2 text-ink-3 transition-colors hover:bg-subtle hover:text-ink focus-visible:outline-2 focus-visible:outline-brand"
          >
            <X className="size-5" />
          </button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto overscroll-contain px-6 py-5">
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-line ring-1 ring-line">
            <Metric label="Grant" value={business.amount > 0 ? formatUSD(business.amount) : '—'} />
            <Metric
              label="Exposure"
              value={formatPct(business.exposure)}
              sub={`${business.hops_from_anchor} ${business.hops_from_anchor === 1 ? 'hop' : 'hops'} from the closure`}
            />
          </dl>

          <Section title="Why">
            <p className="text-sm leading-relaxed text-ink-2">{business.justification}</p>
          </Section>

          <Section title={`What this grant protects${business.protects.length ? ` · ${business.protects.length}` : ''}`}>
            {business.protects.length ? (
              <ul className="divide-y divide-line rounded-xl ring-1 ring-line">
                {business.protects.map((dep) => (
                  <li key={dep.business_id} className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-[13px]">
                    <span className="min-w-0 truncate font-medium text-ink">{dep.name}</span>
                    <span className="tabular shrink-0 text-xs text-ink-3">
                      {dep.hops} {dep.hops === 1 ? 'hop' : 'hops'} · {formatPct(dep.intensity)} of supply
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-ink-3">No other business in the corridor depends on this one for supply.</p>
            )}
          </Section>

          {business.paths.length > 0 && (
            <Section title={`Graph paths · ${business.paths.length}`}>
              <ol className="space-y-2">
                {business.paths.map((p, idx) => {
                  const isFootfall = p.relationship === 'DrawsFootfall';
                  const share = isFootfall ? p.worker_share ?? 0 : p.intensity ?? 0;
                  return (
                    <li key={idx} className="rounded-xl px-3.5 py-2.5 ring-1 ring-line">
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="flex items-center gap-1.5">
                          <code className={cx('font-mono font-medium', isFootfall ? 'text-anchor' : 'text-brand')}>
                            {isFootfall ? 'DrawsFootfall' : 'Supplies'}
                          </code>
                          {!isFootfall && <span className="text-ink-3">· walked backward</span>}
                        </span>
                        <span className="tabular text-ink-3">
                          {formatPct(share)} {isFootfall ? 'of workers' : 'supply intensity'}
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2 text-[13px] text-ink">
                        <span className="min-w-0 truncate">{p.from.name}</span>
                        <ArrowRight className="size-3.5 shrink-0 text-ink-3" />
                        <span className="min-w-0 truncate font-medium">{p.to.name}</span>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </Section>
          )}

          <Section title="Evidence">
            <div className="space-y-3">
              <EvidenceList tone="real" items={business.evidence.real} />
              <EvidenceList tone="modeled" items={business.evidence.modeled} />
            </div>
          </Section>

          <Section title={`Neighborhood${business.tract.tract_id ? ` · tract ${business.tract.tract_id}` : ''}`}>
            <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-line ring-1 ring-line">
              <Metric label="Poverty rate" value={formatPct(business.tract.poverty_rate)} small />
              <Metric label="Households without a car" value={formatPct(business.tract.no_vehicle_rate)} small />
            </dl>
          </Section>

          {runnerUp && (business.status === 'funded' || isRunnerUp) && (
            <Section title={isRunnerUp ? 'This is the runner-up' : 'Why not the runner-up'}>
              <div className="rounded-xl bg-subtle p-4 ring-1 ring-line">
                <div className="flex items-baseline justify-between gap-3 text-[13px]">
                  <span className="font-medium text-ink">{runnerUp.name}</span>
                  <span className="tabular shrink-0 text-xs text-ink-3">would have received {formatUSD(runnerUp.amount_proposed)}</span>
                </div>
                <p className="mt-2 text-[13px] leading-relaxed text-ink-2">{runnerUp.why_not}</p>
              </div>
            </Section>
          )}
        </div>
      </aside>
    </div>
  );
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <SectionLabel className="mb-2.5">{title}</SectionLabel>
      {children}
    </section>
  );
}

function Metric({ label, value, sub, small }: { label: string; value: string; sub?: string; small?: boolean }) {
  return (
    <div className="bg-surface px-4 py-3">
      <dt className="text-xs text-ink-3">{label}</dt>
      <dd className={cx('tabular mt-0.5 font-semibold tracking-tight text-ink', small ? 'text-lg' : 'text-2xl')}>{value}</dd>
      {sub && <dd className="mt-0.5 text-xs text-ink-3">{sub}</dd>}
    </div>
  );
}

function EvidenceList({ tone, items }: { tone: 'real' | 'modeled'; items: string[] }) {
  if (!items.length) return null;
  const real = tone === 'real';
  return (
    <div>
      <div className={cx('mb-1.5 text-xs font-medium', real ? 'text-funded' : 'text-exposed')}>
        {real ? 'Measured' : 'Modeled'}
      </div>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-[13px] leading-snug text-ink-2">
            <span className={cx('mt-1.5 size-1.5 shrink-0 rounded-full', real ? 'bg-funded' : 'bg-exposed-dot')} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
