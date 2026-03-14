'use client';

import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet, apiPost, ApiError } from '@/services/api-client';

interface UploadLimits {
  maxSizeBytes: number;
  allowedMimeTypes: string[];
}

interface AttachmentUploaderProps {
  conversationId: string;
  messageId: string;
  tenantId: string;
  onUploaded?: () => void;
}

export function AttachmentUploader({
  conversationId,
  messageId,
  tenantId,
  onUploaded,
}: AttachmentUploaderProps) {
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: limits } = useQuery({
    queryKey: ['upload-limits', tenantId],
    queryFn: () => apiGet<UploadLimits>(`/api/tenants/${tenantId}/config/upload-limits`),
    enabled: !!tenantId,
  });

  const validateFile = (file: File): string | null => {
    if (!limits) return null;
    if (file.size > limits.maxSizeBytes) {
      return `File too large. Max ${Math.round(limits.maxSizeBytes / 1024 / 1024)} MB.`;
    }
    if (limits.allowedMimeTypes.length && !limits.allowedMimeTypes.includes(file.type)) {
      return `File type not allowed. Allowed: ${limits.allowedMimeTypes.slice(0, 5).join(', ')}.`;
    }
    return null;
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const err = validateFile(file);
    if (err) {
      setError(err);
      return;
    }
    setUploading(true);
    try {
      const buf = await file.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
      await apiPost(`/api/conversations/${conversationId}/messages/${messageId}/attachments`, {
        filename: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        content: base64,
      });
      onUploaded?.();
      if (inputRef.current) inputRef.current.value = '';
    } catch (e) {
      if (e instanceof ApiError && e.body && typeof e.body === 'object' && 'code' in e.body) {
        const code = (e.body as { code?: string }).code;
        if (code === 'file_too_large') setError('File too large.');
        else if (code === 'mime_not_allowed') setError('File type not allowed.');
        else setError(e.message);
      } else {
        setError('Upload failed.');
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ marginTop: 8 }}>
      <input
        ref={inputRef}
        type="file"
        onChange={handleChange}
        disabled={uploading}
        accept={limits?.allowedMimeTypes?.join(',')}
        style={{ fontSize: 14 }}
      />
      {error && <p style={{ color: 'crimson', fontSize: 12, marginTop: 4 }}>{error}</p>}
      {limits && (
        <p style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
          Max {Math.round(limits.maxSizeBytes / 1024 / 1024)} MB. Allowed types:{' '}
          {limits.allowedMimeTypes.length} types.
        </p>
      )}
    </div>
  );
}
