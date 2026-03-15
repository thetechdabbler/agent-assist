'use client';

import { useQuery } from '@tanstack/react-query';
import type { FormRequestPayload } from './InlineFormRenderer';
import { InlineFormRenderer } from './InlineFormRenderer';
import { getRenderer, type PluginInfo } from './RendererRegistry';
import { apiGet } from '@/services/api-client';

export interface MessageEnvelope {
  id?: string;
  conversationId: string;
  source: 'user' | 'agent' | 'system';
  type: string;
  version?: string;
  payload?: Record<string, unknown>;
  createdAt?: string;
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

  const { data: pluginsData } = useQuery({
    queryKey: ['plugins'],
    queryFn: () => apiGet<{ plugins: PluginInfo[] }>('/api/plugins'),
    staleTime: 60_000,
  });
  const plugins = pluginsData?.plugins;

  const renderContent = () => {
    if (type === 'form_request') {
      return (
        <InlineFormRenderer
          payload={payload as unknown as FormRequestPayload}
          conversationId={message.conversationId}
          messageId={message.id}
          tenantId={tenantId}
          onSubmitted={undefined}
        />
      );
    }
    const Renderer = getRenderer(type, plugins);
    if (Renderer) {
      return <Renderer payload={payload} />;
    }
    return <div className="whitespace-pre-wrap">{JSON.stringify(payload)}</div>;
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
        {renderContent()}
      </div>
    </div>
  );
}
