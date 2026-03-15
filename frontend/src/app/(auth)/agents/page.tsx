'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost } from '@/services/api-client';
import AppLayout from '@/layouts/AppLayout';
import { AgentList, type ExampleAgent } from '@/components/agents/AgentList';

interface ExampleAgentsResponse {
  version: string;
  agents: ExampleAgent[];
}

interface CreateResponse {
  id: string;
  title: string | null;
  status: string;
  createdAt: string;
  agentId?: string | null;
}

export default function ExampleAgentsPage() {
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ['example-agents'],
    queryFn: () => apiGet<ExampleAgentsResponse>('/api/example-agents'),
  });

  const createWithAgent = useMutation({
    mutationFn: (agentId: string) => apiPost<CreateResponse>('/api/conversations', { agentId }),
    onSuccess: (res) => router.replace(`/conversations/${res.id}`),
  });

  const agents = data?.agents ?? [];

  return (
    <AppLayout>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <h1>Example agents</h1>
        <p style={{ color: '#666', marginBottom: 16 }}>
          Start a dedicated conversation with an example agent. Only available in dev/local.
        </p>
        <AgentList
          agents={agents}
          onSelect={(agentId) => createWithAgent.mutate(agentId)}
          isLoading={isLoading}
        />
        {createWithAgent.isPending && <p style={{ marginTop: 16 }}>Creating conversation…</p>}
        {createWithAgent.isError && (
          <p style={{ marginTop: 16, color: 'crimson' }}>
            Failed to create conversation. Try again.
          </p>
        )}
      </div>
    </AppLayout>
  );
}
