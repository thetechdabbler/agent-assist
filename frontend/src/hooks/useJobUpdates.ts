'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { getSession } from 'next-auth/react';

const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ?? (typeof window !== 'undefined' ? window.location.origin : '');

export interface JobStatusChangedPayload {
  jobId: string;
  from: string;
  to: string;
  tenantId: string;
  conversationId: string;
  errorCode?: string;
  errorSummary?: string;
}

export interface NotificationCreatedPayload {
  id: string;
  userId: string;
  tenantId: string;
  category: string;
  title: string;
  body?: string | null;
  jobId?: string | null;
  conversationId?: string | null;
  createdAt: string;
}

export function useJobUpdates(opts?: {
  onJobChanged?: (payload: JobStatusChangedPayload) => void;
  onNotification?: (payload: NotificationCreatedPayload) => void;
}) {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!WS_URL) return;
    getSession().then((session) => {
      const token =
        session && 'accessToken' in session
          ? (session as { accessToken?: string }).accessToken
          : (session as { token?: string })?.token;
      const s = io(WS_URL, {
        path: '/socket.io',
        auth: { token: token ?? '' },
      });
      socketRef.current = s;
      s.on('connect', () => setConnected(true));
      s.on('disconnect', () => setConnected(false));
      s.on('job.status_changed', (payload: JobStatusChangedPayload) => {
        opts?.onJobChanged?.(payload);
      });
      s.on('notification.created', (payload: NotificationCreatedPayload) => {
        opts?.onNotification?.(payload);
      });
    });
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [opts?.onJobChanged, opts?.onNotification]);

  const invalidate = useCallback(() => {
    opts?.onJobChanged?.({} as JobStatusChangedPayload);
    opts?.onNotification?.({} as NotificationCreatedPayload);
  }, [opts]);

  return { connected, invalidate };
}
