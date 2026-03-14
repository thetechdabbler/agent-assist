/**
 * Event Bus Contract — Version 1.0
 *
 * All events emitted by external agent systems to the platform MUST conform
 * to these types. The platform publishes selected internal state-change events
 * to the same bus for service-to-service coordination.
 *
 * Every event MUST include the base fields from AgentEvent<T>.
 *
 * Constitution reference: Principle V (Event-Driven by Default), Principle VI (Versioned Contracts)
 */

export const EVENT_BUS_CONTRACT_VERSION = "1.0";

// ─── Base Envelope ────────────────────────────────────────────────────────────

export interface AgentEvent<T = Record<string, unknown>> {
  eventType: AgentEventType;
  version: typeof EVENT_BUS_CONTRACT_VERSION;
  jobId: string;
  conversationId: string;
  tenantId: string;
  correlationId: string;
  timestamp: string; // ISO 8601
  payload: T;
}

// ─── Event Type Registry ──────────────────────────────────────────────────────

export type AgentEventType =
  // Turn (streaming response)
  | "turn.started"
  | "turn.delta"
  | "turn.completed"
  // Job lifecycle
  | "job.created"
  | "job.scheduled"
  | "job.started"
  | "job.progress"
  | "job.waiting_for_input"
  | "job.completed"
  | "job.failed"
  // Artifacts
  | "artifact.created"
  // Notifications
  | "notification.created";

// ─── Payload Types ────────────────────────────────────────────────────────────

export interface TurnStartedPayload {
  message?: string;
}

export interface TurnDeltaPayload {
  delta: string; // Incremental token or text chunk
  index?: number; // Optional sequence number for ordering
}

export interface TurnCompletedPayload {
  finalText?: string;
}

export interface JobCreatedPayload {
  externalJobRef: string;
  jobType: string;
  label?: string;
  scheduledAt?: string; // ISO 8601; present if scheduled
}

export interface JobScheduledPayload {
  scheduledAt: string; // ISO 8601
  label?: string;
}

export interface JobStartedPayload {
  startedAt: string; // ISO 8601
}

export interface JobProgressPayload {
  percent: number; // 0–100
  statusMessage?: string;
}

export interface JobWaitingForInputPayload {
  /** JSON Schema (draft-07) describing the required input */
  formSchema: Record<string, unknown>;
  /** react-jsonschema-form compatible UI hints */
  uiSchema?: Record<string, unknown>;
  /** Human-readable prompt shown above the form */
  prompt?: string;
}

export interface JobCompletedPayload {
  completedAt: string; // ISO 8601
  summary?: string;
}

export interface JobFailedPayload {
  errorCode: string;
  errorMessage: string;
  retryable: boolean;
  failedAt: string; // ISO 8601
}

export interface ArtifactCreatedPayload {
  artifactId: string;
  title: string;
  type: "table" | "chart" | "file" | "image" | "text";
  version: string; // MAJOR.MINOR of the payload schema
  payload: Record<string, unknown>; // Validated by Renderer Contract Service
  storageUri?: string; // Present for file/image types
}

export type NotificationCategory =
  | "informational"
  | "success"
  | "action_required"
  | "warning"
  | "failure";

export interface NotificationCreatedPayload {
  category: NotificationCategory;
  title: string;
  body?: string;
  artifactId?: string; // Link to produced artifact
}

// ─── Typed Event Map ──────────────────────────────────────────────────────────

export interface AgentEventMap {
  "turn.started": AgentEvent<TurnStartedPayload>;
  "turn.delta": AgentEvent<TurnDeltaPayload>;
  "turn.completed": AgentEvent<TurnCompletedPayload>;
  "job.created": AgentEvent<JobCreatedPayload>;
  "job.scheduled": AgentEvent<JobScheduledPayload>;
  "job.started": AgentEvent<JobStartedPayload>;
  "job.progress": AgentEvent<JobProgressPayload>;
  "job.waiting_for_input": AgentEvent<JobWaitingForInputPayload>;
  "job.completed": AgentEvent<JobCompletedPayload>;
  "job.failed": AgentEvent<JobFailedPayload>;
  "artifact.created": AgentEvent<ArtifactCreatedPayload>;
  "notification.created": AgentEvent<NotificationCreatedPayload>;
}
