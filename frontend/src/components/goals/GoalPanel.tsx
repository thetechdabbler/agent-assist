'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/services/api-client';

interface GoalItem {
  id: string;
  goalType: string;
  title: string;
  status: string;
  schedule: string | null;
  createdAt: string;
}

interface GoalsResponse {
  goals: GoalItem[];
}

export function GoalPanel() {
  const { data } = useQuery({
    queryKey: ['goals', 'active'],
    queryFn: () => apiGet<GoalsResponse>('/api/goals?status=active'),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const goals = data?.goals ?? [];
  const directives = goals.filter((g) => g.goalType === 'directive');
  const scheduled = goals.filter((g) => g.goalType === 'scheduled');

  return (
    <div style={{ marginTop: 16, fontSize: 14 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Goals</div>
      {directives.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: '#666', fontSize: 12, marginBottom: 4 }}>Directives</div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {directives.map((g) => (
              <li key={g.id} style={{ marginBottom: 6 }}>
                <Link href={`/goals/${g.id}`} style={{ color: '#1976d2', textDecoration: 'none' }}>
                  {g.title}
                </Link>
                <span
                  style={{
                    marginLeft: 6,
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: g.status === 'active' ? '#e8f5e9' : '#fff3e0',
                    fontSize: 11,
                  }}
                >
                  {g.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {scheduled.length > 0 && (
        <div>
          <div style={{ color: '#666', fontSize: 12, marginBottom: 4 }}>Scheduled</div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {scheduled.map((g) => (
              <li key={g.id} style={{ marginBottom: 6 }}>
                <Link href={`/goals/${g.id}`} style={{ color: '#1976d2', textDecoration: 'none' }}>
                  {g.title}
                </Link>
                {g.schedule && (
                  <span style={{ marginLeft: 6, fontSize: 11, color: '#666' }}>{g.schedule}</span>
                )}
                <span
                  style={{
                    marginLeft: 6,
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: g.status === 'active' ? '#e8f5e9' : '#fff3e0',
                    fontSize: 11,
                  }}
                >
                  {g.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {goals.length === 0 && (
        <p style={{ color: '#666', fontSize: 12, margin: 0 }}>No active goals</p>
      )}
    </div>
  );
}
