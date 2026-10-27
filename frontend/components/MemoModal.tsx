'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X, Download, Copy, Check } from 'lucide-react';
import { Markdown } from '@/lib/markdown';
import { DecisionsSource } from '@/types/scenario';

interface MemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  memoMarkdown: string;
  source: DecisionsSource;
}

export const MemoModal: React.FC<MemoModalProps> = ({ isOpen, onClose, memoMarkdown, source }) => {
  const [copied, setCopied] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    closeRef.current?.focus({ focusVisible: false } as FocusOptions);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(memoMarkdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked (permissions, insecure context); the download still works.
    }
  };

  const handleDownload = () => {
    const blob = new Blob([memoMarkdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grant-memo-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[1200] flex items-end justify-center sm:items-center sm:p-6">
      <div className="absolute inset-0 animate-fade-in bg-ink/30" onClick={onClose} aria-hidden />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="memo-title"
        className="relative flex max-h-[92dvh] w-full max-w-3xl animate-pop-in flex-col overflow-hidden rounded-t-2xl bg-surface shadow-2xl ring-1 ring-line sm:max-h-[88dvh] sm:rounded-2xl"
      >
        <header className="flex items-center gap-3 border-b border-line px-5 py-3.5 sm:px-6">
          <div className="min-w-0 flex-1">
            <h2 id="memo-title" className="text-[15px] font-semibold text-ink">Grant memo</h2>
            <p className="text-xs text-ink-3">
              {source === 'agent' ? 'Written by the agent for this scenario' : 'Sample memo · not generated from BigQuery'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium text-ink-2 ring-1 ring-line transition-colors hover:bg-subtle hover:text-ink"
          >
            {copied ? <Check className="size-3.5 text-funded" /> : <Copy className="size-3.5" />}
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-brand px-3 text-[13px] font-medium text-white transition-colors hover:bg-brand-hover"
          >
            <Download className="size-3.5" />
            <span className="hidden sm:inline">Download</span>
          </button>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close memo"
            className="-mr-1.5 rounded-lg p-1.5 text-ink-3 transition-colors hover:bg-subtle hover:text-ink focus-visible:outline-2 focus-visible:outline-brand"
          >
            <X className="size-5" />
          </button>
        </header>

        <div className="overflow-y-auto overscroll-contain bg-subtle px-3 py-3 sm:px-6 sm:py-6">
          <article className="rounded-xl bg-surface px-5 py-6 text-[14px] leading-relaxed text-ink-2 ring-1 ring-line sm:px-10 sm:py-10">
            <Markdown source={memoMarkdown} />
          </article>
        </div>
      </div>
    </div>
  );
};
