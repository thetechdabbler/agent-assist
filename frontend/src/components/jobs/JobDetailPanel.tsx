'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { apiGet, apiPost, apiDelete } from '@/services/api-client';

interface ArtifactSummary {
  id: string;
  jobId: string;
  artifactType: string;
  title: string;
  version: number;
  schemaVersion: string;
  createdAt: string;
}

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
    refetchOnWindowFocus: false,
  });

  const { data: artifactsData } = useQuery({
    queryKey: ['job', jobId, 'artifacts'],
    queryFn: () => apiGet<{ artifacts: ArtifactSummary[] }>(`/api/jobs/${jobId}/artifacts`),
    enabled: !!jobId,
    refetchOnWindowFocus: false,
  });
  const artifacts = artifactsData?.artifacts ?? [];

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
        {artifacts.length === 0 ? (
          <p style={{ color: '#666', fontSize: 14 }}>No artifacts yet.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {artifacts.map((a) => (
              <ArtifactRow key={a.id} artifact={a} conversationId={job.conversationId} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function artifactTypeIcon(type: string): string {
  switch (type) {
    case 'table':
      return '▦';
    case 'chart':
      return '📊';
    case 'file':
      return '📄';
    case 'image':
      return '🖼';
    case 'text':
      return '📝';
    default:
      return '•';
  }
}

function ArtifactRow({
  artifact,
  conversationId,
}: {
  artifact: ArtifactSummary;
  conversationId: string;
}) {
  const [downloading, setDownloading] = useState(false);
  const hasDownload = artifact.artifactType === 'file' || artifact.artifactType === 'image';

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await apiGet<{ url: string }>(`/api/artifacts/${artifact.id}/download-url`);
      if (res?.url) window.open(res.url, '_blank');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <li
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 0',
        borderBottom: '1px solid #eee',
      }}
    >
      <span style={{ fontSize: 18 }} title={artifact.artifactType}>
        {artifactTypeIcon(artifact.artifactType)}
      </span>
      <span style={{ flex: 1, fontSize: 14 }}>{artifact.title}</span>
      <Link
        href={`/conversations/${conversationId}`}
        style={{ fontSize: 13, color: '#1976d2', textDecoration: 'none' }}
      >
        View
      </Link>
      {hasDownload && (
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          style={{ fontSize: 13, padding: '2px 8px', cursor: downloading ? 'wait' : 'pointer' }}
        >
          {downloading ? '…' : 'Download'}
        </button>
      )}
    </li>
  );
}
