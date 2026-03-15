import CircuitBreaker from 'opossum';
import retry from 'async-retry';
import { z } from 'zod';
import { getAgentAdapter } from '../plugins/registry';
import { emitToConversation } from '../realtime/event-bus';
import { getConfig } from '../config';
import { agentAssistAdapterErrorTotal } from '../observability/metrics';
import { agentAssistRendererValidationFailureTotal } from '../observability/metrics';
import * as formRequestService from '../services/form-request.service';
import * as goalService from '../services/goal.service';

const messageEnvelopeSchema = z.object({
  id: z.string().uuid().optional(),
  conversationId: z.string().uuid(),
  source: z.enum(['user', 'agent', 'system']),
  type: z.string(),
  version: z.string().regex(/^\d+\.\d+$/),
  createdAt: z.string().optional(),
  payload: z.record(z.unknown()),
  correlationId: z.string().uuid().optional(),
});

const tokenPayloadSchema = z.object({
  token: z.string().optional(),
  delta: z.string().optional(),
});

const formRequestPayloadSchema = z.object({
  formSchema: z.record(z.unknown()),
  uiSchema: z.record(z.unknown()).optional(),
  prompt: z.string().optional(),
  submitAction: z.string(),
});

export type StartTurnContext = {
  conversationId: string;
  userId: string;
  tenantId: string;
  userInput: { text?: string; attachments?: unknown[] };
  context: {
    goals: unknown[];
    directives?: unknown[];
    settings: unknown;
    recentMessages: unknown[];
  };
  correlationId: string;
};

export async function runAgentTurn(
  tenantId: string,
  conversationId: string,
  correlationId: string,
  ctx: StartTurnContext,
): Promise<'ok' | 'unavailable'> {
  const config = getConfig();
  const adapter = await getAgentAdapter(tenantId);
  if (!adapter) return 'unavailable';

  const directives = await goalService.getActiveDirectiveGoals(ctx.userId);
  const enrichedContext: StartTurnContext = {
    ...ctx,
    context: {
      ...ctx.context,
      directives: directives.map((g) => ({ id: g.id, title: g.title, description: g.description })),
    },
  };

  const options = {
    timeout: config.AGENT_GATEWAY_TIMEOUT_MS,
    errorThresholdPercentage: 100,
    resetTimeout: 30_000,
    volumeThreshold: 5,
  };

  const breaker = new CircuitBreaker(async (_req: StartTurnContext) => {
    return retry(
      async () => {
        const result = adapter.startTurn(enrichedContext);
        if (
          result != null &&
          typeof (result as AsyncGenerator<unknown>)[Symbol.asyncIterator] === 'function'
        ) {
          const gen = result as AsyncGenerator<unknown>;
          for await (const chunk of gen) {
            const chunkObj =
              typeof chunk === 'object' && chunk !== null ? (chunk as Record<string, unknown>) : {};
            const formRequestParsed = formRequestPayloadSchema.safeParse(chunkObj);
            if (
              formRequestParsed.success &&
              (chunkObj as { type?: string }).type === 'form_request'
            ) {
              const jobId =
                typeof (chunkObj as { jobId?: string }).jobId === 'string'
                  ? (chunkObj as { jobId: string }).jobId
                  : null;
              if (jobId) {
                try {
                  await formRequestService.createFormRequest({
                    jobId,
                    conversationId,
                    tenantId,
                    schema: {
                      formSchema: formRequestParsed.data.formSchema,
                      uiSchema: formRequestParsed.data.uiSchema,
                      prompt: formRequestParsed.data.prompt,
                      submitAction: formRequestParsed.data.submitAction,
                    },
                    correlationId,
                  });
                } catch {
                  agentAssistRendererValidationFailureTotal.add(1, {
                    payload_type: 'form_request',
                  });
                }
              }
              continue;
            }
            const parsed = tokenPayloadSchema.safeParse(chunk);
            if (parsed.success) {
              const token = parsed.data.token ?? parsed.data.delta ?? '';
              if (token) {
                const envelope = messageEnvelopeSchema.safeParse({
                  conversationId,
                  source: 'agent',
                  type: 'text',
                  version: '1.0',
                  payload: { text: token, format: 'plain' },
                  correlationId,
                });
                if (envelope.success) {
                  emitToConversation(conversationId, 'message.token', envelope.data);
                } else {
                  agentAssistRendererValidationFailureTotal.add(1, {
                    payload_type: 'message_envelope',
                  });
                }
              }
            }
          }
          emitToConversation(conversationId, 'message.complete', { correlationId });
          return { type: 'stream' as const };
        }
        const value =
          result != null && typeof (result as Promise<unknown>).then === 'function'
            ? await (result as Promise<unknown>)
            : result;
        emitToConversation(conversationId, 'message.complete', { correlationId });
        return { type: 'ack' as const, value };
      },
      { retries: 3, factor: 2, minTimeout: 500, maxTimeout: 5000 },
    );
  }, options);

  breaker.on('open', () => {
    emitToConversation(conversationId, 'agent.unavailable', {});
  });
  breaker.on('halfOpen', () => {});
  breaker.on('close', () => {
    emitToConversation(conversationId, 'agent.available', {});
  });

  try {
    await breaker.fire(ctx);
    return 'ok';
  } catch (err) {
    agentAssistAdapterErrorTotal.add(1, { adapter_name: 'agent' });
    if (breaker.opened) {
      emitToConversation(conversationId, 'agent.unavailable', {});
      return 'unavailable';
    }
    throw err;
  }
}
