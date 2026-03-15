import type { FastifyInstance } from 'fastify';
import { getPrometheusMetrics } from '../observability/metrics';
import { correlationIdMiddleware } from '../middleware/correlation-id';
import { authMiddleware } from '../middleware/auth';
import { tenantContextMiddleware } from '../middleware/tenant';
import { rateLimitMiddleware } from '../middleware/rate-limit';
import { registerConversationsRouter } from './conversations.router';
import { registerAttachmentsRouter } from './attachments.router';
import { registerTenantConfigRouter } from './admin/tenant-config.router';
import { registerAuthRouter } from './auth.router';
import { registerJobsRouter } from './jobs.router';
import { registerNotificationsRouter } from './notifications.router';
import { registerGoalsRouter } from './goals.router';

export async function registerRouter(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', correlationIdMiddleware);
  app.addHook('preHandler', async (request, reply) => {
    if (request.url === '/health' || request.url === '/metrics') return;
    return authMiddleware(request, reply);
  });
  app.addHook('preHandler', tenantContextMiddleware);

  app.get('/health', async (_request, reply) => {
    return reply.send({ status: 'ok' });
  });

  app.get('/metrics', async (_request, reply) => {
    const body = await getPrometheusMetrics();
    return reply.header('Content-Type', 'text/plain; charset=utf-8').send(body);
  });

  app.get('/api/me', { preHandler: [rateLimitMiddleware] }, async (request, reply) => {
    const auth = request.auth;
    if (!auth) return reply.status(401).send({ error: 'unauthorized' });
    return reply.send({ userId: auth.userId, tenantId: auth.tenantId });
  });

  await registerConversationsRouter(app);
  await registerAttachmentsRouter(app);
  await registerTenantConfigRouter(app);
  await registerAuthRouter(app);
  await registerJobsRouter(app);
  await registerNotificationsRouter(app);
  await registerGoalsRouter(app);
}
