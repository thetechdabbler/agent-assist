'use client';

import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useRef, useEffect } from 'react';
import { apiGet, apiPost, ApiError } from '@/services/api-client';
import AppLayout from '@/layouts/AppLayout';
import { MessageBubble } from '@/components/messages/MessageBubble';
import { AgentUnavailableCard } from '@/components/messages/AgentUnavailableCard';
import { AttachmentUploader } from '@/components/AttachmentUploader';
import { QRHandoffModal } from '@/components/QRHandoffModal';
import { useConversationStream } from '@/hooks/useConversationStream';
import { useSession } from 'next-auth/react';

interface Message {
  id: string;
  sourceType: string;
  type: string;
  payloadJson: unknown;
  createdAt: string;
}

interface ConversationDetail {
  id: string;
  title: string | null;
  status: string;
  ownerUserId: string;
  tenantId: string;
  messages?: Message[];
}

export default function ConversationPage() {
  const params = useParams();
  const id = params?.id as string;
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const tenantId = (session as { tenantId?: string })?.tenantId ?? '';

  const [input, setInput] = useState('');
  const [lastSentMessageId, setLastSentMessageId] = useState<string | null>(null);
  const [handoffOpen, setHandoffOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: conv, isLoading } = useQuery({
    queryKey: ['conversation', id],
    queryFn: () => apiGet<ConversationDetail>(`/api/conversations/${id}`),
    enabled: !!id && id !== 'new',
  });

  const { tokens, agentUnavailable, resetStream, connected } = useConversationStream(
    id && id !== 'new' ? id : null,
  );

  const sendMessage = useMutation({
    mutationFn: async (text: string) => {
      const res = await apiPost<{ id: string; correlationId: string }>(
        `/api/conversations/${id}/messages`,
        { text },
      );
      return res;
    },
    onSuccess: (data) => {
      setLastSentMessageId(data.id);
      setInput('');
      resetStream();
      queryClient.invalidateQueries({ queryKey: ['conversation', id] });
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 503) {
        // Agent unavailable - UI already shows card via socket
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = input.trim();
    if (!t || sendMessage.isPending || agentUnavailable) return;
    sendMessage.mutate(t);
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conv?.messages?.length, tokens.length]);

  if (!id || id === 'new') return null;
  if (isLoading) {
    return (
      <AppLayout>
        <p>Loading…</p>
      </AppLayout>
    );
  }
  if (!conv) {
    return (
      <AppLayout>
        <p>Conversation not found.</p>
      </AppLayout>
    );
  }

  const messages = conv.messages ?? [];
  const streamingText = tokens.join('');
  const lastMessageId =
    lastSentMessageId ?? (messages.length > 0 ? messages[messages.length - 1].id : null);

  return (
    <AppLayout>
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)' }}>
        <div
          style={{
            padding: 16,
            borderBottom: '1px solid #eee',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h2 style={{ margin: 0 }}>{conv.title || 'Conversation'}</h2>
          <div>
            {!connected && (
              <span style={{ fontSize: 12, color: '#666', marginRight: 8 }}>Connecting…</span>
            )}
            <button
              type="button"
              onClick={() => setHandoffOpen(true)}
              style={{ padding: '6px 12px' }}
            >
              Hand off to device
            </button>
          </div>
        </div>
        <QRHandoffModal
          conversationId={id}
          open={handoffOpen}
          onClose={() => setHandoffOpen(false)}
        />
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: 16,
          }}
        >
          {messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={{
                id: m.id,
                conversationId: id,
                source: m.sourceType as 'user' | 'agent' | 'system',
                type: m.type,
                payload: m.payloadJson as Record<string, unknown>,
                createdAt: m.createdAt,
              }}
            />
          ))}
          {streamingText && (
            <MessageBubble
              message={{
                conversationId: id,
                source: 'agent',
                type: 'text',
                payload: { text: streamingText, format: 'plain' },
              }}
            />
          )}
          {agentUnavailable && <AgentUnavailableCard />}
          <div ref={bottomRef} />
        </div>
        <form
          onSubmit={handleSubmit}
          style={{
            padding: 16,
            borderTop: '1px solid #eee',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message…"
            rows={2}
            disabled={agentUnavailable || sendMessage.isPending}
            style={{ width: '100%', padding: 8, borderRadius: 8, resize: 'none' }}
          />
          {lastMessageId && tenantId && (
            <AttachmentUploader
              conversationId={id}
              messageId={lastMessageId}
              tenantId={tenantId}
              onUploaded={() => queryClient.invalidateQueries({ queryKey: ['conversation', id] })}
            />
          )}
          <button
            type="submit"
            disabled={!input.trim() || sendMessage.isPending || agentUnavailable}
            style={{ alignSelf: 'flex-end', padding: '8px 24px' }}
          >
            Send
          </button>
        </form>
      </div>
    </AppLayout>
  );
}
