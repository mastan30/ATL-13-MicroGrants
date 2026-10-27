'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUp, RotateCcw, MapPin } from 'lucide-react';
import { BusinessDecision } from '@/types/scenario';
import { getOrGenerateUserId, getAgentVersion, createAgentSession, sendAgentMessage } from '@/lib/agentApi';
import { Markdown } from '@/lib/markdown';
import { cx } from '@/components/ui';

export type AgentStatus = 'connecting' | 'connected' | 'offline';

interface AgentChatPanelProps {
  businesses: BusinessDecision[];
  onSelectBusiness: (biz: BusinessDecision) => void;
  onStatusChange?: (status: AgentStatus) => void;
}

interface ChatMessage {
  id: number;
  sender: 'user' | 'agent';
  text: string;
  mentionedIds?: string[];
}

const SUGGESTIONS = [
  'Mint Plaza Office Block is closing in 90 days. Who is exposed?',
  'Which upstream supplier is most critical to protect?',
  'Why was the runner-up not funded?',
];

/** Checks the agent is up and opens a session; resolves to the session id. */
async function openSession(userId: string): Promise<string> {
  await getAgentVersion();
  const session = await createAgentSession(userId);
  return session.id;
}

export const AgentChatPanel: React.FC<AgentChatPanelProps> = ({ businesses, onSelectBusiness, onStatusChange }) => {
  const userIdRef = useRef<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<AgentStatus>('connecting');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(0);

  const updateStatus = useCallback(
    (s: AgentStatus) => {
      setStatus(s);
      onStatusChange?.(s);
    },
    [onStatusChange]
  );

  const applySession = useCallback(
    (id: string | null) => {
      setSessionId(id);
      setMessages([]);
      updateStatus(id ? 'connected' : 'offline');
    },
    [updateStatus]
  );

  const reconnect = () => {
    const uid = userIdRef.current;
    if (!uid) return;
    updateStatus('connecting');
    setError(null);
    openSession(uid).then(applySession, () => applySession(null));
  };

  // localStorage only exists in the browser, so the user id is read after hydration.
  useEffect(() => {
    const uid = getOrGenerateUserId();
    userIdRef.current = uid;
    openSession(uid).then(applySession, () => applySession(null));
  }, [applySession]);

  // Scroll the message log itself, never the page.
  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTo({ top: log.scrollHeight, behavior: 'smooth' });
  }, [messages, isSending]);

  const findMentions = (text: string) => {
    const lower = text.toLowerCase();
    return businesses.filter((b) => lower.includes(b.name.toLowerCase())).map((b) => b.business_id);
  };

  const send = async (text: string) => {
    const question = text.trim();
    const userId = userIdRef.current;
    if (!question || !sessionId || !userId || isSending) return;
    setMessages((prev) => [...prev, { id: nextId.current++, sender: 'user', text: question }]);
    setInput('');
    setIsSending(true);
    setError(null);
    try {
      const answer = await sendAgentMessage(sessionId, question, userId);
      setMessages((prev) => [...prev, { id: nextId.current++, sender: 'agent', text: answer, mentionedIds: findMentions(answer) }]);
    } catch {
      setError('The agent did not answer. Try again, or start a new conversation.');
    } finally {
      setIsSending(false);
    }
  };

  const canSend = status === 'connected' && !isSending;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={logRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4">
        {status === 'offline' && (
          <div className="rounded-xl bg-subtle p-4 text-[13px] text-ink-2 ring-1 ring-line">
            <div className="font-medium text-ink">The agent is offline</div>
            <p className="mt-1">
              The map and decisions still work from the scenario data. Check that the agent service is running, then retry.
            </p>
            <button
              type="button"
              onClick={reconnect}
              className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-lg bg-surface px-3 text-[13px] font-medium text-ink ring-1 ring-line hover:bg-canvas"
            >
              <RotateCcw className="size-3.5" /> Retry
            </button>
          </div>
        )}

        {status !== 'offline' && messages.length === 0 && (
          <div className="px-1 pt-2">
            <div className="text-sm font-medium text-ink">Ask the agent</div>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
              It traverses the corridor graph and explains who a closure reaches. Try one of these:
            </p>
            <div className="mt-3 flex flex-col gap-2">
              {SUGGESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  disabled={!canSend}
                  onClick={() => send(q)}
                  className="rounded-lg px-3 py-2 text-left text-[13px] text-ink-2 ring-1 ring-line transition-colors hover:bg-subtle hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) =>
          msg.sender === 'user' ? (
            <div key={msg.id} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-md bg-brand px-3.5 py-2 text-[13px] leading-relaxed text-white">
                {msg.text}
              </div>
            </div>
          ) : (
            <div key={msg.id} className="text-[13px] leading-relaxed text-ink-2 [&_h1]:text-base [&_h2]:text-[15px] [&_h3]:text-sm">
              <Markdown source={msg.text} />
              {!!msg.mentionedIds?.length && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {msg.mentionedIds.map((id) => {
                    const biz = businesses.find((b) => b.business_id === id);
                    if (!biz) return null;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => onSelectBusiness(biz)}
                        className="inline-flex items-center gap-1 rounded-full bg-subtle px-2.5 py-1 text-xs font-medium text-ink ring-1 ring-line hover:bg-canvas"
                      >
                        <MapPin className="size-3 text-ink-3" />
                        {biz.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )
        )}

        {isSending && (
          <div className="flex items-center gap-2 text-[13px] text-ink-3" aria-live="polite">
            <span className="flex gap-1">
              <span className="size-1.5 animate-bounce rounded-full bg-ink-3 [animation-delay:-0.3s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-ink-3 [animation-delay:-0.15s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-ink-3" />
            </span>
            Traversing the graph…
          </div>
        )}

        {error && <div className="rounded-lg bg-anchor-soft px-3 py-2 text-[13px] text-anchor">{error}</div>}
      </div>

      <form
        className="flex items-end gap-2 border-t border-line p-3"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <label htmlFor="agent-input" className="sr-only">Message the agent</label>
        <input
          id="agent-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={status === 'connected' ? 'Ask about exposure, grants or assumptions…' : status === 'connecting' ? 'Connecting…' : 'Agent offline'}
          disabled={status !== 'connected'}
          autoComplete="off"
          className="h-9 min-w-0 flex-1 rounded-lg bg-subtle px-3 text-[13px] text-ink ring-1 ring-line transition-shadow placeholder:text-ink-3 focus:bg-surface focus:ring-2 focus:ring-brand focus:outline-none disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={!canSend || !input.trim()}
          aria-label="Send"
          className={cx(
            'grid size-9 shrink-0 place-items-center rounded-lg bg-brand text-white transition-colors hover:bg-brand-hover',
            'disabled:bg-idle-soft disabled:text-ink-3'
          )}
        >
          <ArrowUp className="size-4" />
        </button>
        {status === 'connected' && messages.length > 0 && (
          <button
            type="button"
            onClick={reconnect}
            title="Start a new conversation"
            aria-label="Start a new conversation"
            className="grid size-9 shrink-0 place-items-center rounded-lg text-ink-3 ring-1 ring-line transition-colors hover:bg-subtle hover:text-ink"
          >
            <RotateCcw className="size-4" />
          </button>
        )}
      </form>
    </div>
  );
};
