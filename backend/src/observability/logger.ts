import pino from 'pino';
import type { Env } from '../config';

export function createLogger(env: Env) {
  return pino({
    level: env.LOG_LEVEL,
    ...(env.NODE_ENV === 'development' && {
      transport: { target: 'pino-pretty', options: { colorize: true } },
    }),
    base: undefined,
    formatters: {
      level: (label) => ({ level: label }),
    },
  }).child({ service: 'agent-assist-backend' });
}

export type Logger = pino.Logger;

export function withContext(
  log: Logger,
  ctx: { correlationId?: string; tenantId?: string; userId?: string },
) {
  return log.child(ctx);
}
