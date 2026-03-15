'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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

export interface GoalEventPayload {
  goalId: string;
  userId: string;
  tenantId: string;
  goalType?: string;
  title?: string;
  status?: string;
}

export function useJobUpdates(opts?: {
  onJobChanged?: (payload: JobStatusChangedPayload) => void;
  onNotification?: (payload: NotificationCreatedPayload) => void;
}) {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!WS_URL) return;
    getSession().then((session) => {
      const token =
        session && 'accessToken' in session
          ? (session as { accessToken?: string }).accessToken
          : (session as { token?: string })?.token;
      if (!token) return;
      const s = io(WS_URL, {
        path: '/socket.io',
        auth: { token },
      });
      socketRef.current = s;
      s.on('connect', () => setConnected(true));
      s.on('disconnect', () => setConnected(false));
      s.on('job.status_changed', (payload: JobStatusChangedPayload) => {
        queryClient.invalidateQueries({ queryKey: ['jobs'] });
        queryClient.invalidateQueries({ queryKey: ['job', payload.jobId] });
        opts?.onJobChanged?.(payload);
      });
      s.on('notification.created', (payload: NotificationCreatedPayload) => {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        queryClient.invalidateQueries({ queryKey: ['notifications-count'] });
        opts?.onNotification?.(payload);
      });
      s.on('goal.created', () => {
        queryClient.invalidateQueries({ queryKey: ['goals'] });
      });
      s.on('goal.updated', (payload: GoalEventPayload) => {
        queryClient.invalidateQueries({ queryKey: ['goals'] });
        queryClient.invalidateQueries({ queryKey: ['goal', payload.goalId] });
      });
      s.on('goal.cancelled', (payload: GoalEventPayload) => {
        queryClient.invalidateQueries({ queryKey: ['goals'] });
        queryClient.invalidateQueries({ queryKey: ['goal', payload.goalId] });
      });
    });
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [queryClient, opts?.onJobChanged, opts?.onNotification]);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['jobs'] });
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    queryClient.invalidateQueries({ queryKey: ['notifications-count'] });
    queryClient.invalidateQueries({ queryKey: ['goals'] });
    opts?.onJobChanged?.({} as JobStatusChangedPayload);
    opts?.onNotification?.({} as NotificationCreatedPayload);
  }, [queryClient, opts]);

  return { connected, invalidate };
}
