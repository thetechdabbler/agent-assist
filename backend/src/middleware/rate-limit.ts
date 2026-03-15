import type { FastifyRequest, FastifyReply } from 'fastify';

const defaultPerUser = 200; // per user per minute (goals, conversations, jobs, etc. share this)
const defaultPerTenant = 1000;
const windowMs = 60_000;

const userCount = new Map<string, { count: number; resetAt: number }>();
const tenantCount = new Map<string, { count: number; resetAt: number }>();

function getOrCreate(
  map: Map<string, { count: number; resetAt: number }>,
  key: string,
  _limit: number,
): { count: number; resetAt: number } {
  const now = Date.now();
  const cur = map.get(key);
  if (cur) {
    if (now >= cur.resetAt) {
      const next = { count: 1, resetAt: now + windowMs };
      map.set(key, next);
      return next;
    }
    cur.count++;
    return cur;
  }
  const next = { count: 1, resetAt: now + windowMs };
  map.set(key, next);
  return next;
}

export async function rateLimitMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const auth = request.auth;
  if (!auth) return;
  const perUser = Number(process.env.AGENT_GATEWAY_RATE_LIMIT_PER_USER) || defaultPerUser;
  const perTenant = Number(process.env.AGENT_GATEWAY_RATE_LIMIT_PER_TENANT) || defaultPerTenant;

  const user = getOrCreate(userCount, auth.userId, perUser);
  const tenant = getOrCreate(tenantCount, auth.tenantId, perTenant);

  if (user.count > perUser || tenant.count > perTenant) {
    const retryAfter = Math.ceil((Math.min(user.resetAt, tenant.resetAt) - Date.now()) / 1000);
    return reply
      .status(429)
      .header('Retry-After', String(Math.max(1, retryAfter)))
      .send({ error: 'too_many_requests' });
  }
}
