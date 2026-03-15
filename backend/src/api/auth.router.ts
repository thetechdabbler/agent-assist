import type { FastifyInstance } from 'fastify';
import * as jose from 'jose';
import { requireAuth } from '../middleware/auth';
import { getRedisClient } from '../db/redis';
import { redeemToken } from '../db/redis';
import { prisma } from '../db/client';

export async function registerAuthRouter(app: FastifyInstance): Promise<void> {
  app.post<{ Querystring: { code?: string } }>(
    '/api/auth/handoff/redeem',
    async (request, reply) => {
      const auth = requireAuth(request);
      const code = request.query?.code;
      if (!code || typeof code !== 'string')
        return reply.status(400).send({ error: 'missing_code' });
      const redisUrl = process.env.REDIS_URL;
      if (!redisUrl) throw new Error('REDIS_URL not set');
      const redis = getRedisClient(redisUrl);
      const key = `handoff:${code}`;
      const payload = await redeemToken(redis, key);
      if (!payload) return reply.status(400).send({ error: 'invalid_or_expired_code' });
      if (payload.userId !== auth.userId) return reply.status(403).send({ error: 'user_mismatch' });
      await prisma.auditLog.create({
        data: {
          tenantId: payload.tenantId,
          userId: auth.userId,
          eventType: 'handoff.redeemed',
          entityType: 'conversation',
          entityId: payload.conversationId,
          correlationId: null,
        },
      });
      const secret = new TextEncoder().encode(process.env.JWT_SECRET);
      const token = await new jose.SignJWT({
        sub: auth.userId,
        tenantId: auth.tenantId,
        handoff: true,
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('1h')
        .setIssuedAt()
        .sign(secret);
      return reply.send({ token, expiresIn: 3600 });
    },
  );
}
