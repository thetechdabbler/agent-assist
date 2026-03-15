import type { FastifyRequest, FastifyReply } from 'fastify';
import type { Prisma } from '@prisma/client';
import { prisma } from '../db/client';

export async function tenantContextMiddleware(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  const auth = request.auth;
  if (!auth) return;
  (request as FastifyRequest & { tenantId: string }).tenantId = auth.tenantId;
}

export function getTenantId(request: FastifyRequest): string | undefined {
  return (request as FastifyRequest & { tenantId?: string }).tenantId;
}

export async function enforceTenantIsolation(): Promise<void> {
  prisma.$use(
    async (
      params: Prisma.MiddlewareParams,
      next: (params: Prisma.MiddlewareParams) => Promise<unknown>,
    ) => {
      const args = params.args ?? {};
      if (
        typeof args === 'object' &&
        'where' in args &&
        args.where &&
        typeof args.where === 'object'
      ) {
        const tenantId = (global as unknown as { __requestTenantId?: string }).__requestTenantId;
        if (tenantId && !('tenantId' in args.where)) {
          const model = params.model;
          const tenantScoped = [
            'Conversation',
            'Message',
            'Goal',
            'Job',
            'Artifact',
            'Notification',
            'TenantPlugin',
            'AuditLog',
            'User',
            'Attachment',
          ];
          if (model && tenantScoped.includes(model)) {
            (args.where as Record<string, string>).tenantId = tenantId;
          }
        }
      }
      return next(params);
    },
  );
}
