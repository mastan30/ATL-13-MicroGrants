'use client';

import React from 'react';
import { ChevronRight } from 'lucide-react';
import { BusinessDecision, BusinessStatus } from '@/types/scenario';
import { ROLE_LABEL, STATUS_LABEL, STATUS_ORDER, formatPct, formatUSD, rankBusinesses } from '@/lib/format';
import { cx } from '@/components/ui';

interface DecisionListProps {
  businesses: BusinessDecision[];
  highlightId: string | null;
  selectedId: string | null;
  onHover: (biz: BusinessDecision | null) => void;
  onSelect: (biz: BusinessDecision) => void;
}

const GROUP_NOTE: Record<BusinessStatus, string> = {
  funded: 'Ranked by grant amount',
  exposed_not_funded: 'Reached by the cascade, no grant',
  unaffected: 'Outside the cascade',
};

export const DecisionList: React.FC<DecisionListProps> = ({ businesses, highlightId, selectedId, onHover, onSelect }) => {
  const ranked = rankBusinesses(businesses);

  return (
    <div className="h-full overflow-y-auto overscroll-contain" onMouseLeave={() => onHover(null)}>
      {STATUS_ORDER.map((status) => {
        const group = ranked.filter((b) => b.status === status);
        if (!group.length) return null;
        return (
          <section key={status} aria-label={STATUS_LABEL[status]}>
            <header className="sticky top-0 z-10 flex items-baseline justify-between border-b border-line bg-subtle/95 px-4 py-2 backdrop-blur">
              <h3 className="text-xs font-semibold text-ink">
                {STATUS_LABEL[status]} <span className="tabular font-normal text-ink-3">· {group.length}</span>
              </h3>
              <span className="text-[11px] text-ink-3">{GROUP_NOTE[status]}</span>
            </header>
            <ul>
              {group.map((biz) => (
                <li key={biz.business_id} className="border-b border-line last:border-b-0">
                  <Row
                    biz={biz}
                    active={biz.business_id === highlightId || biz.business_id === selectedId}
                    onHover={onHover}
                    onSelect={onSelect}
                  />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
};

function Row({
  biz,
  active,
  onHover,
  onSelect,
}: {
  biz: BusinessDecision;
  active: boolean;
  onHover: (biz: BusinessDecision | null) => void;
  onSelect: (biz: BusinessDecision) => void;
}) {
  const barColor = biz.status === 'funded' ? 'bg-funded' : biz.status === 'exposed_not_funded' ? 'bg-exposed-dot' : 'bg-idle';
  return (
    <button
      type="button"
      onMouseEnter={() => onHover(biz)}
      onFocus={() => onHover(biz)}
      onBlur={() => onHover(null)}
      onClick={() => onSelect(biz)}
      className={cx(
        'group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors',
        'focus-visible:bg-subtle focus-visible:outline-none',
        active ? 'bg-subtle' : 'hover:bg-subtle'
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[13px] font-medium text-ink">{biz.name}</span>
        </div>
        <div className="mt-0.5 truncate text-xs text-ink-3">
          {ROLE_LABEL[biz.role]} · {biz.industry_name}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <div className="h-1 flex-1 rounded-full bg-idle-soft" aria-hidden>
            <div className={cx('h-full rounded-full', barColor)} style={{ width: `${Math.max(2, biz.exposure * 100)}%` }} />
          </div>
          <span className="tabular shrink-0 text-[11px] whitespace-nowrap text-ink-3">{formatPct(biz.exposure)} exposed</span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <span className={cx('tabular text-[13px] font-semibold', biz.amount > 0 ? 'text-ink' : 'text-ink-3')}>
          {biz.amount > 0 ? formatUSD(biz.amount) : '—'}
        </span>
        <ChevronRight className="size-4 text-ink-3 opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
    </button>
  );
}
