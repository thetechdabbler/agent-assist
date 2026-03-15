'use client';

import type { FormRequestPayload } from './InlineFormRenderer';
import { InlineFormRenderer } from './InlineFormRenderer';
import { TableArtifactRenderer } from '../artifacts/TableArtifactRenderer';
import type { TableArtifactPayload } from '../artifacts/TableArtifactRenderer';
import { ChartArtifactRenderer } from '../artifacts/ChartArtifactRenderer';
import type { ChartArtifactPayload } from '../artifacts/ChartArtifactRenderer';
import { FileArtifactRenderer } from '../artifacts/FileArtifactRenderer';
import type { FileArtifactPayload } from '../artifacts/FileArtifactRenderer';
import { ImageArtifactRenderer } from '../artifacts/ImageArtifactRenderer';
import type { ImageArtifactPayload } from '../artifacts/ImageArtifactRenderer';

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

function StatusCardRenderer({ payload }: { payload: Record<string, unknown> }) {
  const jobId = (payload.jobId as string) ?? '';
  const status = (payload.status as string) ?? '';
  const statusMessage = (payload.statusMessage as string) ?? '';
  const errorSummary = (payload.errorSummary as string) ?? '';
  return (
    <div
      style={{ padding: 8, background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: 8 }}
    >
      {jobId && <span style={{ fontSize: 12, color: '#666' }}>Job {jobId.slice(0, 8)}…</span>}
      <div style={{ fontWeight: 500, marginTop: 4 }}>{status}</div>
      {statusMessage && <p style={{ margin: '4px 0 0', fontSize: 14 }}>{statusMessage}</p>}
      {errorSummary && (
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#c62828' }}>{errorSummary}</p>
      )}
    </div>
  );
}

function GoalUpdateRenderer({ payload }: { payload: Record<string, unknown> }) {
  const goalId = (payload.goalId as string) ?? '';
  const title = (payload.title as string) ?? '';
  const status = (payload.status as string) ?? '';
  const event = (payload.event as string) ?? 'updated';
  return (
    <div
      style={{ padding: 8, background: '#e3f2fd', border: '1px solid #90caf9', borderRadius: 8 }}
    >
      {goalId && <span style={{ fontSize: 12, color: '#666' }}>Goal</span>}
      {title && <div style={{ fontWeight: 500, marginTop: 4 }}>{title}</div>}
      <div style={{ fontSize: 13, marginTop: 4 }}>
        {event === 'cancelled' ? 'Cancelled' : event === 'updated' ? `Updated · ${status}` : status}
      </div>
    </div>
  );
}

function ActionCardRenderer({ payload }: { payload: Record<string, unknown> }) {
  const prompt = (payload.prompt as string) ?? '';
  const actions =
    (payload.actions as Array<{ label: string; actionId: string; variant?: string }>) ?? [];
  return (
    <div
      style={{ padding: 8, background: '#fff8e1', border: '1px solid #ffecb3', borderRadius: 8 }}
    >
      {prompt && <p style={{ margin: '0 0 8px', fontSize: 14 }}>{prompt}</p>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {actions.map((a) => (
          <button
            key={a.actionId}
            type="button"
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: '1px solid #ccc',
              background:
                a.variant === 'primary'
                  ? '#1976d2'
                  : a.variant === 'danger'
                    ? '#c62828'
                    : '#f5f5f5',
              color: a.variant === 'primary' || a.variant === 'danger' ? '#fff' : '#333',
              cursor: 'pointer',
            }}
          >
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function MessageBubble({
  message,
  tenantId,
}: {
  message: MessageEnvelope;
  tenantId?: string;
}) {
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
      case 'form_request':
        return (
          <InlineFormRenderer
            payload={payload as unknown as FormRequestPayload}
            conversationId={message.conversationId}
            messageId={message.id}
            tenantId={tenantId}
            onSubmitted={undefined}
          />
        );
      case 'job_status':
      case 'status_card':
        return <StatusCardRenderer payload={payload} />;
      case 'goal_update':
        return <GoalUpdateRenderer payload={payload} />;
      case 'table':
        return <TableArtifactRenderer payload={payload as unknown as TableArtifactPayload} />;
      case 'chart':
        return <ChartArtifactRenderer payload={payload as unknown as ChartArtifactPayload} />;
      case 'file_reference':
        return <FileArtifactRenderer payload={payload as unknown as FileArtifactPayload} />;
      case 'image_reference':
        return <ImageArtifactRenderer payload={payload as unknown as ImageArtifactPayload} />;
      case 'action_card':
      case 'action_prompt':
        return <ActionCardRenderer payload={payload} />;
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
