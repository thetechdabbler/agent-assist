'use client';

export interface MessageEnvelope {
  id?: string;
  conversationId: string;
  source: 'user' | 'agent' | 'system';
  type: string;
  version?: string;
  payload?: Record<string, unknown>;
  createdAt?: string;
}

function TextRenderer({ payload }: { payload: Record<string, unknown> }) {
  const text = (payload.text as string) ?? '';
  const format = (payload.format as string) ?? 'plain';
  if (format === 'markdown') {
    return <div className="whitespace-pre-wrap">{text}</div>;
  }
  return <div className="whitespace-pre-wrap">{text}</div>;
}

function ErrorCardRenderer({ payload }: { payload: Record<string, unknown> }) {
  const message = (payload.message as string) ?? 'Something went wrong.';
  const code = (payload.errorCode as string) ?? '';
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
      {message}
      {code && <span style={{ display: 'block', fontSize: 12, marginTop: 4 }}>Code: {code}</span>}
    </div>
  );
}

function NotificationRenderer({ payload }: { payload: Record<string, unknown> }) {
  const title = (payload.title as string) ?? '';
  const body = (payload.body as string) ?? '';
  return (
    <div style={{ padding: 8, background: '#e7f3ff', borderRadius: 8 }}>
      {title && <strong>{title}</strong>}
      {body && <p style={{ margin: '4px 0 0', fontSize: 14 }}>{body}</p>}
    </div>
  );
}

export function MessageBubble({ message }: { message: MessageEnvelope }) {
  const { source, type, payload = {} } = message;
  const isUser = source === 'user';
  const align = isUser ? 'flex-end' : 'flex-start';
  const bg = isUser ? '#e3f2fd' : '#f5f5f5';

  const renderPayload = () => {
    switch (type) {
      case 'text':
      case 'markdown':
        return <TextRenderer payload={payload} />;
      case 'error_card':
      case 'error':
        return <ErrorCardRenderer payload={payload} />;
      case 'notification':
        return <NotificationRenderer payload={payload} />;
      default:
        return <TextRenderer payload={{ text: JSON.stringify(payload) }} />;
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: align, marginBottom: 8 }}>
      <div
        style={{
          maxWidth: '80%',
          padding: 12,
          borderRadius: 12,
          backgroundColor: bg,
        }}
      >
        {renderPayload()}
      </div>
    </div>
  );
}
