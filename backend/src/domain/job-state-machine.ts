import { prisma } from '../db/client';
import * as auditService from '../services/audit.service';
import { getIO } from '../realtime/event-bus';
import { agentAssistJobCount } from '../observability/metrics';

export const JOB_STATUSES = [
  'scheduled',
  'queued',
  'running',
  'waiting_for_input',
  'completed',
  'failed',
] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

const VALID_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  scheduled: ['queued', 'failed'],
  queued: ['running', 'failed'],
  running: ['waiting_for_input', 'completed', 'failed'],
  waiting_for_input: ['running', 'failed'],
  completed: [],
  failed: ['scheduled'],
};

export function canTransition(from: JobStatus, to: JobStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export interface TransitionResult {
  ok: boolean;
  error?: string;
}

export async function transition(
  jobId: string,
  to: JobStatus,
  opts?: {
    errorCode?: string;
    errorSummary?: string;
    correlationId?: string;
    userId?: string;
  },
): Promise<TransitionResult> {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) return { ok: false, error: 'job_not_found' };
  const from = job.status as JobStatus;
  if (!JOB_STATUSES.includes(from)) return { ok: false, error: 'invalid_from_status' };
  if (!canTransition(from, to)) return { ok: false, error: 'invalid_transition' };

  const now = new Date();
  const updateData: {
    status: string;
    errorCode?: string;
    errorSummary?: string;
    startedAt?: Date;
    completedAt?: Date;
    retryCount?: number;
  } = { status: to };
  if (opts?.errorCode != null) updateData.errorCode = opts.errorCode;
  if (opts?.errorSummary != null) updateData.errorSummary = opts.errorSummary;
  if (to === 'running' && !job.startedAt) updateData.startedAt = now;
  if (to === 'completed' || to === 'failed') updateData.completedAt = now;
  if (to === 'scheduled' && from === 'failed') updateData.retryCount = job.retryCount + 1;

  await prisma.job.update({
    where: { id: jobId },
    data: updateData,
  });

  await auditService.logJobTransition(
    jobId,
    from,
    to,
    job.tenantId,
    opts?.correlationId,
    opts?.userId,
  );

  const conversation = await prisma.conversation.findUnique({
    where: { id: job.conversationId },
    select: { ownerUserId: true },
  });
  const payload = {
    jobId,
    from,
    to,
    tenantId: job.tenantId,
    conversationId: job.conversationId,
    ...(opts?.errorCode && { errorCode: opts.errorCode }),
    ...(opts?.errorSummary && { errorSummary: opts.errorSummary }),
  };
  const io = getIO();
  if (conversation?.ownerUserId) {
    io?.to(`user:${conversation.ownerUserId}`).emit('job.status_changed', payload);
  }

  agentAssistJobCount.add(1, { status: to });
  agentAssistJobCount.add(-1, { status: from });

  return { ok: true };
}
