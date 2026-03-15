'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { apiGet } from '@/services/api-client';
import AppLayout from '@/layouts/AppLayout';

interface GoalItem {
  id: string;
  goalType: string;
  title: string;
  description: string | null;
  status: string;
  schedule: string | null;
  conversationId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface GoalsResponse {
  goals: GoalItem[];
}

export default function GoalsPage() {
  const [typeFilter, setTypeFilter] = useState<string>('');
  const { data, isLoading } = useQuery({
    queryKey: ['goals', typeFilter || undefined],
    queryFn: () =>
      apiGet<GoalsResponse>(
        typeFilter ? `/api/goals?goalType=${encodeURIComponent(typeFilter)}` : '/api/goals',
      ),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const goals = data?.goals ?? [];

  return (
    <AppLayout>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <h1>Goals</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              type="button"
              onClick={() => setTypeFilter('')}
              style={{
                padding: '6px 12px',
                border: typeFilter === '' ? '2px solid #333' : '1px solid #ccc',
                borderRadius: 6,
                background: typeFilter === '' ? '#eee' : '#fff',
              }}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('directive')}
              style={{
                padding: '6px 12px',
                border: typeFilter === 'directive' ? '2px solid #333' : '1px solid #ccc',
                borderRadius: 6,
                background: typeFilter === 'directive' ? '#eee' : '#fff',
              }}
            >
              Directives
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('scheduled')}
              style={{
                padding: '6px 12px',
                border: typeFilter === 'scheduled' ? '2px solid #333' : '1px solid #ccc',
                borderRadius: 6,
                background: typeFilter === 'scheduled' ? '#eee' : '#fff',
              }}
            >
              Scheduled
            </button>
          </div>
          <Link
            href="/goals/new"
            style={{
              marginLeft: 8,
              padding: '8px 16px',
              background: '#1976d2',
              color: '#fff',
              borderRadius: 6,
              textDecoration: 'none',
              fontSize: 14,
            }}
          >
            New goal
          </Link>
        </div>
        {isLoading && <p>Loading…</p>}
        {!isLoading && goals.length === 0 && (
          <p style={{ color: '#666' }}>No goals yet. Create a directive or scheduled goal.</p>
        )}
        {!isLoading && goals.length > 0 && (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {goals.map((g) => (
              <li
                key={g.id}
                style={{
                  padding: 12,
                  border: '1px solid #eee',
                  borderRadius: 8,
                  marginBottom: 8,
                }}
              >
                <Link href={`/goals/${g.id}`} style={{ fontWeight: 500, color: '#1976d2' }}>
                  {g.title}
                </Link>
                <span
                  style={{
                    marginLeft: 8,
                    padding: '2px 8px',
                    borderRadius: 4,
                    background: g.goalType === 'directive' ? '#e3f2fd' : '#f3e5f5',
                    fontSize: 12,
                  }}
                >
                  {g.goalType}
                </span>
                <span
                  style={{
                    marginLeft: 8,
                    padding: '2px 8px',
                    borderRadius: 4,
                    background: g.status === 'active' ? '#e8f5e9' : '#ffebee',
                    fontSize: 12,
                  }}
                >
                  {g.status}
                </span>
                {g.schedule && (
                  <span style={{ marginLeft: 8, fontSize: 12, color: '#666' }}>
                    Schedule: {g.schedule}
                  </span>
                )}
                {g.description && (
                  <p style={{ margin: '8px 0 0', fontSize: 13, color: '#555' }}>{g.description}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppLayout>
  );
}
