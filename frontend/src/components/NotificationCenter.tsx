'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { apiGet, apiPatch } from '@/services/api-client';
import { useJobUpdates } from '@/hooks/useJobUpdates';

interface NotificationItem {
  id: string;
  category: string;
  title: string;
  body: string | null;
  jobId: string | null;
  conversationId: string | null;
  createdAt: string;
}

interface NotificationsResponse {
  notifications: NotificationItem[];
}

interface NotificationCenterProps {
  /** When true, mark all as seen on open */
  markSeenOnOpen?: boolean;
}

export function NotificationCenter({ markSeenOnOpen = true }: NotificationCenterProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  useJobUpdates({
    onNotification: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-count'] });
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', open],
    queryFn: () => apiGet<NotificationsResponse>('/api/notifications'),
    enabled: open,
  });

  const { data: countData } = useQuery({
    queryKey: ['notifications-count'],
    queryFn: () => apiGet<{ count: number }>('/api/notifications/count'),
  });
  const count = countData?.count ?? 0;

  const markSeen = useMutation({
    mutationFn: (id: string) => apiPatch(`/api/notifications/${id}/seen`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-count'] });
    },
  });

  const markAcknowledged = useMutation({
    mutationFn: (id: string) => apiPatch(`/api/notifications/${id}/acknowledged`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-count'] });
    },
  });

  const handleOpen = () => {
    setOpen(true);
    if (markSeenOnOpen && data?.notifications.length) {
      data.notifications.forEach((n) => markSeen.mutate(n.id));
    }
  };

  const notifications = data?.notifications ?? [];
  const unreadCount = count ?? 0;

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : handleOpen())}
        style={{ position: 'relative', padding: '8px 12px' }}
      >
        Notifications
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              minWidth: 18,
              height: 18,
              borderRadius: 9,
              background: 'crimson',
              color: '#fff',
              fontSize: 11,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 4,
            minWidth: 320,
            maxHeight: 400,
            overflow: 'auto',
            background: '#fff',
            border: '1px solid #eee',
            borderRadius: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 100,
          }}
        >
          {isLoading && <div style={{ padding: 16 }}>Loading…</div>}
          {!isLoading && notifications.length === 0 && (
            <div style={{ padding: 16, color: '#666' }}>No notifications</div>
          )}
          {!isLoading &&
            notifications.map((n) => (
              <div
                key={n.id}
                style={{
                  padding: 12,
                  borderBottom: '1px solid #eee',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  markAcknowledged.mutate(n.id);
                  if (n.conversationId) setOpen(false);
                }}
              >
                <div style={{ fontWeight: 600 }}>{n.title}</div>
                {n.body && (
                  <div style={{ fontSize: 14, color: '#666', marginTop: 4 }}>{n.body}</div>
                )}
                <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                  {new Date(n.createdAt).toLocaleString()}
                </div>
                {n.conversationId && (
                  <Link
                    href={`/conversations/${n.conversationId}`}
                    style={{ fontSize: 12, marginTop: 4, display: 'block' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    Open conversation
                  </Link>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
