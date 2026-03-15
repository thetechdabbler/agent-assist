import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../middleware/auth';
import { rateLimitMiddleware } from '../middleware/rate-limit';
import * as notificationService from '../services/notification.service';

export async function registerNotificationsRouter(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', rateLimitMiddleware);

  app.get('/api/notifications', async (request, reply) => {
    const auth = requireAuth(request);
    const list = await notificationService.listUnread(auth.userId);
    return reply.send({ notifications: list });
  });

  app.get('/api/notifications/count', async (request, reply) => {
    const auth = requireAuth(request);
    const count = await notificationService.countUnread(auth.userId);
    return reply.send({ count });
  });

  app.patch<{ Params: { id: string } }>('/api/notifications/:id/seen', async (request, reply) => {
    const auth = requireAuth(request);
    const ok = await notificationService.markSeen(request.params.id, auth.userId);
    if (!ok) return reply.status(404).send({ error: 'not_found' });
    return reply.send({ ok: true });
  });

  app.patch<{ Params: { id: string } }>(
    '/api/notifications/:id/acknowledged',
    async (request, reply) => {
      const auth = requireAuth(request);
      const ok = await notificationService.markAcknowledged(request.params.id, auth.userId);
      if (!ok) return reply.status(404).send({ error: 'not_found' });
      return reply.send({ ok: true });
    },
  );
}
