'use client';

import React from 'react';
import type { BusinessStatus } from '@/types/scenario';
import { STATUS_LABEL } from '@/lib/format';

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

const STATUS_STYLES: Record<BusinessStatus, { pill: string; dot: string }> = {
  funded: { pill: 'bg-funded-soft text-funded', dot: 'bg-funded' },
  exposed_not_funded: { pill: 'bg-exposed-soft text-exposed', dot: 'bg-exposed-dot' },
  unaffected: { pill: 'bg-idle-soft text-ink-2', dot: 'bg-idle' },
};

export function StatusBadge({ status, className }: { status: BusinessStatus; className?: string }) {
  const s = STATUS_STYLES[status];
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap',
        s.pill,
        className
      )}
    >
      <span className={cx('size-1.5 rounded-full', s.dot)} />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function StatusDot({ tone, pulse }: { tone: 'ok' | 'warn' | 'off' | 'busy'; pulse?: boolean }) {
  const color = { ok: 'bg-funded', warn: 'bg-exposed-dot', off: 'bg-idle', busy: 'bg-sky-500' }[tone];
  return (
    <span className="relative inline-flex size-2">
      {pulse && <span className={cx('absolute inset-0 animate-ping rounded-full opacity-60', color)} />}
      <span className={cx('relative inline-flex size-2 rounded-full', color)} />
    </span>
  );
}

interface SegmentedProps<T extends string | number> {
  label: string;
  value: T;
  options: { value: T; label: string; hint?: string }[];
  onChange: (value: T) => void;
  isActive?: (option: T, value: T) => boolean;
}

export function Segmented<T extends string | number>({ label, value, options, onChange, isActive }: SegmentedProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex w-full rounded-lg bg-subtle p-0.5 ring-1 ring-line ring-inset sm:w-fit">
      {options.map((opt) => {
        const active = isActive ? isActive(opt.value, value) : opt.value === value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            role="radio"
            aria-checked={active}
            title={opt.hint}
            onClick={() => onChange(opt.value)}
            className={cx(
              'tabular flex-1 rounded-md px-3 py-1.5 text-[13px] font-medium whitespace-nowrap transition-colors sm:flex-none',
              'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand',
              active ? 'bg-surface text-ink shadow-sm ring-1 ring-line' : 'text-ink-2 hover:text-ink'
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cx('text-[11px] font-medium tracking-wide text-ink-3 uppercase', className)}>{children}</div>
  );
}
