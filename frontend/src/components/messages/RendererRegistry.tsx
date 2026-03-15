'use client';

import type { ComponentType } from 'react';
import { TableArtifactRenderer } from '../artifacts/TableArtifactRenderer';
import { ChartArtifactRenderer } from '../artifacts/ChartArtifactRenderer';
import { FileArtifactRenderer } from '../artifacts/FileArtifactRenderer';
import { ImageArtifactRenderer } from '../artifacts/ImageArtifactRenderer';
import { ErrorCardRenderer } from './ErrorCardRenderer';

export interface PluginInfo {
  pluginType: string;
  pluginName: string;
  enabled: boolean;
}

export type RendererProps = { payload: Record<string, unknown> };

const builtinMap: Record<string, ComponentType<RendererProps & Record<string, unknown>>> = {
  text: ({ payload }: RendererProps) => {
    const text = (payload.text as string) ?? '';
    return <div className="whitespace-pre-wrap">{text}</div>;
  },
  markdown: ({ payload }: RendererProps) => {
    const text = (payload.text as string) ?? '';
    return <div className="whitespace-pre-wrap">{text}</div>;
  },
  error_card: ErrorCardRenderer as unknown as ComponentType<RendererProps>,
  error: ErrorCardRenderer as unknown as ComponentType<RendererProps>,
  notification: ({ payload }: RendererProps) => (
    <div style={{ padding: 8, background: '#e7f3ff', borderRadius: 8 }}>
      {payload.title != null && <strong>{String(payload.title)}</strong>}
      {payload.body != null && (
        <p style={{ margin: '4px 0 0', fontSize: 14 }}>{String(payload.body)}</p>
      )}
    </div>
  ),
  job_status: ({ payload }: RendererProps) => (
    <div
      style={{ padding: 8, background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: 8 }}
    >
      {payload.jobId != null && (
        <span style={{ fontSize: 12, color: '#666' }}>
          Job {String(payload.jobId).slice(0, 8)}…
        </span>
      )}
      <div style={{ fontWeight: 500, marginTop: 4 }}>{String(payload.status ?? '')}</div>
      {payload.statusMessage != null && (
        <p style={{ margin: '4px 0 0', fontSize: 14 }}>{String(payload.statusMessage)}</p>
      )}
      {payload.errorSummary != null && (
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#c62828' }}>
          {String(payload.errorSummary)}
        </p>
      )}
    </div>
  ),
  status_card: ({ payload }: RendererProps) => (
    <div
      style={{ padding: 8, background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: 8 }}
    >
      {payload.jobId != null && (
        <span style={{ fontSize: 12, color: '#666' }}>
          Job {String(payload.jobId).slice(0, 8)}…
        </span>
      )}
      <div style={{ fontWeight: 500, marginTop: 4 }}>{String(payload.status ?? '')}</div>
      {payload.statusMessage != null && (
        <p style={{ margin: '4px 0 0', fontSize: 14 }}>{String(payload.statusMessage)}</p>
      )}
      {payload.errorSummary != null && (
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#c62828' }}>
          {String(payload.errorSummary)}
        </p>
      )}
    </div>
  ),
  goal_update: ({ payload }: RendererProps) => (
    <div
      style={{ padding: 8, background: '#e3f2fd', border: '1px solid #90caf9', borderRadius: 8 }}
    >
      {payload.goalId != null && <span style={{ fontSize: 12, color: '#666' }}>Goal</span>}
      {payload.title != null && (
        <div style={{ fontWeight: 500, marginTop: 4 }}>{String(payload.title)}</div>
      )}
      <div style={{ fontSize: 13, marginTop: 4 }}>
        {String(payload.event) === 'cancelled'
          ? 'Cancelled'
          : String(payload.event) === 'updated'
            ? `Updated · ${payload.status}`
            : String(payload.status ?? '')}
      </div>
    </div>
  ),
  table: TableArtifactRenderer as unknown as ComponentType<RendererProps>,
  chart: ChartArtifactRenderer as unknown as ComponentType<RendererProps>,
  file_reference: FileArtifactRenderer as unknown as ComponentType<RendererProps>,
  image_reference: ImageArtifactRenderer as unknown as ComponentType<RendererProps>,
  action_card: ({ payload }: RendererProps) => (
    <div
      style={{ padding: 8, background: '#fff8e1', border: '1px solid #ffecb3', borderRadius: 8 }}
    >
      {payload.prompt != null && (
        <p style={{ margin: '0 0 8px', fontSize: 14 }}>{String(payload.prompt)}</p>
      )}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {(
          (payload.actions as Array<{ label: string; actionId: string; variant?: string }>) ?? []
        ).map((a) => (
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
  ),
  action_prompt: ({ payload }: RendererProps) => (
    <div
      style={{ padding: 8, background: '#fff8e1', border: '1px solid #ffecb3', borderRadius: 8 }}
    >
      {payload.prompt != null && (
        <p style={{ margin: '0 0 8px', fontSize: 14 }}>{String(payload.prompt)}</p>
      )}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {(
          (payload.actions as Array<{ label: string; actionId: string; variant?: string }>) ?? []
        ).map((a) => (
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
  ),
};

const fallbackRenderer: ComponentType<RendererProps> = ({ payload }) => (
  <div className="whitespace-pre-wrap">{JSON.stringify(payload) as string}</div>
);

/**
 * Resolves the active renderer component for a message type.
 * When enabledPlugins is provided, only renderer-type plugins that are enabled
 * and whose pluginName matches the message type are used; otherwise falls back
 * to built-in or generic fallback.
 */
export function getRenderer(
  messageType: string,
  enabledPlugins?: PluginInfo[],
): ComponentType<RendererProps & Record<string, unknown>> | null {
  const builtin = builtinMap[messageType];
  if (!enabledPlugins || enabledPlugins.length === 0) {
    return builtin ?? fallbackRenderer;
  }
  const rendererPlugins = enabledPlugins.filter((p) => p.pluginType === 'renderer' && p.enabled);
  const hasEnabledForType = rendererPlugins.some((p) => p.pluginName === messageType);
  if (hasEnabledForType && builtin) return builtin;
  if (builtin) return builtin;
  return fallbackRenderer;
}
