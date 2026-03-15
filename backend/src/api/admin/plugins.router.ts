import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../middleware/auth';
import { rateLimitMiddleware } from '../../middleware/rate-limit';
import { prisma } from '../../db/client';

export async function registerAdminPluginsRouter(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', rateLimitMiddleware);

  app.get('/api/plugins', async (request, reply) => {
    const auth = requireAuth(request);
    const plugins = await prisma.pluginRegistry.findMany({
      orderBy: [{ pluginType: 'asc' }, { pluginName: 'asc' }],
      select: {
        id: true,
        pluginType: true,
        pluginName: true,
        version: true,
        status: true,
        tenantPlugins: {
          where: { tenantId: auth.tenantId },
          select: { enabled: true },
          take: 1,
        },
      },
    });
    const list = plugins.map((p) => ({
      id: p.id,
      pluginType: p.pluginType,
      pluginName: p.pluginName,
      version: p.version,
      status: p.status,
      enabled: p.tenantPlugins[0]?.enabled ?? false,
    }));
    return reply.send({ plugins: list });
  });

  app.patch<{
    Params: { tenantId: string; pluginId: string };
    Body: { enabled: boolean };
  }>('/api/tenants/:tenantId/plugins/:pluginId/enabled', async (request, reply) => {
    const auth = requireAuth(request);
    if (auth.tenantId !== request.params.tenantId) {
      return reply.status(403).send({ error: 'forbidden' });
    }
    const { tenantId, pluginId } = request.params;
    const body = request.body as { enabled?: boolean };
    const enabled = body.enabled === true;
    const plugin = await prisma.pluginRegistry.findUnique({
      where: { id: pluginId },
      select: { id: true },
    });
    if (!plugin) return reply.status(404).send({ error: 'plugin_not_found' });
    await prisma.tenantPlugin.upsert({
      where: {
        tenantId_pluginId: { tenantId, pluginId },
      },
      create: {
        tenantId,
        pluginId,
        enabled,
        enabledAt: enabled ? new Date() : null,
      },
      update: {
        enabled,
        enabledAt: enabled ? new Date() : null,
      },
    });
    return reply.send({ ok: true, enabled });
  });
}
