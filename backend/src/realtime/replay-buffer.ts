import type { Redis } from 'ioredis';
import type { DomainEvent } from './event-bus';

const REPLAY_TTL = 300;
const REPLAY_PREFIX = 'replay:';

export async function pushToReplay(
  redis: Redis,
  socketId: string,
  event: DomainEvent,
): Promise<void> {
  const key = `${REPLAY_PREFIX}${socketId}`;
  const score = Date.now();
  const value = JSON.stringify(event);
  await redis.zadd(key, score, value);
  await redis.expire(key, REPLAY_TTL);
}

export async function getReplaySince(
  redis: Redis,
  socketId: string,
  since: number,
): Promise<DomainEvent[]> {
  const key = `${REPLAY_PREFIX}${socketId}`;
  const raw = await redis.zrangebyscore(key, since + 1, '+inf');
  return raw.map((s) => JSON.parse(s) as DomainEvent);
}
