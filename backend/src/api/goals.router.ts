import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../middleware/auth';
import { rateLimitMiddleware } from '../middleware/rate-limit';
import { z } from 'zod';
import * as goalService from '../services/goal.service';

const createBodySchema = z.object({
  goalType: z.enum(['directive', 'scheduled']),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  schedule: z.string().optional().nullable(),
  conversationId: z.string().uuid().optional().nullable(),
});

const updateBodySchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  schedule: z.string().optional().nullable(),
});

export async function registerGoalsRouter(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', rateLimitMiddleware);

  app.post<{ Body?: unknown }>('/api/goals', async (request, reply) => {
    const auth = requireAuth(request);
    const body = createBodySchema.safeParse(request.body ?? {});
    if (!body.success)
      return reply.status(422).send({ error: 'validation_failed', details: body.error.flatten() });
    const goal = await goalService.createGoal({
      userId: auth.userId,
      tenantId: auth.tenantId,
      goalType: body.data.goalType,
      title: body.data.title,
      description: body.data.description,
      schedule: body.data.schedule,
      conversationId: body.data.conversationId,
    });
    return reply.status(201).send(goal);
  });

  app.get<{ Querystring: { status?: string; goalType?: string } }>(
    '/api/goals',
    async (request, reply) => {
      const auth = requireAuth(request);
      const { status, goalType } = request.query;
      const list = await goalService.listGoals(auth.userId, auth.tenantId, {
        status: status as goalService.GoalStatus | undefined,
        goalType: goalType as goalService.GoalType | undefined,
      });
      return reply.send({ goals: list });
    },
  );

  app.get<{ Params: { id: string } }>('/api/goals/:id', async (request, reply) => {
    const auth = requireAuth(request);
    const goal = await goalService.getGoal(request.params.id, auth.tenantId, auth.userId);
    if (!goal) return reply.status(404).send({ error: 'not_found' });
    return reply.send(goal);
  });

  app.patch<{ Params: { id: string }; Body?: unknown }>(
    '/api/goals/:id',
    async (request, reply) => {
      const auth = requireAuth(request);
      const body = updateBodySchema.safeParse(request.body ?? {});
      if (!body.success)
        return reply
          .status(422)
          .send({ error: 'validation_failed', details: body.error.flatten() });
      const ok = await goalService.updateGoal(
        request.params.id,
        auth.tenantId,
        auth.userId,
        body.data,
      );
      if (!ok) return reply.status(404).send({ error: 'not_found' });
      return reply.send({ ok: true });
    },
  );

  app.delete<{ Params: { id: string } }>('/api/goals/:id', async (request, reply) => {
    const auth = requireAuth(request);
    const ok = await goalService.cancelGoal(request.params.id, auth.tenantId, auth.userId);
    if (!ok) return reply.status(404).send({ error: 'not_found' });
    return reply.send({ ok: true });
  });

  app.get<{ Params: { id: string } }>('/api/goals/:id/jobs', async (request, reply) => {
    const auth = requireAuth(request);
    const jobs = await goalService.listJobsForGoal(request.params.id, auth.tenantId, auth.userId);
    return reply.send({ jobs });
  });
}
