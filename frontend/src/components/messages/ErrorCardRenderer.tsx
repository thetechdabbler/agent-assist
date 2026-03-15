'use client';

export interface ErrorCardPayload {
  message?: string;
  errorCode?: string;
  jobId?: string;
  retryable?: boolean;
}

interface ErrorCardRendererProps {
  payload: Record<string, unknown>;
  onRetry?: () => void;
}

export function ErrorCardRenderer({ payload, onRetry }: ErrorCardRendererProps) {
  const message = (payload.message as string) ?? 'Something went wrong.';
  const code = (payload.errorCode as string) ?? '';
  const retryable = payload.retryable === true;

  return (
    <div
      style={{
        padding: 12,
        background: '#f8d7da',
        border: '1px solid #f5c6cb',
        borderRadius: 8,
        color: '#721c24',
      }}
    >
      <div>{message}</div>
      {code && <span style={{ display: 'block', fontSize: 12, marginTop: 4 }}>Code: {code}</span>}
      {retryable && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          style={{
            marginTop: 8,
            padding: '6px 12px',
            borderRadius: 6,
            border: '1px solid #f5c6cb',
            background: '#fff',
            color: '#721c24',
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          Retry
        </button>
      )}
    </div>
  );
}
