import { prisma } from '../db/client';

const DEFAULT_VERSION = '1.0';

export interface AppendMessageInput {
  conversationId: string;
  sourceType: 'user' | 'agent' | 'system';
  type: string;
  payloadJson: Record<string, unknown>;
  correlationId?: string | null;
}

export async function appendMessage(input: AppendMessageInput): Promise<{
  id: string;
  conversationId: string;
  sourceType: string;
  type: string;
  version: string;
  payloadJson: Record<string, unknown>;
  correlationId: string | null;
  createdAt: Date;
}> {
  const msg = await prisma.message.create({
    data: {
      conversationId: input.conversationId,
      sourceType: input.sourceType,
      type: input.type,
      version: DEFAULT_VERSION,
      payloadJson: input.payloadJson as object,
      correlationId: input.correlationId ?? null,
    },
  });
  return {
    id: msg.id,
    conversationId: msg.conversationId,
    sourceType: msg.sourceType,
    type: msg.type,
    version: msg.version,
    payloadJson: msg.payloadJson as Record<string, unknown>,
    correlationId: msg.correlationId,
    createdAt: msg.createdAt,
  };
}

export async function listByConversation(
  conversationId: string,
  tenantId: string,
  opts?: { cursor?: string; limit?: number },
): Promise<{
  messages: {
    id: string;
    sourceType: string;
    type: string;
    version: string;
    payloadJson: unknown;
    correlationId: string | null;
    createdAt: Date;
  }[];
  nextCursor: string | null;
}> {
  const limit = Math.min(opts?.limit ?? 50, 100);
  const cursorId = opts?.cursor;
  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
    take: limit + 1,
    cursor: cursorId ? { id: cursorId } : undefined,
    skip: cursorId ? 1 : 0,
    select: {
      id: true,
      sourceType: true,
      type: true,
      version: true,
      payloadJson: true,
      correlationId: true,
      createdAt: true,
    },
  });
  const hasMore = messages.length > limit;
  const list = hasMore ? messages.slice(0, limit) : messages;
  const nextCursor = hasMore && list.length > 0 ? list[list.length - 1].id : null;
  return {
    messages: list,
    nextCursor,
  };
}
