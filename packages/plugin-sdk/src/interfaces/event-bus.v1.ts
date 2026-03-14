/**
 * Event Bus Contract — Version 1.0
 * Canonical types (see specs/001-agent-chat-workspace/contracts/event-bus.v1.ts).
 */

export const EVENT_BUS_CONTRACT_VERSION = '1.0';

export interface AgentEvent<T = Record<string, unknown>> {
  eventType: AgentEventType;
  version: typeof EVENT_BUS_CONTRACT_VERSION;
  jobId: string;
  conversationId: string;
  tenantId: string;
  correlationId: string;
  timestamp: string;
  payload: T;
}

export type AgentEventType =
  | 'turn.started'
  | 'turn.delta'
  | 'turn.completed'
  | 'job.created'
  | 'job.scheduled'
  | 'job.started'
  | 'job.progress'
  | 'job.waiting_for_input'
  | 'job.completed'
  | 'job.failed'
  | 'artifact.created'
  | 'notification.created';

export interface TurnStartedPayload {
  message?: string;
}

export interface TurnDeltaPayload {
  delta: string;
  index?: number;
}

export interface TurnCompletedPayload {
  finalText?: string;
}

export interface JobCreatedPayload {
  externalJobRef: string;
  jobType: string;
  label?: string;
  scheduledAt?: string;
}

export interface JobScheduledPayload {
  scheduledAt: string;
  label?: string;
}

export interface JobStartedPayload {
  startedAt: string;
}

export interface JobProgressPayload {
  percent: number;
  statusMessage?: string;
}

export interface JobWaitingForInputPayload {
  formSchema: Record<string, unknown>;
  uiSchema?: Record<string, unknown>;
  prompt?: string;
}

export interface JobCompletedPayload {
  completedAt: string;
  summary?: string;
}

export interface JobFailedPayload {
  errorCode: string;
  errorMessage: string;
  retryable: boolean;
  failedAt: string;
}

export interface ArtifactCreatedPayload {
  artifactId: string;
  title: string;
  type: 'table' | 'chart' | 'file' | 'image' | 'text';
  version: string;
  payload: Record<string, unknown>;
  storageUri?: string;
}

export type NotificationCategory =
  | 'informational'
  | 'success'
  | 'action_required'
  | 'warning'
  | 'failure';

export interface NotificationCreatedPayload {
  category: NotificationCategory;
  title: string;
  body?: string;
  artifactId?: string;
}

export interface AgentEventMap {
  'turn.started': AgentEvent<TurnStartedPayload>;
  'turn.delta': AgentEvent<TurnDeltaPayload>;
  'turn.completed': AgentEvent<TurnCompletedPayload>;
  'job.created': AgentEvent<JobCreatedPayload>;
  'job.scheduled': AgentEvent<JobScheduledPayload>;
  'job.started': AgentEvent<JobStartedPayload>;
  'job.progress': AgentEvent<JobProgressPayload>;
  'job.waiting_for_input': AgentEvent<JobWaitingForInputPayload>;
  'job.completed': AgentEvent<JobCompletedPayload>;
  'job.failed': AgentEvent<JobFailedPayload>;
  'artifact.created': AgentEvent<ArtifactCreatedPayload>;
  'notification.created': AgentEvent<NotificationCreatedPayload>;
}
