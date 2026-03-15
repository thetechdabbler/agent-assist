import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../middleware/auth';
import { rateLimitMiddleware } from '../middleware/rate-limit';
import { prisma } from '../db/client';
import * as artifactService from '../services/artifact.service';

export async function registerArtifactsRouter(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', rateLimitMiddleware);

  app.get<{ Params: { id: string } }>('/api/artifacts/:id', async (request, reply) => {
    const auth = requireAuth(request);
    const artifact = await artifactService.getArtifactById(request.params.id, auth.tenantId);
    if (!artifact) return reply.status(404).send({ error: 'not_found' });
    const conv = await prisma.conversation.findFirst({
      where: { id: artifact.conversationId },
      select: { ownerUserId: true },
    });
    if (conv?.ownerUserId !== auth.userId) return reply.status(403).send({ error: 'forbidden' });
    return reply.send(artifact);
  });

  app.get<{ Params: { id: string } }>('/api/jobs/:id/artifacts', async (request, reply) => {
    const auth = requireAuth(request);
    const jobId = request.params.id;
    const job = await prisma.job.findFirst({
      where: { id: jobId, tenantId: auth.tenantId },
      select: { id: true, conversationId: true },
    });
    if (!job) return reply.status(404).send({ error: 'not_found' });
    const conv = await prisma.conversation.findFirst({
      where: { id: job.conversationId },
      select: { ownerUserId: true },
    });
    if (conv?.ownerUserId !== auth.userId) return reply.status(403).send({ error: 'forbidden' });
    const list = await artifactService.listArtifactsByJob(jobId, auth.tenantId);
    return reply.send({ artifacts: list });
  });

  app.get<{ Params: { id: string } }>('/api/artifacts/:id/download-url', async (request, reply) => {
    const auth = requireAuth(request);
    const artifactId = request.params.id;
    const correlationId = (request.headers['x-correlation-id'] as string) ?? undefined;
    const result = await artifactService.generateSignedDownloadUrl(
      artifactId,
      auth.tenantId,
      auth.userId,
      correlationId,
    );
    if (!result.ok) {
      if (result.reason === 'not_found') return reply.status(404).send({ error: 'not_found' });
      return reply.status(400).send({ error: 'no_download_available' });
    }
    return reply.send({ url: result.url, expiresIn: result.expiresIn });
  });
}
