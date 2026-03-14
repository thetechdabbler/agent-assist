import { prisma } from '../db/client';
import { getIO } from '../realtime/event-bus';
import { agentAssistNotificationDeliveryLatencySeconds } from '../observability/metrics';

export type NotificationCategory =
  | 'informational'
  | 'success'
  | 'action_required'
  | 'warning'
  | 'failure';

export interface CreateNotificationInput {
  userId: string;
  tenantId: string;
  category: NotificationCategory;
  title: string;
  body?: string | null;
  conversationId?: string | null;
  jobId?: string | null;
  artifactId?: string | null;
}

export async function create(input: CreateNotificationInput): Promise<{
  id: string;
  userId: string;
  title: string;
  category: string;
  isRead: boolean;
  createdAt: Date;
}> {
  const start = Date.now();
  const n = await prisma.notification.create({
    data: {
      userId: input.userId,
      tenantId: input.tenantId,
      category: input.category,
      title: input.title,
      body: input.body ?? null,
      conversationId: input.conversationId ?? null,
      jobId: input.jobId ?? null,
      artifactId: input.artifactId ?? null,
    },
  });
  const io = getIO();
  const payload = {
    id: n.id,
    userId: n.userId,
    tenantId: n.tenantId,
    category: n.category,
    title: n.title,
    body: n.body,
    jobId: n.jobId,
    conversationId: n.conversationId,
    createdAt: n.createdAt.toISOString(),
  };
  io?.to(`user:${input.userId}`).emit('notification.created', payload);
  const latencySec = (Date.now() - start) / 1000;
  agentAssistNotificationDeliveryLatencySeconds.record(latencySec, {
    tenant_id: input.tenantId,
    channel: 'in_app',
  });
  return {
    id: n.id,
    userId: n.userId,
    title: n.title,
    category: n.category,
    isRead: n.isRead,
    createdAt: n.createdAt,
  };
}

export async function markDelivered(notificationId: string, tenantId: string): Promise<boolean> {
  const r = await prisma.notification.updateMany({
    where: { id: notificationId, tenantId },
    data: { deliveredAt: new Date() },
  });
  return r.count > 0;
}

export async function markSeen(notificationId: string, userId: string): Promise<boolean> {
  const r = await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { isRead: true },
  });
  return r.count > 0;
}

export async function markAcknowledged(notificationId: string, userId: string): Promise<boolean> {
  const r = await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { acknowledgedAt: new Date(), isRead: true },
  });
  return r.count > 0;
}

export async function listUnread(userId: string): Promise<
  {
    id: string;
    category: string;
    title: string;
    body: string | null;
    jobId: string | null;
    conversationId: string | null;
    createdAt: Date;
  }[]
> {
  const list = await prisma.notification.findMany({
    where: { userId, isRead: false },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      category: true,
      title: true,
      body: true,
      jobId: true,
      conversationId: true,
      createdAt: true,
    },
  });
  return list;
}

export async function countUnread(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, isRead: false } });
}
