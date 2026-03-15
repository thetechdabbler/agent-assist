'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import { apiPost } from '@/services/api-client';
import AppLayout from '@/layouts/AppLayout';

export default function NewGoalPage() {
  const router = useRouter();
  const [goalType, setGoalType] = useState<'directive' | 'scheduled'>('directive');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [schedule, setSchedule] = useState('');

  const createGoal = useMutation({
    mutationFn: () =>
      apiPost<{ id: string }>('/api/goals', {
        goalType,
        title,
        description: description || null,
        schedule: goalType === 'scheduled' ? schedule || null : null,
      }),
    onSuccess: (data) => {
      router.push(`/goals/${data.id}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    createGoal.mutate();
  };

  return (
    <AppLayout>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <Link href="/goals" style={{ marginBottom: 16, display: 'inline-block', color: '#1976d2' }}>
          ← Back to Goals
        </Link>
        <h1>New goal</h1>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 4 }}>Type</label>
            <select
              value={goalType}
              onChange={(e) => setGoalType(e.target.value as 'directive' | 'scheduled')}
              style={{ padding: 8, borderRadius: 6, minWidth: 200 }}
            >
              <option value="directive">Directive (injected as context every turn)</option>
              <option value="scheduled">Scheduled (recurring jobs)</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4 }}>Title *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              style={{ width: '100%', padding: 8, borderRadius: 6 }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4 }}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              style={{ width: '100%', padding: 8, borderRadius: 6 }}
            />
          </div>
          {goalType === 'scheduled' && (
            <div>
              <label style={{ display: 'block', marginBottom: 4 }}>Schedule (cron)</label>
              <input
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
                placeholder="0 9 * * 1-5"
                style={{ width: '100%', padding: 8, borderRadius: 6 }}
              />
            </div>
          )}
          <button
            type="submit"
            disabled={createGoal.isPending || !title.trim()}
            style={{
              padding: '10px 20px',
              background: '#1976d2',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
            }}
          >
            {createGoal.isPending ? 'Creating…' : 'Create goal'}
          </button>
          {createGoal.isError && (
            <p style={{ color: '#c62828' }}>
              {createGoal.error instanceof Error ? createGoal.error.message : 'Failed'}
            </p>
          )}
        </form>
      </div>
    </AppLayout>
  );
}
