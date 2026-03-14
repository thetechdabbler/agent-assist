import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../middleware/auth';
import { rateLimitMiddleware } from '../middleware/rate-limit';
import { getCorrelationId } from '../middleware/correlation-id';
import * as conversationService from '../services/conversation.service';
import * as messageService from '../services/message.service';
import { runAgentTurn } from '../gateway/agent-gateway';
import { getRedisClient } from '../db/redis';
import { setToken, HANDOFF_TOKEN_TTL } from '../db/redis';
import { z } from 'zod';
import { randomUUID } from 'crypto';

const createBodySchema = z.object({ title: z.string().optional().nullable() });
const updateTitleSchema = z.object({ title: z.string().min(1) });
const sendMessageSchema = z.object({
  text: z.string().optional(),
  type: z.string().default('text'),
  payload: z.record(z.unknown()).optional(),
});

export async function registerConversationsRouter(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', rateLimitMiddleware);

  app.post<{ Body?: unknown }>('/api/conversations', async (request, reply) => {
    const auth = requireAuth(request);
    const body = createBodySchema.safeParse(request.body ?? {});
    const title = body.success ? (body.data.title ?? undefined) : undefined;
    const conv = await conversationService.createConversation(
      auth.userId,
      auth.tenantId,
      title,
      request,
    );
    return reply.status(201).send(conv);
  });

  app.get('/api/conversations', async (request, reply) => {
    const auth = requireAuth(request);
    const status = (request.query as { status?: string }).status as
      | 'active'
      | 'archived'
      | undefined;
    const list = await conversationService.listByUser(auth.userId, auth.tenantId, status);
    return reply.send({ conversations: list });
  });

  app.get<{ Params: { id: string } }>('/api/conversations/:id', async (request, reply) => {
    const auth = requireAuth(request);
    const conv = await conversationService.getById(request.params.id, auth.tenantId, auth.userId);
    if (!conv) return reply.status(404).send({ error: 'not_found' });
    return reply.send(conv);
  });

  app.get<{ Params: { id: string }; Querystring: { cursor?: string; limit?: number } }>(
    '/api/conversations/:id/messages',
    async (request, reply) => {
      const auth = requireAuth(request);
      const conv = await conversationService.getById(request.params.id, auth.tenantId, auth.userId);
      if (!conv) return reply.status(404).send({ error: 'not_found' });
      const { cursor, limit } = request.query;
      const out = await messageService.listByConversation(request.params.id, auth.tenantId, {
        cursor,
        limit: limit ? Number(limit) : undefined,
      });
      return reply.send(out);
    },
  );

  app.patch<{ Params: { id: string }; Body?: unknown }>(
    '/api/conversations/:id',
    async (request, reply) => {
      const auth = requireAuth(request);
      const conv = await conversationService.getById(request.params.id, auth.tenantId, auth.userId);
      if (!conv) return reply.status(404).send({ error: 'not_found' });
      const body = updateTitleSchema.safeParse(request.body ?? {});
      if (!body.success)
        return reply
          .status(422)
          .send({ error: 'validation_failed', details: body.error.flatten() });
      const ok = await conversationService.updateTitle(
        request.params.id,
        auth.tenantId,
        auth.userId,
        body.data.title,
      );
      if (!ok) return reply.status(404).send({ error: 'not_found' });
      return reply.send({ ok: true });
    },
  );

  app.get<{ Params: { id: string } }>(
    '/api/conversations/:id/handoff-qr',
    async (request, reply) => {
      const auth = requireAuth(request);
      const conv = await conversationService.getById(request.params.id, auth.tenantId, auth.userId);
      if (!conv) return reply.status(404).send({ error: 'not_found' });
      const code = randomUUID();
      const redisUrl = process.env.REDIS_URL;
      if (!redisUrl) throw new Error('REDIS_URL not set');
      const redis = getRedisClient(redisUrl);
      await setToken(
        redis,
        `handoff:${code}`,
        {
          userId: auth.userId,
          conversationId: request.params.id,
          tenantId: auth.tenantId,
          redeemed: false,
        },
        HANDOFF_TOKEN_TTL,
      );
      return reply.send({ code, expiresInSeconds: HANDOFF_TOKEN_TTL });
    },
  );

  app.post<{ Params: { id: string }; Body?: unknown }>(
    '/api/conversations/:id/messages',
    async (request, reply) => {
      const auth = requireAuth(request);
      const conv = await conversationService.getById(request.params.id, auth.tenantId, auth.userId);
      if (!conv) return reply.status(404).send({ error: 'not_found' });
      const body = sendMessageSchema.safeParse(request.body ?? {});
      if (!body.success)
        return reply
          .status(422)
          .send({ error: 'validation_failed', details: body.error.flatten() });
      const correlationId = getCorrelationId(request) ?? crypto.randomUUID();
      const text =
        body.data.text ?? (body.data.payload as { text?: string } | undefined)?.text ?? '';
      const userMessage = await messageService.appendMessage({
        conversationId: request.params.id,
        sourceType: 'user',
        type: body.data.type,
        payloadJson: body.data.payload ?? { text },
        correlationId,
      });
      const status = await runAgentTurn(auth.tenantId, request.params.id, correlationId, {
        conversationId: request.params.id,
        userId: auth.userId,
        tenantId: auth.tenantId,
        userInput: { text },
        context: { goals: [], settings: {}, recentMessages: [] },
        correlationId,
      });
      if (status === 'unavailable') {
        return reply.status(503).send({
          error: 'agent_unavailable',
          message: 'Agent temporarily unavailable. Send will re-enable when the agent is back.',
          messageId: userMessage.id,
        });
      }
      return reply.status(201).send({
        id: userMessage.id,
        correlationId: userMessage.correlationId,
        createdAt: userMessage.createdAt,
      });
    },
  );
}
