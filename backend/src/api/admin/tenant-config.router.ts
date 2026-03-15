import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../middleware/auth';
import { prisma } from '../../db/client';
import { z } from 'zod';

const uploadLimitsSchema = z.object({
  maxSizeBytes: z.number().positive().optional(),
  allowedMimeTypes: z.array(z.string()).optional(),
});

export async function registerTenantConfigRouter(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { id: string } }>(
    '/api/tenants/:id/config/upload-limits',
    async (request, reply) => {
      const auth = requireAuth(request);
      if (auth.tenantId !== request.params.id)
        return reply.status(403).send({ error: 'forbidden' });
      const tenant = await prisma.tenant.findUnique({
        where: { id: request.params.id },
      });
      if (!tenant) return reply.status(404).send({ error: 'not_found' });
      const config =
        (tenant.configJson as {
          uploadLimits?: { maxSizeBytes?: number; allowedMimeTypes?: string[] };
        }) ?? {};
      const limits = config.uploadLimits ?? {};
      return reply.send({
        maxSizeBytes: limits.maxSizeBytes ?? 50 * 1024 * 1024,
        allowedMimeTypes: limits.allowedMimeTypes ?? [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'application/pdf',
          'text/plain',
          'text/csv',
        ],
      });
    },
  );

  app.patch<{ Params: { id: string }; Body?: unknown }>(
    '/api/tenants/:id/config/upload-limits',
    async (request, reply) => {
      const auth = requireAuth(request);
      if (auth.tenantId !== request.params.id)
        return reply.status(403).send({ error: 'forbidden' });
      const body = uploadLimitsSchema.safeParse(request.body ?? {});
      if (!body.success)
        return reply
          .status(422)
          .send({ error: 'validation_failed', details: body.error.flatten() });
      const tenant = await prisma.tenant.findUnique({
        where: { id: request.params.id },
      });
      if (!tenant) return reply.status(404).send({ error: 'not_found' });
      const existing = (tenant.configJson as Record<string, unknown>) ?? {};
      const uploadLimits = {
        ...((existing.uploadLimits as object) ?? {}),
        ...(body.data.maxSizeBytes !== undefined && { maxSizeBytes: body.data.maxSizeBytes }),
        ...(body.data.allowedMimeTypes !== undefined && {
          allowedMimeTypes: body.data.allowedMimeTypes,
        }),
      };
      await prisma.tenant.update({
        where: { id: request.params.id },
        data: { configJson: { ...existing, uploadLimits } },
      });
      return reply.send({ ok: true, uploadLimits });
    },
  );
}
