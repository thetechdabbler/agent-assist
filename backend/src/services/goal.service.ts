import { prisma } from '../db/client';
import { getIO } from '../realtime/event-bus';

export type GoalType = 'directive' | 'scheduled';
export type GoalStatus = 'active' | 'completed' | 'cancelled';

export interface CreateGoalInput {
  userId: string;
  tenantId: string;
  goalType: GoalType;
  title: string;
  description?: string | null;
  schedule?: string | null;
  conversationId?: string | null;
}

export async function createGoal(input: CreateGoalInput): Promise<{
  id: string;
  userId: string;
  tenantId: string;
  goalType: string;
  title: string;
  description: string | null;
  status: string;
  schedule: string | null;
  conversationId: string | null;
  createdAt: Date;
}> {
  const goal = await prisma.goal.create({
    data: {
      userId: input.userId,
      tenantId: input.tenantId,
      goalType: input.goalType,
      title: input.title,
      description: input.description ?? null,
      schedule: input.schedule ?? null,
      conversationId: input.conversationId ?? null,
      status: 'active',
    },
  });
  const io = getIO();
  io?.to(`user:${input.userId}`).emit('goal.created', {
    goalId: goal.id,
    userId: goal.userId,
    tenantId: goal.tenantId,
    goalType: goal.goalType,
    title: goal.title,
    status: goal.status,
  });
  return {
    id: goal.id,
    userId: goal.userId,
    tenantId: goal.tenantId,
    goalType: goal.goalType,
    title: goal.title,
    description: goal.description,
    status: goal.status,
    schedule: goal.schedule,
    conversationId: goal.conversationId,
    createdAt: goal.createdAt,
  };
}

export async function listGoals(
  userId: string,
  tenantId: string,
  opts?: { status?: GoalStatus; goalType?: GoalType },
): Promise<
  {
    id: string;
    goalType: string;
    title: string;
    description: string | null;
    status: string;
    schedule: string | null;
    conversationId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }[]
> {
  const where: { userId: string; tenantId: string; status?: string; goalType?: string } = {
    userId,
    tenantId,
  };
  if (opts?.status) where.status = opts.status;
  if (opts?.goalType) where.goalType = opts.goalType;
  const goals = await prisma.goal.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      goalType: true,
      title: true,
      description: true,
      status: true,
      schedule: true,
      conversationId: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return goals;
}

export async function getActiveDirectiveGoals(
  userId: string,
): Promise<{ id: string; title: string; description: string | null }[]> {
  const goals = await prisma.goal.findMany({
    where: { userId, goalType: 'directive', status: 'active' },
    select: { id: true, title: true, description: true },
    orderBy: { updatedAt: 'desc' },
  });
  return goals;
}

export async function getGoal(
  goalId: string,
  tenantId: string,
  userId: string,
): Promise<{
  id: string;
  goalType: string;
  title: string;
  description: string | null;
  status: string;
  schedule: string | null;
  conversationId: string | null;
  createdAt: Date;
  updatedAt: Date;
} | null> {
  const goal = await prisma.goal.findFirst({
    where: { id: goalId, tenantId, userId },
    select: {
      id: true,
      goalType: true,
      title: true,
      description: true,
      status: true,
      schedule: true,
      conversationId: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return goal;
}

export async function updateGoal(
  goalId: string,
  tenantId: string,
  userId: string,
  updates: { title?: string; description?: string | null; schedule?: string | null },
): Promise<boolean> {
  const goal = await prisma.goal.findFirst({
    where: { id: goalId, tenantId, userId },
  });
  if (!goal) return false;
  await prisma.goal.update({
    where: { id: goalId },
    data: {
      ...(updates.title != null && { title: updates.title }),
      ...(updates.description !== undefined && { description: updates.description }),
      ...(updates.schedule !== undefined && { schedule: updates.schedule }),
    },
  });
  const io = getIO();
  io?.to(`user:${userId}`).emit('goal.updated', {
    goalId,
    userId,
    tenantId,
    updates,
  });
  return true;
}

export async function cancelGoal(
  goalId: string,
  tenantId: string,
  userId: string,
): Promise<boolean> {
  const goal = await prisma.goal.findFirst({
    where: { id: goalId, tenantId, userId },
  });
  if (!goal) return false;
  await prisma.goal.update({
    where: { id: goalId },
    data: { status: 'cancelled' },
  });
  const io = getIO();
  io?.to(`user:${userId}`).emit('goal.cancelled', {
    goalId,
    userId,
    tenantId,
  });
  return true;
}

export async function listJobsForGoal(
  goalId: string,
  tenantId: string,
  userId: string,
): Promise<
  {
    id: string;
    jobType: string;
    status: string;
    progressPercent: number | null;
    startedAt: Date | null;
    completedAt: Date | null;
    errorCode: string | null;
    errorSummary: string | null;
    conversationId: string;
    createdAt: Date;
  }[]
> {
  const goal = await prisma.goal.findFirst({
    where: { id: goalId, tenantId, userId },
    select: { id: true },
  });
  if (!goal) return [];
  const jobs = await prisma.job.findMany({
    where: { goalId, tenantId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      jobType: true,
      status: true,
      progressPercent: true,
      startedAt: true,
      completedAt: true,
      errorCode: true,
      errorSummary: true,
      conversationId: true,
      createdAt: true,
    },
  });
  return jobs;
}
