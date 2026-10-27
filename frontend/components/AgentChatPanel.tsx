'use strict';
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, User, Sparkles, RefreshCw, Cpu, CheckCircle2, MapPin } from 'lucide-react';
import { BusinessDecision } from '@/types/scenario';
import {
  getOrGenerateUserId,
  getAgentVersion,
  createAgentSession,
  sendAgentMessage,
  AgentVersionInfo,
} from '@/lib/agentApi';

interface AgentChatPanelProps {
  businesses: BusinessDecision[];
  onSelectBusiness: (biz: BusinessDecision) => void;
  selectedBusiness: BusinessDecision | null;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
  mentionedBusinessIds?: string[];
}

let messageCounter = 0;
function generateMsgId(prefix: string): string {
  messageCounter += 1;
  return `${prefix}_${messageCounter}_${Math.random().toString(36).substring(2, 7)}`;
}

export const AgentChatPanel: React.FC<AgentChatPanelProps> = ({
  businesses,
  onSelectBusiness,
  selectedBusiness,
}) => {
  const [userId] = useState<string>(() => getOrGenerateUserId());
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [versionInfo, setVersionInfo] = useState<AgentVersionInfo | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const presetQuestions = [
    'The Mint Plaza Office Block is closing in 90 days. Who is exposed?',
    'Which upstream supplier is most critical to protect?',
    'Explain the micro-grant allocation strategy for Central Market.',
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Initialize session on mount
  useEffect(() => {
    async function initialize() {
      setIsInitializing(true);
      setError(null);
      try {
        const ver = await getAgentVersion();
        setVersionInfo(ver);

        if (!sessionId) {
          const session = await createAgentSession(userId);
          setSessionId(session.id);
          setMessages([
            {
              id: generateMsgId('welcome'),
              sender: 'agent',
              text: `Hello! I am the Anchor Agent (v${ver.version}, ${ver.language} ${ver.language_version}). Active session initialized for user \`${userId}\`.\n\nAsk me any question about anchor block closure exposure or grant distribution recommendations.`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ]);
        }
      } catch (err: unknown) {
        console.error('Agent initialization error:', err);
        setError('Failed to connect to the Anchor Agent API server.');
      } finally {
        setIsInitializing(false);
      }
    }

    initialize();
  }, [sessionId, userId]);

  // Detect businesses mentioned in text
  const detectMentionedBusinesses = (text: string): BusinessDecision[] => {
    const matched: BusinessDecision[] = [];
    const textLower = text.toLowerCase();

    businesses.forEach((b) => {
      // Check for business name or parts of business name
      const nameLower = b.name.toLowerCase();
      if (textLower.includes(nameLower)) {
        matched.push(b);
      } else {
        // Also match common key terms like "Sixth St", "Bayside", "Harvest", "SF Center Flowers"
        const words = nameLower.split(' ').filter((w) => w.length > 3);
        const matchCount = words.filter((w) => textLower.includes(w)).length;
        if (words.length > 0 && matchCount >= Math.min(2, words.length)) {
          if (!matched.some((m) => m.business_id === b.business_id)) {
            matched.push(b);
          }
        }
      }
    });

    return matched;
  };

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputMessage;
    if (!textToSend.trim() || !sessionId || isLoading) return;

    const userMsg: ChatMessage = {
      id: generateMsgId('user'),
      sender: 'user',
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customText) setInputMessage('');
    setIsLoading(true);
    setError(null);

    try {
      const responseText = await sendAgentMessage(sessionId, userMsg.text, userId);
      const mentioned = detectMentionedBusinesses(responseText);

      const agentMsg: ChatMessage = {
        id: generateMsgId('agent'),
        sender: 'agent',
        text: responseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        mentionedBusinessIds: mentioned.map((m) => m.business_id),
      };

      setMessages((prev) => [...prev, agentMsg]);

      // Auto-highlight first mentioned business on the map in real time!
      if (mentioned.length > 0) {
        onSelectBusiness(mentioned[0]);
      }
    } catch (err: unknown) {
      console.error('Error sending message to agent:', err);
      setError('Error communicating with the Anchor Agent. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetSession = async () => {
    if (!userId) return;
    setIsInitializing(true);
    setError(null);
    try {
      const session = await createAgentSession(userId);
      setSessionId(session.id);
      setMessages([
        {
          id: generateMsgId('reset'),
          sender: 'agent',
          text: `Session reset successfully! New session ID: \`${session.id}\`. Ask me any question regarding corridor exposure or grant allocations.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err: unknown) {
      console.error('Error resetting session:', err);
      setError('Could not reset session.');
    } finally {
      setIsInitializing(false);
    }
  };

  // Helper to render interactive text with location chips
  const renderMessageText = (msg: ChatMessage) => {
    if (msg.sender !== 'agent') return msg.text;

    const mentioned = (msg.mentionedBusinessIds || [])
      .map((id) => businesses.find((b) => b.business_id === id))
      .filter((b): b is BusinessDecision => Boolean(b));

    return (
      <div className="space-y-2">
        <div className="whitespace-pre-wrap font-sans leading-relaxed">{msg.text}</div>

        {mentioned.length > 0 && (
          <div className="pt-2 border-t border-slate-700/60 flex flex-wrap gap-1.5 items-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-emerald-400" /> Auto-Detected Locations ({mentioned.length}):
            </span>
            {mentioned.map((b) => {
              const isSelected = selectedBusiness?.business_id === b.business_id;
              return (
                <button
                  key={b.business_id}
                  onClick={() => onSelectBusiness(b)}
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg border flex items-center gap-1 transition-all ${
                    isSelected
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold shadow-md shadow-emerald-500/20 scale-105'
                      : 'bg-slate-800/90 text-emerald-300 border-emerald-500/40 hover:bg-emerald-950/50 hover:text-white'
                  }`}
                >
                  <span>📍 {b.name}</span>
                  <span className="opacity-75 font-mono text-[10px]">
                    ({b.status === 'funded' ? `$${(b.amount / 1000).toFixed(0)}k` : 'Exposed'})
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full h-full min-h-[680px] max-h-[680px] bg-slate-900/95 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100 backdrop-blur-md">
      {/* Panel Header */}
      <div className="p-4 px-5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm text-white">Anchor Agent Assistant</h2>
              {versionInfo && (
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  v{versionInfo.version}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
              <span>User: <code className="text-blue-400">{userId}</code></span>
              {sessionId && (
                <>
                  <span>·</span>
                  <span className="truncate max-w-[120px]">Session: <code className="text-slate-400">{sessionId}</code></span>
                </>
              )}
            </p>
          </div>
        </div>

        <button
          onClick={handleResetSession}
          disabled={isInitializing}
          title="Reset Agent Session"
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isInitializing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Chat Messages Log */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-950/40">
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300">
            {error}
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2.5 text-xs sm:text-sm ${
              msg.sender === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.sender === 'agent' && (
              <div className="w-6 h-6 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0 text-blue-400 mt-0.5">
                <Bot className="w-3.5 h-3.5" />
              </div>
            )}

            <div
              className={`max-w-[85%] p-3 rounded-2xl shadow-sm leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-blue-600 text-white rounded-br-xs'
                  : 'bg-slate-800/90 border border-slate-700/60 text-slate-200 rounded-bl-xs'
              }`}
            >
              {renderMessageText(msg)}
              <div
                className={`text-[9px] mt-1 text-right opacity-60 ${
                  msg.sender === 'user' ? 'text-blue-100' : 'text-slate-400'
                }`}
              >
                {msg.timestamp}
              </div>
            </div>

            {msg.sender === 'user' && (
              <div className="w-6 h-6 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0 text-indigo-400 mt-0.5">
                <User className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-2.5 text-xs justify-start items-center">
            <div className="w-6 h-6 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 animate-pulse">
              <Cpu className="w-3.5 h-3.5" />
            </div>
            <div className="bg-slate-800/80 border border-slate-700/60 p-2.5 rounded-2xl text-slate-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
              <span>Anchor Agent reasoning & checking property graph...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Suggestions */}
      <div className="p-2 px-3 bg-slate-900 border-t border-slate-800 flex items-center gap-1.5 overflow-x-auto shrink-0">
        <Sparkles className="w-3.5 h-3.5 text-blue-400 shrink-0" />
        {presetQuestions.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(q)}
            disabled={isLoading || !sessionId}
            className="text-[10px] bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white px-2 py-1 rounded-lg shrink-0 transition"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Message Input Form */}
      <div className="p-3 px-3.5 bg-slate-950 border-t border-slate-800 flex items-center gap-2 shrink-0">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder={sessionId ? "Ask Anchor Agent anything..." : "Connecting session..."}
          disabled={isLoading || !sessionId}
          className="flex-1 bg-slate-900 border border-slate-800 focus:border-blue-500 text-xs text-white rounded-xl px-3.5 py-2 focus:outline-hidden transition placeholder:text-slate-500"
        />
        <button
          onClick={() => handleSendMessage()}
          disabled={isLoading || !sessionId || !inputMessage.trim()}
          className="p-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold transition shadow-md shadow-blue-600/20 shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
