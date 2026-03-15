import Redis from 'ioredis';

export const HANDOFF_TOKEN_TTL = 90;
export const SESSION_TTL = 86400;

let client: Redis | null = null;

export function getRedisClient(redisUrl: string): Redis {
  if (!client) {
    client = new Redis(redisUrl, { maxRetriesPerRequest: 3 });
  }
  return client;
}

export interface HandoffTokenPayload {
  userId: string;
  conversationId: string;
  tenantId: string;
  redeemed: boolean;
}

export async function setToken(
  redis: Redis,
  key: string,
  payload: HandoffTokenPayload,
  ttlSeconds: number = HANDOFF_TOKEN_TTL,
): Promise<void> {
  await redis.setex(key, ttlSeconds, JSON.stringify(payload));
}

export async function redeemToken(redis: Redis, key: string): Promise<HandoffTokenPayload | null> {
  const script = `
    local v = redis.call('GET', KEYS[1])
    if not v then return nil end
    redis.call('DEL', KEYS[1])
    return v
  `;
  const result = await redis.eval(script, 1, key);
  if (typeof result !== 'string') return null;
  try {
    const payload = JSON.parse(result) as HandoffTokenPayload;
    if (payload.redeemed) return null;
    return payload;
  } catch {
    return null;
  }
}
