import { prisma } from '../db/client';
import * as stateMachine from './job-state-machine';
import * as notificationService from '../services/notification.service';

const DEFAULT_INPUT_TIMEOUT_SECONDS = 86400; // 24 h
const CHECK_INTERVAL_MS = 60_000; // 60 s

async function getTenantTimeoutSeconds(tenantId: string): Promise<number> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { configJson: true },
  });
  const config = tenant?.configJson as { inputTimeoutSeconds?: number } | null;
  return config?.inputTimeoutSeconds ?? DEFAULT_INPUT_TIMEOUT_SECONDS;
}

export function startJobTimeoutScheduler(): NodeJS.Timeout {
  return setInterval(async () => {
    try {
      const jobs = await prisma.job.findMany({
        where: { status: 'waiting_for_input' },
        select: { id: true, tenantId: true, conversationId: true, updatedAt: true },
      });
      const now = Date.now();
      for (const job of jobs) {
        const timeoutSec = await getTenantTimeoutSeconds(job.tenantId);
        const deadline = job.updatedAt.getTime() + timeoutSec * 1000;
        if (now >= deadline) {
          const result = await stateMachine.transition(job.id, 'failed', {
            errorCode: 'input_timeout',
            errorSummary: 'Job timed out waiting for user input',
          });
          if (result.ok) {
            const conv = await prisma.conversation.findUnique({
              where: { id: job.conversationId },
              select: { ownerUserId: true },
            });
            if (conv?.ownerUserId) {
              await notificationService.create({
                userId: conv.ownerUserId,
                tenantId: job.tenantId,
                category: 'failure',
                title: 'Job timed out',
                body: 'The job timed out waiting for input.',
                jobId: job.id,
                conversationId: job.conversationId,
              });
            }
          }
        }
      }
    } catch (err) {
      console.error('job-timeout-scheduler:', err);
    }
  }, CHECK_INTERVAL_MS);
}
