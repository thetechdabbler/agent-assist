import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

import Fastify from 'fastify';
import cors from '@fastify/cors';
import { getConfig } from './config';
import { createLogger } from './observability/logger';
import { registerRouter } from './api/router';
import { getRedisClient } from './db/redis';
import { initEventBus } from './realtime/event-bus';
import { startJobTimeoutScheduler } from './domain/job-timeout-scheduler';

async function main() {
  const config = getConfig();
  const log = createLogger(config);

  const app = Fastify({ logger: false });

  await app.register(cors, {
    origin: config.CORS_ORIGIN,
  });

  await registerRouter(app);

  const redis = getRedisClient(config.REDIS_URL);
  const address = await app.listen({ port: config.PORT, host: config.HOST });
  const httpServer = app.server;
  initEventBus(httpServer, redis, redis.duplicate());
  startJobTimeoutScheduler();
  log.info({ port: config.PORT, address }, 'Server listening');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
