'use client';

import { useEffect, useState, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';
import { getSession } from 'next-auth/react';

const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ?? (typeof window !== 'undefined' ? window.location.origin : '');

export interface StreamState {
  tokens: string[];
  agentUnavailable: boolean;
  complete: boolean;
}

export function useConversationStream(conversationId: string | null) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [tokens, setTokens] = useState<string[]>([]);
  const [agentUnavailable, setAgentUnavailable] = useState(false);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    if (!conversationId || !WS_URL) return;
    let s: Socket | null = null;
    getSession().then((session) => {
      const token =
        session && 'accessToken' in session
          ? (session as { accessToken?: string }).accessToken
          : (session as { token?: string })?.token;
      s = io(WS_URL, {
        path: '/socket.io',
        auth: { token: token ?? '' },
      });
      s.on('connect', () => {
        s?.emit('join_conversation', conversationId);
      });
      s.on('message.token', (payload: { payload?: { text?: string } }) => {
        const text = payload?.payload?.text;
        if (text) setTokens((prev) => [...prev, text]);
      });
      s.on('agent.unavailable', () => setAgentUnavailable(true));
      s.on('agent.available', () => setAgentUnavailable(false));
      s.on('message.complete', () => setComplete(true));
      setSocket(s);
    });
    return () => {
      if (s) {
        s.emit('leave_conversation', conversationId);
        s.disconnect();
      }
      setSocket(null);
      setTokens([]);
      setComplete(false);
    };
  }, [conversationId]);

  const resetStream = useCallback(() => {
    setTokens([]);
    setComplete(false);
  }, []);

  return {
    tokens,
    agentUnavailable,
    complete,
    resetStream,
    connected: socket?.connected ?? false,
  };
}
