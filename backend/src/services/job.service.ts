import { prisma } from '../db/client';
import { getIO } from '../realtime/event-bus';
import * as stateMachine from '../domain/job-state-machine';
import type { TransitionResult } from '../domain/job-state-machine';
import { indexDocumentFireAndForget } from './search-indexer.service';

async function resolveGoalId(
  goalId: string | null | undefined,
  tenantId: string,
): Promise<string | null> {
  if (!goalId) return null;
  const goal = await prisma.goal.findFirst({
    where: { id: goalId, tenantId },
    select: { status: true },
  });
  if (!goal || goal.status === 'cancelled') return null;
  return goalId;
}

export interface CreateJobInput {
  conversationId: string;
  tenantId: string;
  goalId?: string | null;
  jobType: string;
  externalJobRef?: string | null;
  scheduleAt?: Date | null;
}

export async function createJob(input: CreateJobInput): Promise<{
  id: string;
  conversationId: string;
  tenantId: string;
  jobType: string;
  status: string;
  createdAt: Date;
}> {
  const effectiveGoalId = await resolveGoalId(input.goalId, input.tenantId);
  const job = await prisma.job.create({
    data: {
      conversationId: input.conversationId,
      tenantId: input.tenantId,
      goalId: effectiveGoalId,
      jobType: input.jobType,
      externalJobRef: input.externalJobRef ?? null,
      status: 'scheduled',
      scheduleAt: input.scheduleAt ?? null,
    },
  });
  const conversation = await prisma.conversation.findUnique({
    where: { id: job.conversationId },
    select: { ownerUserId: true },
  });
  const payload = {
    jobId: job.id,
    conversationId: job.conversationId,
    tenantId: job.tenantId,
    jobType: job.jobType,
    status: job.status,
  };
  const io = getIO();
  if (conversation?.ownerUserId) {
    io?.to(`user:${conversation.ownerUserId}`).emit('job.created', payload);
  }
  indexDocumentFireAndForget('jobs', job.id, {
    tenant_id: job.tenantId,
    conversation_id: job.conversationId,
    job_type: job.jobType,
    status: job.status,
    error_summary: job.errorSummary ?? '',
    updated_at: job.updatedAt.toISOString(),
  });
  return {
    id: job.id,
    conversationId: job.conversationId,
    tenantId: job.tenantId,
    jobType: job.jobType,
    status: job.status,
    createdAt: job.createdAt,
  };
}

export async function listJobs(
  tenantId: string,
  opts?: { userId?: string; status?: string },
): Promise<
  {
    id: string;
    conversationId: string;
    jobType: string;
    status: string;
    progressPercent: number | null;
    startedAt: Date | null;
    completedAt: Date | null;
    errorCode: string | null;
    errorSummary: string | null;
    createdAt: Date;
  }[]
> {
  const where: { tenantId: string; status?: string } = { tenantId };
  if (opts?.status) where.status = opts.status;
  const jobs = await prisma.job.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true,
      conversationId: true,
      jobType: true,
      status: true,
      progressPercent: true,
      startedAt: true,
      completedAt: true,
      errorCode: true,
      errorSummary: true,
      createdAt: true,
    },
  });
  if (opts?.userId) {
    const convIds = await prisma.conversation
      .findMany({
        where: { ownerUserId: opts.userId, tenantId },
        select: { id: true },
      })
      .then((c: { id: string }[]) => c.map((x: { id: string }) => x.id));
    return jobs.filter((j: { conversationId: string }) => convIds.includes(j.conversationId));
  }
  return jobs;
}

export async function getJob(
  jobId: string,
  tenantId: string,
): Promise<{
  id: string;
  conversationId: string;
  goalId: string | null;
  jobType: string;
  status: string;
  progressPercent: number | null;
  scheduleAt: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  errorCode: string | null;
  errorSummary: string | null;
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
} | null> {
  const job = await prisma.job.findFirst({
    where: { id: jobId, tenantId },
  });
  if (!job) return null;
  return {
    id: job.id,
    conversationId: job.conversationId,
    goalId: job.goalId,
    jobType: job.jobType,
    status: job.status,
    progressPercent: job.progressPercent,
    scheduleAt: job.scheduleAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    errorCode: job.errorCode,
    errorSummary: job.errorSummary,
    retryCount: job.retryCount,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}

export async function retryJob(
  jobId: string,
  tenantId: string,
  userId?: string,
): Promise<TransitionResult> {
  const job = await prisma.job.findFirst({ where: { id: jobId, tenantId } });
  if (!job) return { ok: false, error: 'job_not_found' };
  if (job.status !== 'failed') return { ok: false, error: 'only_failed_can_retry' };
  return stateMachine.transition(jobId, 'scheduled', { userId });
}

export async function rerunJob(
  jobId: string,
  tenantId: string,
  _userId?: string,
): Promise<{ id: string } | null> {
  const job = await prisma.job.findFirst({ where: { id: jobId, tenantId } });
  if (!job) return null;
  const created = await createJob({
    conversationId: job.conversationId,
    tenantId: job.tenantId,
    goalId: job.goalId,
    jobType: job.jobType,
    externalJobRef: job.externalJobRef,
    scheduleAt: job.scheduleAt,
  });
  return { id: created.id };
}

export async function deleteJob(jobId: string, tenantId: string): Promise<boolean> {
  const r = await prisma.job.deleteMany({ where: { id: jobId, tenantId } });
  return r.count > 0;
}
