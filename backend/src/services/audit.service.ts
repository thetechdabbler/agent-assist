import { prisma } from '../db/client';

export async function logJobTransition(
  jobId: string,
  from: string,
  to: string,
  tenantId: string,
  correlationId?: string,
  userId?: string,
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      tenantId,
      userId: userId ?? null,
      eventType: 'job.status_changed',
      entityType: 'job',
      entityId: jobId,
      beforeState: from,
      afterState: to,
      correlationId: correlationId ?? null,
    },
  });
}

export async function logArtifactAccess(
  artifactId: string,
  userId: string,
  tenantId: string,
  correlationId?: string,
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      eventType: 'artifact.accessed',
      entityType: 'artifact',
      entityId: artifactId,
      correlationId: correlationId ?? null,
    },
  });
}
