'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { apiGet, apiPatch, apiDelete } from '@/services/api-client';
import AppLayout from '@/layouts/AppLayout';

interface GoalDetail {
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

interface JobItem {
  id: string;
  jobType: string;
  status: string;
  progressPercent: number | null;
  startedAt: string | null;
  completedAt: string | null;
  errorCode: string | null;
  errorSummary: string | null;
  conversationId: string;
  createdAt: string;
}

export default function GoalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const queryClient = useQueryClient();
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editSchedule, setEditSchedule] = useState('');
  const [editing, setEditing] = useState(false);

  const { data: goal, isLoading } = useQuery({
    queryKey: ['goal', id],
    queryFn: () => apiGet<GoalDetail>(`/api/goals/${id}`),
    enabled: !!id && id !== 'new',
  });

  const { data: jobsData } = useQuery({
    queryKey: ['goals', id, 'jobs'],
    queryFn: () => apiGet<{ jobs: JobItem[] }>(`/api/goals/${id}/jobs`),
    enabled: !!id && id !== 'new',
  });

  const updateGoal = useMutation({
    mutationFn: (updates: {
      title?: string;
      description?: string | null;
      schedule?: string | null;
    }) => apiPatch(`/api/goals/${id}`, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goal', id] });
      setEditing(false);
    },
  });

  const cancelGoal = useMutation({
    mutationFn: () => apiDelete(`/api/goals/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goal', id] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      router.push('/goals');
    },
  });

  const jobs = jobsData?.jobs ?? [];

  const startEdit = () => {
    if (goal) {
      setEditTitle(goal.title);
      setEditDescription(goal.description ?? '');
      setEditSchedule(goal.schedule ?? '');
      setEditing(true);
    }
  };

  const submitEdit = () => {
    updateGoal.mutate({
      title: editTitle,
      description: editDescription || null,
      schedule: goal?.goalType === 'scheduled' ? editSchedule || null : undefined,
    });
  };

  if (id === 'new') {
    return (
      <AppLayout>
        <div style={{ maxWidth: 600 }}>
          <h1>New goal</h1>
          <p style={{ color: '#666' }}>
            Use the API or a form to create a goal. For now, create via API or Goals list.
          </p>
          <Link href="/goals">Back to Goals</Link>
        </div>
      </AppLayout>
    );
  }

  if (isLoading || !goal) {
    return (
      <AppLayout>
        <p>Loading…</p>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <Link href="/goals" style={{ marginBottom: 16, display: 'inline-block', color: '#1976d2' }}>
          ← Back to Goals
        </Link>
        <h1>{goal.title}</h1>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <span
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              background: goal.goalType === 'directive' ? '#e3f2fd' : '#f3e5f5',
              fontSize: 13,
            }}
          >
            {goal.goalType}
          </span>
          <span
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              background: goal.status === 'active' ? '#e8f5e9' : '#ffebee',
              fontSize: 13,
            }}
          >
            {goal.status}
          </span>
        </div>
        {goal.description && <p style={{ color: '#555', marginBottom: 16 }}>{goal.description}</p>}
        {goal.goalType === 'scheduled' && goal.schedule && (
          <p style={{ marginBottom: 16 }}>
            <strong>Schedule:</strong> <code>{goal.schedule}</code>
          </p>
        )}

        {!editing ? (
          <button
            type="button"
            onClick={startEdit}
            style={{ padding: '8px 16px', marginRight: 8, marginBottom: 16 }}
          >
            Edit
          </button>
        ) : (
          <div style={{ marginBottom: 16, padding: 16, background: '#f5f5f5', borderRadius: 8 }}>
            <div style={{ marginBottom: 8 }}>
              <label style={{ display: 'block', marginBottom: 4 }}>Title</label>
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                style={{ width: '100%', padding: 8, borderRadius: 6 }}
              />
            </div>
            <div style={{ marginBottom: 8 }}>
              <label style={{ display: 'block', marginBottom: 4 }}>Description</label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                style={{ width: '100%', padding: 8, borderRadius: 6 }}
              />
            </div>
            {goal.goalType === 'scheduled' && (
              <div style={{ marginBottom: 8 }}>
                <label style={{ display: 'block', marginBottom: 4 }}>Schedule (cron)</label>
                <input
                  value={editSchedule}
                  onChange={(e) => setEditSchedule(e.target.value)}
                  placeholder="0 9 * * 1-5"
                  style={{ width: '100%', padding: 8, borderRadius: 6 }}
                />
              </div>
            )}
            <button
              type="button"
              onClick={submitEdit}
              disabled={updateGoal.isPending}
              style={{ padding: '8px 16px', marginRight: 8 }}
            >
              Save
            </button>
            <button type="button" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        )}

        {goal.status === 'active' && (
          <button
            type="button"
            onClick={() => cancelGoal.mutate()}
            disabled={cancelGoal.isPending}
            style={{
              padding: '8px 16px',
              background: '#d32f2f',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
            }}
          >
            Cancel goal
          </button>
        )}

        <h2 style={{ marginTop: 24, marginBottom: 12 }}>Linked jobs</h2>
        {jobs.length === 0 && <p style={{ color: '#666' }}>No jobs linked to this goal.</p>}
        {jobs.length > 0 && (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {jobs.map((j) => (
              <li
                key={j.id}
                style={{
                  padding: 12,
                  border: '1px solid #eee',
                  borderRadius: 8,
                  marginBottom: 8,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <span style={{ fontWeight: 500 }}>{j.jobType}</span>
                  <span
                    style={{
                      marginLeft: 8,
                      padding: '2px 8px',
                      borderRadius: 4,
                      background: '#eee',
                      fontSize: 12,
                    }}
                  >
                    {j.status}
                  </span>
                  {j.errorSummary && (
                    <span style={{ marginLeft: 8, fontSize: 12, color: '#c62828' }}>
                      {j.errorSummary}
                    </span>
                  )}
                </div>
                <Link
                  href={`/conversations/${j.conversationId}`}
                  style={{ fontSize: 13, color: '#1976d2' }}
                >
                  View conversation
                </Link>
                <Link href={`/jobs?selected=${j.id}`} style={{ fontSize: 13, color: '#1976d2' }}>
                  Task Center
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppLayout>
  );
}
