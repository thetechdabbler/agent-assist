'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { apiGet, apiPost, apiDelete } from '@/services/api-client';

interface JobDetail {
  id: string;
  conversationId: string;
  goalId: string | null;
  jobType: string;
  status: string;
  progressPercent: number | null;
  scheduleAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  errorCode: string | null;
  errorSummary: string | null;
  retryCount: number;
  createdAt: string;
  updatedAt: string;
}

interface JobDetailPanelProps {
  jobId: string;
  onClose: () => void;
  onRetryOrRerun?: () => void;
}

export function JobDetailPanel({ jobId, onClose, onRetryOrRerun }: JobDetailPanelProps) {
  const queryClient = useQueryClient();

  const { data: job, isLoading } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => apiGet<JobDetail>(`/api/jobs/${jobId}`),
    enabled: !!jobId,
  });

  const retry = useMutation({
    mutationFn: () => apiPost(`/api/jobs/${jobId}/retry`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', jobId] });
      onRetryOrRerun?.();
    },
  });

  const rerun = useMutation({
    mutationFn: () => apiPost<{ id: string }>(`/api/jobs/${jobId}/rerun`, {}),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      onRetryOrRerun?.();
      if (data?.id) window.location.href = `/jobs?selected=${data.id}`;
    },
  });

  const deleteJob = useMutation({
    mutationFn: () => apiDelete(`/api/jobs/${jobId}`),
    onSuccess: () => {
      onClose();
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });

  if (isLoading || !job) {
    return (
      <div style={{ padding: 24, border: '1px solid #eee', borderRadius: 8 }}>
        <p>Loading job…</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, border: '1px solid #eee', borderRadius: 8, background: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <h3 style={{ margin: 0 }}>Job details</h3>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
      <dl style={{ marginTop: 16, marginBottom: 0 }}>
        <dt style={{ fontWeight: 600, marginTop: 8 }}>Type</dt>
        <dd style={{ marginLeft: 0 }}>{job.jobType}</dd>
        <dt style={{ fontWeight: 600, marginTop: 8 }}>Status</dt>
        <dd style={{ marginLeft: 0 }}>{job.status}</dd>
        {job.startedAt && (
          <>
            <dt style={{ fontWeight: 600, marginTop: 8 }}>Started</dt>
            <dd style={{ marginLeft: 0 }}>{new Date(job.startedAt).toLocaleString()}</dd>
          </>
        )}
        {job.completedAt && (
          <>
            <dt style={{ fontWeight: 600, marginTop: 8 }}>Completed</dt>
            <dd style={{ marginLeft: 0 }}>{new Date(job.completedAt).toLocaleString()}</dd>
          </>
        )}
        {job.errorCode && (
          <>
            <dt style={{ fontWeight: 600, marginTop: 8 }}>Error code</dt>
            <dd style={{ marginLeft: 0 }}>{job.errorCode}</dd>
          </>
        )}
        {job.errorSummary && (
          <>
            <dt style={{ fontWeight: 600, marginTop: 8 }}>Error summary</dt>
            <dd style={{ marginLeft: 0 }}>{job.errorSummary}</dd>
          </>
        )}
      </dl>
      <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Link
          href={`/conversations/${job.conversationId}`}
          style={{
            padding: '8px 16px',
            background: '#eee',
            borderRadius: 6,
            textDecoration: 'none',
            color: '#333',
          }}
        >
          View conversation
        </Link>
        {job.status === 'failed' && (
          <>
            <button type="button" onClick={() => retry.mutate()} disabled={retry.isPending}>
              Retry
            </button>
            <button type="button" onClick={() => rerun.mutate()} disabled={rerun.isPending}>
              Rerun
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => deleteJob.mutate()}
          disabled={deleteJob.isPending}
          style={{ color: 'crimson' }}
        >
          Delete
        </button>
      </div>
      <div style={{ marginTop: 24 }}>
        <h4 style={{ margin: '0 0 8px' }}>Artifacts</h4>
        <p style={{ color: '#666', fontSize: 14 }}>No artifacts yet. (Phase 7)</p>
      </div>
    </div>
  );
}
