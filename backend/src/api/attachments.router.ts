import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../middleware/auth';
import { prisma } from '../db/client';
import * as storageService from '../services/storage.service';
import { randomUUID } from 'crypto';

const DEFAULT_MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
const DEFAULT_ALLOWED_MIME = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/csv',
];

function getUploadLimits(
  tenantId: string,
): Promise<{ maxSizeBytes: number; allowedMimeTypes: string[] }> {
  return prisma.tenant
    .findUnique({ where: { id: tenantId } })
    .then((t: { configJson?: unknown } | null) => {
      const config = (
        t?.configJson as { uploadLimits?: { maxSizeBytes?: number; allowedMimeTypes?: string[] } }
      )?.uploadLimits;
      return {
        maxSizeBytes: config?.maxSizeBytes ?? DEFAULT_MAX_SIZE_BYTES,
        allowedMimeTypes: config?.allowedMimeTypes ?? DEFAULT_ALLOWED_MIME,
      };
    });
}

export async function registerAttachmentsRouter(app: FastifyInstance): Promise<void> {
  app.post<{
    Params: { id: string; msgId: string };
    Body?: unknown;
  }>('/api/conversations/:id/messages/:msgId/attachments', async (request, reply) => {
    const auth = requireAuth(request);
    const { id: conversationId, msgId } = request.params;
    const conv = await prisma.conversation.findFirst({
      where: { id: conversationId, tenantId: auth.tenantId },
    });
    if (!conv || conv.ownerUserId !== auth.userId)
      return reply.status(404).send({ error: 'not_found' });
    const message = await prisma.message.findFirst({
      where: { id: msgId, conversationId },
    });
    if (!message) return reply.status(404).send({ error: 'not_found' });
    const limits = await getUploadLimits(auth.tenantId);
    const body = request.body as
      | { filename?: string; mimeType?: string; sizeBytes?: number; content?: string }
      | undefined;
    const filename = body?.filename ?? 'upload';
    const mimeType = body?.mimeType ?? 'application/octet-stream';
    const sizeBytes = body?.sizeBytes ?? 0;
    const content = body?.content;
    if (sizeBytes > limits.maxSizeBytes) {
      return reply.status(422).send({
        error: 'validation_failed',
        code: 'file_too_large',
        maxSizeBytes: limits.maxSizeBytes,
      });
    }
    if (!limits.allowedMimeTypes.includes(mimeType)) {
      return reply.status(422).send({
        error: 'validation_failed',
        code: 'mime_not_allowed',
        allowedMimeTypes: limits.allowedMimeTypes,
      });
    }
    const key = `attachments/${auth.tenantId}/${conversationId}/${randomUUID()}-${filename}`;
    const buffer = content ? Buffer.from(content, 'base64') : Buffer.alloc(0);
    await storageService.uploadFile(key, buffer, mimeType);
    await storageService.triggerVirusScan(key);
    const attachment = await prisma.attachment.create({
      data: {
        conversationId,
        messageId: msgId,
        storageKey: key,
        filename,
        mimeType,
        sizeBytes: BigInt(buffer.length),
        malwareScanStatus: 'pending',
      },
    });
    return reply.status(201).send({
      id: attachment.id,
      storageKey: key,
      filename: attachment.filename,
      mimeType: attachment.mimeType,
      sizeBytes: Number(attachment.sizeBytes),
      malwareScanStatus: attachment.malwareScanStatus,
    });
  });
}
