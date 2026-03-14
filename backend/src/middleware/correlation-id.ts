import { randomUUID } from 'crypto';
import type { FastifyRequest, FastifyReply } from 'fastify';

const HEADER = 'x-correlation-id';

export async function correlationIdMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const existing = request.headers[HEADER];
  const id = typeof existing === 'string' ? existing : randomUUID();
  (request as FastifyRequest & { correlationId: string }).correlationId = id;
  reply.header(HEADER, id);
}

export function getCorrelationId(request: FastifyRequest): string | undefined {
  return (request as FastifyRequest & { correlationId?: string }).correlationId;
}
