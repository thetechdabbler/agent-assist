'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { apiGet } from '@/services/api-client';
import AppLayout from '@/layouts/AppLayout';

interface ConversationItem {
  id: string;
  title: string | null;
  status: string;
  updatedAt: string;
}

interface ListResponse {
  conversations: ConversationItem[];
}

export default function ConversationListPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => apiGet<ListResponse>('/api/conversations'),
  });

  const conversations = data?.conversations ?? [];

  return (
    <AppLayout>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 24,
          }}
        >
          <h1>Conversations</h1>
          <Link
            href="/conversations/new"
            style={{
              padding: '8px 16px',
              background: '#333',
              color: '#fff',
              borderRadius: 8,
              textDecoration: 'none',
            }}
          >
            New conversation
          </Link>
        </div>
        {isLoading && <p>Loading…</p>}
        {error && <p style={{ color: 'crimson' }}>Failed to load conversations.</p>}
        {!isLoading && !error && conversations.length === 0 && (
          <div style={{ textAlign: 'center', padding: 48, color: '#666' }}>
            <p>No conversations yet.</p>
            <Link href="/conversations/new" style={{ color: '#333', textDecoration: 'underline' }}>
              Start one
            </Link>
          </div>
        )}
        {!isLoading && conversations.length > 0 && (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {conversations.map((c) => (
              <li key={c.id} style={{ marginBottom: 8 }}>
                <Link
                  href={`/conversations/${c.id}`}
                  style={{
                    display: 'block',
                    padding: 16,
                    border: '1px solid #eee',
                    borderRadius: 8,
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  <strong>{c.title || 'Untitled'}</strong>
                  <span style={{ marginLeft: 8, color: '#666', fontSize: 14 }}>{c.status}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppLayout>
  );
}
