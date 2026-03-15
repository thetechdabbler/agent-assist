import type { IAgentAdapter } from '../registry';

const CONTRACT_VERSION = '1.0';

/**
 * In-process echo agent: returns the user's text as the agent response.
 * Used as an example agent for integration demos and as a reference for building new adapters.
 * The gateway will consume yielded tokens and emit message.token / message.complete.
 */
export function createEchoAgentAdapter(): IAgentAdapter {
  return {
    metadata: {
      pluginType: 'agent_adapter',
      name: 'echo',
      version: '1.0.0',
      contractVersion: CONTRACT_VERSION,
      description: 'Echo agent – returns user input as response',
    },
    async *startTurn(request: unknown): AsyncGenerator<unknown> {
      const ctx = request as {
        conversationId: string;
        userInput: { text?: string };
        correlationId: string;
      };
      const text = ctx.userInput?.text ?? '';
      yield { token: text };
    },
    async getHealth(): Promise<{ ok: boolean }> {
      return { ok: true };
    },
    async getCapabilities(): Promise<Record<string, unknown>> {
      return { text: true };
    },
  };
}
