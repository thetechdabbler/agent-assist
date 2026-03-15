import type { Goal as PrismaGoal } from '@prisma/client';
export type { PrismaGoal as Goal };

export enum GoalType {
  DIRECTIVE = 'directive',
  SCHEDULED = 'scheduled',
}
