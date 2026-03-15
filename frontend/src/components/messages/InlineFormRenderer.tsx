'use client';

import { useState, useCallback } from 'react';
import { apiPost, ApiError } from '@/services/api-client';
import { useFormDraft } from '@/hooks/useFormDraft';
import { AttachmentUploader } from '@/components/AttachmentUploader';

export interface FormRequestPayload {
  jobId: string;
  formRequestId: string;
  formSchema: {
    type?: string;
    properties?: Record<
      string,
      { type?: string; format?: string; title?: string; enum?: unknown[] }
    >;
    required?: string[];
  };
  uiSchema?: Record<string, unknown>;
  prompt?: string | null;
  submitAction: string;
}

interface InlineFormRendererProps {
  payload: FormRequestPayload;
  conversationId?: string;
  messageId?: string;
  tenantId?: string;
  onSubmitted?: () => void;
}

function getInitialValues(formSchema: FormRequestPayload['formSchema']): Record<string, unknown> {
  const props = formSchema.properties ?? {};
  const initial: Record<string, unknown> = {};
  for (const [key, def] of Object.entries(props)) {
    if (def?.type === 'number' || def?.type === 'integer') initial[key] = '';
    else if (def?.type === 'boolean') initial[key] = false;
    else if (Array.isArray(def?.enum)) initial[key] = def.enum[0] ?? '';
    else initial[key] = '';
  }
  return initial;
}

export function InlineFormRenderer({
  payload,
  conversationId,
  messageId,
  tenantId,
  onSubmitted,
}: InlineFormRendererProps) {
  const { jobId, formRequestId, formSchema, prompt, submitAction } = payload;
  const required = new Set(formSchema.required ?? []);
  const initial = getInitialValues(formSchema);
  const [values, setDraft, clearDraft] = useFormDraft(formRequestId, initial);
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error' | 'conflict'>(
    'idle',
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const canUploadFile = !!conversationId && !!messageId && !!tenantId;

  const setValue = useCallback(
    (key: string, value: unknown) => {
      setDraft({ ...values, [key]: value });
    },
    [values, setDraft],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setErrorMessage(null);
      setSubmitting(true);
      setSubmitStatus('idle');
      const attachments: { id: string; filename: string; mimeType: string; storageUri?: string }[] =
        [];
      const payloadOnly: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(values)) {
        if (
          v &&
          typeof v === 'object' &&
          v !== null &&
          'id' in v &&
          'filename' in v &&
          'mimeType' in v
        ) {
          const att = v as { id: string; filename: string; mimeType: string; storageUri?: string };
          attachments.push({
            id: att.id,
            filename: att.filename,
            mimeType: att.mimeType,
            storageUri: att.storageUri,
          });
        } else {
          payloadOnly[k] = v;
        }
      }
      try {
        await apiPost(`/api/jobs/${jobId}/form-response`, {
          payload: payloadOnly,
          ...(attachments.length ? { attachments } : {}),
        });
        setSubmitStatus('success');
        clearDraft();
        onSubmitted?.();
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.status === 409) {
            setSubmitStatus('conflict');
            setErrorMessage('This form has already been submitted.');
          } else {
            setSubmitStatus('error');
            setErrorMessage(
              err.body && typeof err.body === 'object' && 'error' in err.body
                ? String((err.body as { error: unknown }).error)
                : err.message,
            );
          }
        } else {
          setSubmitStatus('error');
          setErrorMessage(err instanceof Error ? err.message : 'Submission failed.');
        }
      } finally {
        setSubmitting(false);
      }
    },
    [jobId, values, clearDraft, onSubmitted],
  );

  const properties = formSchema.properties ?? {};
  const entries = Object.entries(properties);

  return (
    <div
      style={{
        padding: 12,
        background: '#f0f7ff',
        border: '1px solid #b3d9ff',
        borderRadius: 8,
        maxWidth: 480,
      }}
    >
      {prompt && <p style={{ margin: '0 0 12px', fontSize: 14, color: '#333' }}>{prompt}</p>}
      <form onSubmit={handleSubmit}>
        {entries.map(([key, def]) => {
          const schemaDef = def as { type?: string; title?: string; enum?: unknown[] };
          const title = schemaDef.title ?? key;
          const isReq = required.has(key);
          const value = values[key];
          return (
            <div key={key} style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
                {title}
                {isReq && <span style={{ color: '#c00' }}> *</span>}
              </label>
              {schemaDef.type === 'boolean' ? (
                <input
                  type="checkbox"
                  checked={Boolean(value)}
                  onChange={(e) => setValue(key, e.target.checked)}
                  disabled={submitting}
                />
              ) : Array.isArray(schemaDef.enum) ? (
                <select
                  value={String(value ?? '')}
                  onChange={(e) => setValue(key, e.target.value)}
                  disabled={submitting}
                  style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ccc' }}
                >
                  <option value="">—</option>
                  {schemaDef.enum.map((opt) => (
                    <option key={String(opt)} value={String(opt)}>
                      {String(opt)}
                    </option>
                  ))}
                </select>
              ) : schemaDef.type === 'number' || schemaDef.type === 'integer' ? (
                <input
                  type="number"
                  value={value === '' || value === undefined ? '' : String(value)}
                  onChange={(e) =>
                    setValue(key, e.target.value === '' ? '' : Number(e.target.value))
                  }
                  disabled={submitting}
                  style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ccc' }}
                />
              ) : (schemaDef.type === 'string' &&
                  (schemaDef as { format?: string }).format === 'file') ||
                schemaDef.type === 'file' ? (
                canUploadFile && conversationId && messageId && tenantId ? (
                  <div>
                    <AttachmentUploader
                      conversationId={conversationId}
                      messageId={messageId}
                      tenantId={tenantId}
                      onUploaded={(att) => {
                        if (att)
                          setValue(key, {
                            id: att.id,
                            filename: att.filename,
                            mimeType: att.mimeType,
                            storageUri: att.storageKey,
                          });
                      }}
                    />
                    {typeof value === 'object' && value !== null && 'filename' in value ? (
                      <span style={{ fontSize: 12, color: '#0a0' }}>
                        {String((value as { filename?: string }).filename ?? '')} attached
                      </span>
                    ) : null}
                  </div>
                ) : (
                  <input
                    type="file"
                    disabled={submitting}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setValue(key, { name: file.name, size: file.size });
                    }}
                  />
                )
              ) : (
                <input
                  type="text"
                  value={String(value ?? '')}
                  onChange={(e) => setValue(key, e.target.value)}
                  disabled={submitting}
                  style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ccc' }}
                />
              )}
            </div>
          );
        })}
        {submitStatus === 'success' && (
          <p style={{ margin: '8px 0', color: '#0a0', fontSize: 13 }}>Submitted.</p>
        )}
        {submitStatus === 'conflict' && (
          <p style={{ margin: '8px 0', color: '#c00', fontSize: 13 }}>{errorMessage}</p>
        )}
        {submitStatus === 'error' && errorMessage && (
          <p style={{ margin: '8px 0', color: '#c00', fontSize: 13 }}>{errorMessage}</p>
        )}
        <button
          type="submit"
          disabled={submitting || entries.length === 0}
          style={{
            marginTop: 8,
            padding: '8px 16px',
            background: submitting ? '#ccc' : '#1976d2',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: submitting ? 'not-allowed' : 'pointer',
            fontSize: 14,
          }}
        >
          {submitting ? 'Submitting…' : `Submit${submitAction ? ` (${submitAction})` : ''}`}
        </button>
      </form>
    </div>
  );
}
