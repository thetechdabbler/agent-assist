'use client';

import { useState } from 'react';
import { apiGet } from '@/services/api-client';

export interface FileArtifactPayload {
  filename: string;
  mimeType: string;
  sizeBytes?: number;
  downloadUrl?: string;
  expiresAt?: string;
  artifactId?: string;
}

export function FileArtifactRenderer({
  payload,
  artifactId: propArtifactId,
}: {
  payload: FileArtifactPayload;
  artifactId?: string;
}) {
  const { filename, mimeType, sizeBytes, artifactId: payloadArtifactId } = payload;
  const artifactId = propArtifactId ?? payloadArtifactId;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    if (!artifactId) {
      if (payload.downloadUrl) {
        window.open(payload.downloadUrl, '_blank');
        return;
      }
      setError('Download not available');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<{ url: string; expiresIn: number }>(
        `/api/artifacts/${artifactId}/download-url`,
      );
      if (res?.url) window.open(res.url, '_blank');
      else setError('Failed to get download link');
    } catch {
      setError('Failed to get download link');
    } finally {
      setLoading(false);
    }
  };

  const sizeStr =
    sizeBytes != null
      ? sizeBytes < 1024
        ? `${sizeBytes} B`
        : sizeBytes < 1024 * 1024
          ? `${(sizeBytes / 1024).toFixed(1)} KB`
          : `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`
      : null;

  return (
    <div
      style={{ padding: 12, border: '1px solid #e0e0e0', borderRadius: 8, background: '#fafafa' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 500 }}>{filename}</span>
        {sizeStr && <span style={{ fontSize: 13, color: '#666' }}>{sizeStr}</span>}
        {mimeType && <span style={{ fontSize: 12, color: '#888' }}>{mimeType}</span>}
      </div>
      <div style={{ marginTop: 8 }}>
        <button
          type="button"
          onClick={handleDownload}
          disabled={loading || (!artifactId && !payload.downloadUrl)}
          style={{
            padding: '6px 12px',
            borderRadius: 6,
            border: '1px solid #1976d2',
            background: '#1976d2',
            color: '#fff',
            cursor: loading ? 'wait' : 'pointer',
          }}
        >
          {loading ? 'Preparing…' : 'Download'}
        </button>
        {error && <span style={{ marginLeft: 8, fontSize: 13, color: '#c62828' }}>{error}</span>}
      </div>
    </div>
  );
}
