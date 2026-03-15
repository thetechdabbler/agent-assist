'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { apiGet } from '@/services/api-client';

interface HandoffQRResponse {
  code: string;
  expiresInSeconds: number;
}

interface QRHandoffModalProps {
  conversationId: string;
  open: boolean;
  onClose: () => void;
}

const TTL = 90;

export function QRHandoffModal({ conversationId, open, onClose }: QRHandoffModalProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(TTL);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !conversationId) return;
    setError(null);
    setSecondsLeft(TTL);
    apiGet<HandoffQRResponse>(`/api/conversations/${conversationId}/handoff-qr`)
      .then((res) => {
        const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/handoff?code=${res.code}`;
        return QRCode.toDataURL(url, { width: 256 }).then(setDataUrl);
      })
      .catch(() => setError('Failed to generate QR code'));
  }, [open, conversationId]);

  useEffect(() => {
    if (!open || secondsLeft <= 0) return;
    const t = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          onClose();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [open, onClose, secondsLeft]);

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
      role="dialog"
      aria-label="QR code handoff"
    >
      <div
        style={{
          background: '#fff',
          padding: 24,
          borderRadius: 12,
          textAlign: 'center',
          maxWidth: 320,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ marginTop: 0 }}>Scan to continue on another device</h3>
        {error && <p style={{ color: 'crimson' }}>{error}</p>}
        {dataUrl && (
          <img src={dataUrl} alt="QR code" style={{ display: 'block', margin: '16px auto' }} />
        )}
        <p style={{ fontSize: 14, color: '#666' }}>Expires in {secondsLeft} s</p>
        <button type="button" onClick={onClose} style={{ marginTop: 16 }}>
          Close
        </button>
      </div>
    </div>
  );
}
