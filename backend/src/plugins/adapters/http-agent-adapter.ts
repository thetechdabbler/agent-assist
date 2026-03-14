import { getConfig } from '../../config';
import type { IAgentAdapter } from '../registry';

const CONTRACT_VERSION = '1.0';

export function createHttpAgentAdapter(): IAgentAdapter {
  const config = getConfig();
  const baseUrl = config.AGENT_GATEWAY_URL;

  return {
    metadata: {
      pluginType: 'agent_adapter',
      name: 'http-agent',
      version: '1.0.0',
      contractVersion: CONTRACT_VERSION,
      description: 'HTTP streaming agent adapter',
      capabilities: ['text', 'streaming'],
    },
    async startTurn(request: unknown): Promise<{ jobId: string; status: 'accepted' }> {
      if (!baseUrl) throw new Error('AGENT_GATEWAY_URL not configured');
      const req = request as {
        conversationId: string;
        userId: string;
        tenantId: string;
        userInput: { text?: string };
        context: unknown;
        correlationId: string;
      };
      const res = await fetch(`${baseUrl.replace(/\/$/, '')}/turn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: req.conversationId,
          userId: req.userId,
          tenantId: req.tenantId,
          userInput: req.userInput,
          context: req.context,
          correlationId: req.correlationId,
        }),
      });
      if (!res.ok) {
        throw new Error(`Agent responded ${res.status}`);
      }
      const body = (await res.json()) as { jobId?: string };
      return { jobId: body.jobId ?? 'unknown', status: 'accepted' };
    },
    async getHealth(): Promise<{ ok: boolean }> {
      if (!baseUrl) return { ok: false };
      try {
        const res = await fetch(`${baseUrl.replace(/\/$/, '')}/health`, { method: 'GET' });
        return { ok: res.ok };
      } catch {
        return { ok: false };
      }
    },
    async getCapabilities(): Promise<Record<string, unknown>> {
      return { text: true, streaming: true };
    },
  };
}
