'use client';

import { useState, useEffect } from 'react';
import { apiGet } from '@/services/api-client';

export interface ImageArtifactPayload {
  altText: string;
  url?: string;
  expiresAt?: string;
  width?: number;
  height?: number;
  artifactId?: string;
}

export function ImageArtifactRenderer({
  payload,
  signedUrl: signedUrlProp,
}: {
  payload: ImageArtifactPayload;
  signedUrl?: string | null;
}) {
  const { altText, url, width, height, artifactId } = payload;
  const [fetchedUrl, setFetchedUrl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [err, setErr] = useState(false);

  useEffect(() => {
    if (signedUrlProp ?? url) return;
    if (!artifactId) return;
    let cancelled = false;
    apiGet<{ url: string }>(`/api/artifacts/${artifactId}/download-url`)
      .then((res) => {
        if (!cancelled && res?.url) setFetchedUrl(res.url);
      })
      .catch(() => {
        if (!cancelled) setErr(true);
      });
    return () => {
      cancelled = true;
    };
  }, [artifactId, signedUrlProp, url]);

  const src = signedUrlProp ?? url ?? fetchedUrl;

  if (!src) {
    if (artifactId && !err) {
      return (
        <div
          style={{
            padding: 12,
            border: '1px solid #e0e0e0',
            borderRadius: 8,
            background: '#f5f5f5',
            color: '#666',
          }}
        >
          Loading image…
        </div>
      );
    }
    return (
      <div
        style={{
          padding: 12,
          border: '1px solid #e0e0e0',
          borderRadius: 8,
          background: '#f5f5f5',
          color: '#666',
        }}
      >
        Image not available
      </div>
    );
  }

  return (
    <div
      style={{
        padding: 8,
        border: '1px solid #e0e0e0',
        borderRadius: 8,
        background: '#fafafa',
        display: 'inline-block',
      }}
    >
      {!loaded && !err && (
        <div style={{ minWidth: 120, minHeight: 80, background: '#eee', borderRadius: 4 }}>
          Loading…
        </div>
      )}
      <img
        src={src}
        alt={altText}
        style={{
          maxWidth: width ?? 400,
          maxHeight: height ?? 300,
          display: err ? 'none' : 'block',
          borderRadius: 4,
        }}
        onLoad={() => setLoaded(true)}
        onError={() => setErr(true)}
      />
      {err && (
        <div style={{ padding: 8, color: '#c62828', fontSize: 13 }}>Failed to load image</div>
      )}
    </div>
  );
}
