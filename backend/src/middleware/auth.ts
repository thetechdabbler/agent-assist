import type { FastifyRequest, FastifyReply } from 'fastify';
import * as jose from 'jose';

export interface AuthContext {
  userId: string;
  tenantId: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    auth?: AuthContext;
  }
}

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authHeader = request.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return reply
      .status(401)
      .send({ error: 'unauthorized', message: 'Missing or invalid Authorization' });
  }
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jose.jwtVerify(token, secret);
    const sub = payload.sub as string | undefined;
    const tenantId = payload.tenantId as string | undefined;
    if (!sub || !tenantId) {
      return reply.status(401).send({ error: 'unauthorized', message: 'Invalid token claims' });
    }
    request.auth = { userId: sub, tenantId };
  } catch {
    return reply.status(401).send({ error: 'unauthorized', message: 'Invalid or expired token' });
  }
}

export function requireAuth(request: FastifyRequest): AuthContext {
  if (!request.auth) throw new Error('Auth required');
  return request.auth;
}

export function assertOwnership(request: FastifyRequest, resourceUserId: string): void {
  const auth = requireAuth(request);
  if (auth.userId !== resourceUserId) {
    throw Object.assign(new Error('Forbidden'), { statusCode: 403 });
  }
}
