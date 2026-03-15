import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../middleware/auth';
import { rateLimitMiddleware } from '../middleware/rate-limit';
import * as searchQueryService from '../services/search-query.service';
import type { IndexType } from '../services/search-indexer.service';

export async function registerSearchRouter(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', rateLimitMiddleware);

  app.get<{
    Querystring: {
      q?: string;
      type?: string;
      status?: string;
      from?: string;
      to?: string;
      artifact_type?: string;
    };
  }>('/api/search', async (request, reply) => {
    const auth = requireAuth(request);
    const { q, type, status, from, to, artifact_type } = request.query;
    const result = await searchQueryService.search(auth.tenantId, {
      q,
      type: type as IndexType | undefined,
      status,
      from,
      to,
      artifact_type,
    });
    if (!result.ok) {
      return reply.status(503).send({ error: 'search_unavailable' });
    }
    return reply.send({ results: result.results });
  });
}
