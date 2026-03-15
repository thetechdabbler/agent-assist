import retry from 'async-retry';
import { prisma } from '../db/client';
import * as messageService from './message.service';
import * as notificationService from './notification.service';
import { getAgentAdapter } from '../plugins/registry';
import { transition } from '../domain/job-state-machine';

export interface FormRequestSchema {
  formSchema: Record<string, unknown>;
  uiSchema?: Record<string, unknown>;
  prompt?: string;
  submitAction: string;
}

export interface CreateFormRequestInput {
  jobId: string;
  conversationId: string;
  tenantId: string;
  schema: FormRequestSchema;
  correlationId?: string | null;
}

export async function createFormRequest(input: CreateFormRequestInput): Promise<{
  formRequestId: string;
  messageId: string;
}> {
  const job = await prisma.job.findFirst({
    where: {
      id: input.jobId,
      conversationId: input.conversationId,
      tenantId: input.tenantId,
      status: 'waiting_for_input',
    },
  });
  if (!job) throw new Error('job_not_found_or_not_waiting');

  const message = await messageService.appendMessage({
    conversationId: input.conversationId,
    sourceType: 'agent',
    type: 'form_request',
    payloadJson: {
      jobId: input.jobId,
      formRequestId: '', // set after we have id
      formSchema: input.schema.formSchema,
      uiSchema: input.schema.uiSchema ?? null,
      prompt: input.schema.prompt ?? null,
      submitAction: input.schema.submitAction,
    },
    correlationId: input.correlationId ?? null,
  });

  const formRequest = await prisma.formRequest.create({
    data: {
      jobId: input.jobId,
      conversationId: input.conversationId,
      messageId: message.id,
    },
  });

  await prisma.message.update({
    where: { id: message.id },
    data: {
      payloadJson: {
        ...(message.payloadJson as Record<string, unknown>),
        formRequestId: formRequest.id,
      } as object,
    },
  });

  return { formRequestId: formRequest.id, messageId: message.id };
}

export type SubmitFormResponseResult =
  | { ok: true }
  | { ok: false; conflict: true }
  | { ok: false; error: string };

export async function submitFormResponse(
  jobId: string,
  tenantId: string,
  payload: Record<string, unknown>,
  opts?: { userId?: string; attachments?: unknown[] },
): Promise<SubmitFormResponseResult> {
  const formRequest = await prisma.formRequest.findFirst({
    where: { jobId, resolvedAt: null },
    include: { job: true, conversation: true },
  });
  if (!formRequest) return { ok: false, conflict: true };
  if (formRequest.job.status !== 'waiting_for_input') return { ok: false, conflict: true };
  if (formRequest.job.tenantId !== tenantId) return { ok: false, error: 'forbidden' };

  const transitionResult = await transition(jobId, 'running', {
    correlationId: undefined,
    userId: opts?.userId,
  });
  if (!transitionResult.ok)
    return { ok: false, error: transitionResult.error ?? 'transition_failed' };

  await prisma.formRequest.update({
    where: { id: formRequest.id },
    data: { resolvedAt: new Date() },
  });

  const adapter = await getAgentAdapter(tenantId);
  const submitFormInput =
    adapter &&
    typeof (adapter as unknown as { submitFormInput?: (r: unknown) => Promise<void> })
      .submitFormInput === 'function'
      ? (adapter as unknown as { submitFormInput: (r: unknown) => Promise<void> }).submitFormInput
      : null;

  if (submitFormInput) {
    try {
      await retry(
        async () => {
          await submitFormInput({
            jobId,
            tenantId,
            formResponse: payload,
            attachments: opts?.attachments ?? [],
          });
        },
        { retries: 3, factor: 2, minTimeout: 500, maxTimeout: 5000 },
      );
    } catch {
      await transition(jobId, 'failed', {
        errorCode: 'submission_delivery_failed',
        errorSummary: 'Form response could not be delivered to the agent after 3 attempts.',
        userId: opts?.userId,
      });
      const conv = await prisma.conversation.findUnique({
        where: { id: formRequest.conversationId },
        select: { ownerUserId: true },
      });
      if (conv?.ownerUserId) {
        await notificationService.create({
          userId: conv.ownerUserId,
          tenantId,
          category: 'failure',
          title: 'Form submission failed',
          body: 'The agent could not receive your form response. The job has been marked failed.',
          jobId,
          conversationId: formRequest.conversationId,
        });
      }
      return { ok: false, error: 'submission_delivery_failed' };
    }
  }

  return { ok: true };
}
