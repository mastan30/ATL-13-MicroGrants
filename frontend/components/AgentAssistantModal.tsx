'use strict';
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, User, Sparkles, X, RefreshCw, Cpu, CheckCircle2 } from 'lucide-react';
import {
  getOrGenerateUserId,
  getAgentVersion,
  createAgentSession,
  sendAgentMessage,
  AgentVersionInfo,
} from '@/lib/agentApi';

interface AgentAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
}

let messageCounter = 0;
function generateMsgId(prefix: string): string {
  messageCounter += 1;
  return `${prefix}_${messageCounter}_${Math.random().toString(36).substring(2, 7)}`;
}

export const AgentAssistantModal: React.FC<AgentAssistantModalProps> = ({ isOpen, onClose }) => {
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
    'What downstream suppliers are most vulnerable to anchor loss?',
    'Explain the micro-grant allocation strategy for Central Market.',
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    if (!isOpen) return;

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
              text: `Hello! I am the Anchor Agent (v${ver.version}, ${ver.language} ${ver.language_version}). Active session initialized for user \`${userId}\`. How can I assist with your corridor economic resilience strategy today?`,
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
  }, [isOpen, sessionId, userId]);

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

      const agentMsg: ChatMessage = {
        id: generateMsgId('agent'),
        sender: 'agent',
        text: responseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, agentMsg]);
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

  if (!isOpen) return null;

  return (
    <div
      style={{ zIndex: 99999 }}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
    >
      <div className="relative w-full max-w-2xl h-[650px] max-h-[90vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="p-4 px-6 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base text-white">Anchor Agent Assistant</h2>
                {versionInfo && (
                  <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    v{versionInfo.version}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                <span>User: <code className="text-blue-400">{userId || 'default_user'}</code></span>
                {sessionId && (
                  <>
                    <span>·</span>
                    <span className="truncate max-w-[150px]">Session: <code className="text-slate-400">{sessionId}</code></span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetSession}
              disabled={isInitializing}
              title="Reset Agent Session"
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition"
            >
              <RefreshCw className={`w-4 h-4 ${isInitializing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Chat Message List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-950/50">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300">
              {error}
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 text-xs sm:text-sm ${
                msg.sender === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.sender === 'agent' && (
                <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0 text-blue-400">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[82%] p-3.5 rounded-2xl shadow-sm leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-br-xs'
                    : 'bg-slate-800/90 border border-slate-700/60 text-slate-200 rounded-bl-xs'
                }`}
              >
                <div className="whitespace-pre-wrap font-sans">{msg.text}</div>
                <div
                  className={`text-[10px] mt-1.5 text-right opacity-60 ${
                    msg.sender === 'user' ? 'text-blue-100' : 'text-slate-400'
                  }`}
                >
                  {msg.timestamp}
                </div>
              </div>

              {msg.sender === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0 text-indigo-400">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 text-xs justify-start items-center">
              <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 animate-pulse">
                <Cpu className="w-4 h-4" />
              </div>
              <div className="bg-slate-800/80 border border-slate-700/60 p-3 rounded-2xl text-slate-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
                <span>Anchor Agent thinking...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Preset Prompt Suggestion Chips */}
        <div className="p-2.5 px-4 bg-slate-900 border-t border-slate-800 flex items-center gap-2 overflow-x-auto">
          <Sparkles className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0">Prompts:</span>
          {presetQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(q)}
              disabled={isLoading || !sessionId}
              className="text-[11px] bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white px-2.5 py-1 rounded-lg shrink-0 transition"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 px-4 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder={sessionId ? "Ask Anchor Agent anything..." : "Connecting to session..."}
            disabled={isLoading || !sessionId}
            className="flex-1 bg-slate-900 border border-slate-800 focus:border-blue-500 text-xs sm:text-sm text-white rounded-xl px-4 py-2.5 focus:outline-hidden transition placeholder:text-slate-500"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={isLoading || !sessionId || !inputMessage.trim()}
            className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold transition shadow-md shadow-blue-600/20 shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
