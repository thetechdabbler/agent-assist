import { prisma } from '../db/client';
import { publishToConversation } from '../realtime/event-bus';
import { getCorrelationId } from '../middleware/correlation-id';
import type { FastifyRequest } from 'fastify';
import { indexDocumentFireAndForget, updateDocumentFireAndForget } from './search-indexer.service';

const DEFAULT_TITLE = 'New conversation';

export async function createConversation(
  ownerUserId: string,
  tenantId: string,
  title?: string | null,
  request?: FastifyRequest,
  agentId?: string | null,
): Promise<{
  id: string;
  title: string | null;
  status: string;
  createdAt: Date;
  agentId?: string | null;
}> {
  if (agentId) {
    const allowed = await prisma.tenantPlugin.findFirst({
      where: {
        tenantId,
        pluginId: agentId,
        enabled: true,
      },
      include: { plugin: true },
    });
    if (!allowed || allowed.plugin.pluginType !== 'agent_adapter') {
      throw new Error('Invalid or disabled agent for this tenant');
    }
  }
  const conv = await prisma.conversation.create({
    data: {
      title: title ?? DEFAULT_TITLE,
      ownerUserId,
      tenantId,
      status: 'active',
      ...(agentId ? { agentId } : {}),
    },
  });
  const correlationId = request ? getCorrelationId(request) : undefined;
  publishToConversation(conv.id, {
    eventType: 'conversation.created',
    conversationId: conv.id,
    tenantId,
    payload: { id: conv.id, title: conv.title, ownerUserId, tenantId },
    correlationId,
  });
  indexDocumentFireAndForget('conversations', conv.id, {
    tenant_id: tenantId,
    title: conv.title ?? '',
    owner_user_id: ownerUserId,
    status: conv.status,
    updated_at: conv.updatedAt.toISOString(),
  });
  return {
    id: conv.id,
    title: conv.title,
    status: conv.status,
    createdAt: conv.createdAt,
    agentId: conv.agentId ?? undefined,
  };
}

export async function listByUser(
  ownerUserId: string,
  tenantId: string,
  status?: 'active' | 'archived',
): Promise<{ id: string; title: string | null; status: string; updatedAt: Date }[]> {
  const list = await prisma.conversation.findMany({
    where: { ownerUserId, tenantId, ...(status ? { status } : {}) },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, title: true, status: true, updatedAt: true },
  });
  return list;
}

export async function getById(
  conversationId: string,
  tenantId: string,
  ownerUserId: string,
): Promise<{
  id: string;
  title: string | null;
  status: string;
  ownerUserId: string;
  tenantId: string;
  messages?: {
    id: string;
    sourceType: string;
    type: string;
    payloadJson: unknown;
    createdAt: Date;
  }[];
} | null> {
  const conv = await prisma.conversation.findFirst({
    where: { id: conversationId, tenantId },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
        take: 50,
        select: { id: true, sourceType: true, type: true, payloadJson: true, createdAt: true },
      },
    },
  });
  if (!conv || conv.ownerUserId !== ownerUserId) return null;
  return {
    id: conv.id,
    title: conv.title,
    status: conv.status,
    ownerUserId: conv.ownerUserId,
    tenantId: conv.tenantId,
    messages: conv.messages,
  };
}

export async function updateTitle(
  conversationId: string,
  tenantId: string,
  ownerUserId: string,
  title: string,
): Promise<boolean> {
  const updated = await prisma.conversation.updateMany({
    where: { id: conversationId, tenantId, ownerUserId },
    data: { title },
  });
  if (updated.count > 0) {
    const conv = await prisma.conversation.findFirst({
      where: { id: conversationId },
      select: { status: true, updatedAt: true },
    });
    if (conv) {
      updateDocumentFireAndForget('conversations', conversationId, {
        tenant_id: tenantId,
        title,
        owner_user_id: ownerUserId,
        status: conv.status,
        updated_at: conv.updatedAt.toISOString(),
      });
    }
  }
  return updated.count > 0;
}

export async function archive(
  conversationId: string,
  tenantId: string,
  ownerUserId: string,
): Promise<boolean> {
  const updated = await prisma.conversation.updateMany({
    where: { id: conversationId, tenantId, ownerUserId },
    data: { status: 'archived' },
  });
  if (updated.count > 0) {
    const conv = await prisma.conversation.findFirst({
      where: { id: conversationId },
      select: { title: true, updatedAt: true },
    });
    if (conv) {
      updateDocumentFireAndForget('conversations', conversationId, {
        tenant_id: tenantId,
        title: conv.title ?? '',
        owner_user_id: ownerUserId,
        status: 'archived',
        updated_at: conv.updatedAt.toISOString(),
      });
    }
  }
  return updated.count > 0;
}
