import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { agentAssistRendererValidationFailureTotal } from '../observability/metrics';

const messageEnvelopeSchema = z.object({
  id: z.string().uuid().optional(),
  conversationId: z.string().uuid(),
  source: z.enum(['user', 'agent', 'system']),
  type: z.string(),
  version: z.string(),
  createdAt: z.string().datetime().optional(),
  payload: z.record(z.unknown()),
  correlationId: z.string().uuid().optional(),
});

export async function payloadValidatorMiddleware(
  request: FastifyRequest<{ Body?: unknown }>,
  reply: FastifyReply,
): Promise<void> {
  if (request.method !== 'POST' && request.method !== 'PATCH' && request.method !== 'PUT') return;
  const body = request.body;
  if (!body || typeof body !== 'object') return;
  const result = messageEnvelopeSchema.safeParse(body);
  if (!result.success) {
    agentAssistRendererValidationFailureTotal.add(1, { payload_type: 'message_envelope' });
    return reply.status(422).send({
      error: 'validation_failed',
      details: result.error.flatten(),
    });
  }
}

export function sanitizeHtml(html: string): string {
  return html
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
