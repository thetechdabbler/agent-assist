import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../middleware/auth';
import { rateLimitMiddleware } from '../middleware/rate-limit';
import { prisma } from '../db/client';
import * as jobService from '../services/job.service';
import * as formRequestService from '../services/form-request.service';

export async function registerJobsRouter(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', rateLimitMiddleware);

  app.get<{ Querystring: { status?: string } }>('/api/jobs', async (request, reply) => {
    const auth = requireAuth(request);
    const status = (request.query as { status?: string }).status;
    const list = await jobService.listJobs(auth.tenantId, {
      userId: auth.userId,
      status,
    });
    return reply.send({ jobs: list });
  });

  app.get<{ Params: { id: string } }>('/api/jobs/:id', async (request, reply) => {
    const auth = requireAuth(request);
    const job = await jobService.getJob(request.params.id, auth.tenantId);
    if (!job) return reply.status(404).send({ error: 'not_found' });
    const conv = await prisma.conversation.findFirst({
      where: { id: job.conversationId },
      select: { ownerUserId: true },
    });
    if (conv?.ownerUserId !== auth.userId) return reply.status(403).send({ error: 'forbidden' });
    return reply.send(job);
  });

  app.post<{
    Params: { id: string };
    Body: Record<string, unknown>;
  }>('/api/jobs/:id/form-response', async (request, reply) => {
    const auth = requireAuth(request);
    const jobId = request.params.id;
    const body = (request.body as Record<string, unknown>) ?? {};
    const payload =
      typeof body.payload === 'object' && body.payload !== null
        ? (body.payload as Record<string, unknown>)
        : body;
    const result = await formRequestService.submitFormResponse(jobId, auth.tenantId, payload, {
      userId: auth.userId,
      attachments: Array.isArray(body.attachments) ? body.attachments : undefined,
    });
    if (result.ok) return reply.send({ ok: true });
    if ('conflict' in result && result.conflict)
      return reply.status(409).send({ error: 'form_already_resolved' });
    if ('error' in result) {
      if (result.error === 'forbidden') return reply.status(403).send({ error: 'forbidden' });
      if (result.error === 'submission_delivery_failed')
        return reply.status(502).send({ error: result.error });
      return reply.status(422).send({ error: result.error });
    }
    return reply.status(422).send({ error: 'validation_failed' });
  });

  app.post<{ Params: { id: string } }>('/api/jobs/:id/retry', async (request, reply) => {
    const auth = requireAuth(request);
    const result = await jobService.retryJob(request.params.id, auth.tenantId, auth.userId);
    if (!result.ok) {
      if (result.error === 'job_not_found') return reply.status(404).send({ error: 'not_found' });
      if (result.error === 'only_failed_can_retry')
        return reply.status(422).send({ error: result.error });
      return reply.status(400).send({ error: result.error });
    }
    return reply.send({ ok: true });
  });

  app.post<{ Params: { id: string } }>('/api/jobs/:id/rerun', async (request, reply) => {
    const auth = requireAuth(request);
    const created = await jobService.rerunJob(request.params.id, auth.tenantId, auth.userId);
    if (!created) return reply.status(404).send({ error: 'not_found' });
    return reply.status(201).send(created);
  });

  app.delete<{ Params: { id: string } }>('/api/jobs/:id', async (request, reply) => {
    const auth = requireAuth(request);
    const ok = await jobService.deleteJob(request.params.id, auth.tenantId);
    if (!ok) return reply.status(404).send({ error: 'not_found' });
    return reply.send({ ok: true });
  });
}
