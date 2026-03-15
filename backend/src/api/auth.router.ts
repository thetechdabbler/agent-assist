import type { FastifyInstance } from 'fastify';
import * as jose from 'jose';
import { requireAuth } from '../middleware/auth';
import { getRedisClient } from '../db/redis';
import { redeemToken } from '../db/redis';
import { prisma } from '../db/client';

export async function registerAuthRouter(app: FastifyInstance): Promise<void> {
  app.post<{ Body: { email?: string } }>('/api/auth/session', async (request, reply) => {
    const body = (request.body as { email?: string }) ?? {};
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    if (!email) return reply.status(400).send({ error: 'email_required' });
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, tenantId: true },
    });
    if (!user) return reply.status(401).send({ error: 'invalid_credentials' });
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const token = await new jose.SignJWT({
      sub: user.id,
      tenantId: user.tenantId,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .setIssuedAt()
      .sign(secret);
    return reply.send({
      token,
      expiresIn: 7 * 24 * 3600,
      user: { id: user.id, email: user.email, name: user.name, tenantId: user.tenantId },
    });
  });

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
