import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../middleware/auth';
import { rateLimitMiddleware } from '../middleware/rate-limit';
import { getConfig } from '../config';
import { listAgentAdapters } from '../plugins/registry';

const LIST_VERSION = '1.0';

export async function registerExampleAgentsRouter(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', rateLimitMiddleware);

  app.get('/api/example-agents', async (request, reply) => {
    const config = getConfig();
    if (!config.ENABLE_EXAMPLE_AGENTS) {
      return reply.send({ version: LIST_VERSION, agents: [] });
    }
    const auth = requireAuth(request);
    const agents = await listAgentAdapters(auth.tenantId);
    return reply.send({
      version: LIST_VERSION,
      agents: agents.map((a) => ({
        id: a.id,
        displayName: a.displayName,
        pluginName: a.pluginName,
      })),
    });
  });
}
