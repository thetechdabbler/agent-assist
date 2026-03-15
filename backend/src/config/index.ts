import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().default('4000').transform(Number),
  HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error']).default('info'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
  OPENSEARCH_URL: z.string().url().optional(),

  S3_ENDPOINT: z.string().url().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().default('us-east-1'),

  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  NEXTAUTH_SECRET: z.string().min(1, 'NEXTAUTH_SECRET is required'),
  NEXTAUTH_URL: z.string().url().optional(),

  AGENT_GATEWAY_TIMEOUT_MS: z.string().default('30000').transform(Number),
  AGENT_GATEWAY_RATE_LIMIT_PER_USER: z.string().default('60').transform(Number),
  AGENT_GATEWAY_RATE_LIMIT_PER_TENANT: z.string().default('1000').transform(Number),
  AGENT_GATEWAY_URL: z.string().url().optional(),

  CORS_ORIGIN: z.string().default('http://localhost:3000'),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function getConfig(): Env {
  if (cached) return cached;
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const msg = result.error.flatten().fieldErrors;
    throw new Error(`Invalid environment: ${JSON.stringify(msg)}`);
  }
  cached = result.data;
  return cached;
}
