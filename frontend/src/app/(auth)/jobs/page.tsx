'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { apiGet } from '@/services/api-client';
import AppLayout from '@/layouts/AppLayout';
import { JobDetailPanel } from '@/components/jobs/JobDetailPanel';

interface JobItem {
  id: string;
  conversationId: string;
  jobType: string;
  status: string;
  progressPercent: number | null;
  startedAt: string | null;
  completedAt: string | null;
  errorCode: string | null;
  errorSummary: string | null;
  createdAt: string;
}

interface JobsResponse {
  jobs: JobItem[];
}

const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'running', label: 'Running' },
  { value: 'waiting_for_input', label: 'Waiting' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
] as const;

export default function TaskCenterPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['jobs', statusFilter || undefined],
    queryFn: () =>
      apiGet<JobsResponse>(
        statusFilter ? `/api/jobs?status=${encodeURIComponent(statusFilter)}` : '/api/jobs',
      ),
    refetchOnWindowFocus: false,
  });

  const jobs = data?.jobs ?? [];

  return (
    <AppLayout>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <h1>Task Center</h1>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setStatusFilter(tab.value)}
              style={{
                padding: '6px 12px',
                border: statusFilter === tab.value ? '2px solid #333' : '1px solid #ccc',
                borderRadius: 6,
                background: statusFilter === tab.value ? '#eee' : '#fff',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {isLoading && <p>Loading…</p>}
        {!isLoading && jobs.length === 0 && <p style={{ color: '#666' }}>No jobs in this view.</p>}
        {!isLoading && jobs.length > 0 && (
          <div style={{ display: 'flex', gap: 24, flexDirection: 'column' }}>
            {jobs.map((job) => (
              <div
                key={job.id}
                style={{
                  border: '1px solid #eee',
                  borderRadius: 8,
                  padding: 16,
                  cursor: 'pointer',
                  background: selectedJobId === job.id ? '#f5f5f5' : '#fff',
                }}
                onClick={() => setSelectedJobId(selectedJobId === job.id ? null : job.id)}
              >
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <span>
                    <strong>{job.jobType}</strong> — {job.status}
                  </span>
                  <Link
                    href={`/conversations/${job.conversationId}`}
                    onClick={(e) => e.stopPropagation()}
                    style={{ fontSize: 14 }}
                  >
                    View conversation
                  </Link>
                </div>
                {job.status === 'running' && job.progressPercent != null && (
                  <div style={{ marginTop: 8 }}>
                    <div
                      style={{
                        height: 6,
                        background: '#eee',
                        borderRadius: 3,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${job.progressPercent}%`,
                          background: '#333',
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {selectedJobId && (
          <div style={{ marginTop: 24 }}>
            <JobDetailPanel
              jobId={selectedJobId}
              onClose={() => setSelectedJobId(null)}
              onRetryOrRerun={() => {
                queryClient.invalidateQueries({ queryKey: ['jobs'] });
                queryClient.invalidateQueries({ queryKey: ['job', selectedJobId] });
              }}
            />
          </div>
        )}
      </div>
    </AppLayout>
  );
}
