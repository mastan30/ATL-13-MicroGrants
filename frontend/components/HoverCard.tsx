'use client';

import React, { useLayoutEffect, useRef, useState } from 'react';
import { BusinessDecision } from '@/types/scenario';
import { ROLE_LABEL, formatPct, formatUSD } from '@/lib/format';
import { StatusBadge } from '@/components/ui';

interface HoverCardProps {
  business: BusinessDecision | null;
  position: { x: number; y: number } | null;
}

const OFFSET = 16;
const MARGIN = 12;

export const HoverCard: React.FC<HoverCardProps> = ({ business, position }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({ opacity: 0 });

  // Measure the rendered card and flip it to whichever side of the cursor fits the viewport.
  useLayoutEffect(() => {
    if (!position || !ref.current) return;
    const { width, height } = ref.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = position.x + OFFSET;
    if (left + width + MARGIN > vw) left = position.x - OFFSET - width;
    let top = position.y + OFFSET;
    if (top + height + MARGIN > vh) top = position.y - OFFSET - height;
    setStyle({
      left: Math.max(MARGIN, Math.min(left, vw - width - MARGIN)),
      top: Math.max(MARGIN, Math.min(top, vh - height - MARGIN)),
      opacity: 1,
    });
  }, [position, business]);

  if (!business || !position) return null;

  return (
    <div
      ref={ref}
      role="tooltip"
      style={style}
      className="pointer-events-none fixed z-[1000] w-[300px] rounded-xl bg-surface p-4 shadow-[0_12px_32px_rgb(16_41_47/0.16)] ring-1 ring-line"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-ink">{business.name}</div>
          <div className="mt-0.5 truncate text-xs text-ink-3">{business.address}</div>
        </div>
        <StatusBadge status={business.status} />
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-line ring-1 ring-line">
        <div className="bg-surface px-3 py-2">
          <dt className="text-[11px] text-ink-3">Grant</dt>
          <dd className="tabular text-base font-semibold text-ink">{business.amount > 0 ? formatUSD(business.amount) : '—'}</dd>
        </div>
        <div className="bg-surface px-3 py-2">
          <dt className="text-[11px] text-ink-3">Exposure</dt>
          <dd className="tabular text-base font-semibold text-ink">
            {formatPct(business.exposure)}
            <span className="ml-1 text-xs font-normal text-ink-3">
              · {business.hops_from_anchor} {business.hops_from_anchor === 1 ? 'hop' : 'hops'}
            </span>
          </dd>
        </div>
      </dl>

      <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-ink-2">{business.justification}</p>

      <div className="mt-3 flex items-center justify-between text-[11px] text-ink-3">
        <span>{ROLE_LABEL[business.role]}</span>
        <span>Click for the full case</span>
      </div>
    </div>
  );
};
