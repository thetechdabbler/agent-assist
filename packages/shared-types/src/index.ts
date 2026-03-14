// ─────────────────────────────────────────────────────────────
// Shared TypeScript interfaces for all core entities
// Versioned payload type aliases matching contracts/message-envelope.v1.json
// ─────────────────────────────────────────────────────────────

// ── Enumerations ──────────────────────────────────────────────

export type ConversationStatus = 'active' | 'archived';

export type MessageSourceType = 'user' | 'agent' | 'system';

export type MessageType =
  | 'text'
  | 'notification'
  | 'goal_update'
  | 'job_status'
  | 'form_request'
  | 'table'
  | 'chart'
  | 'file'
  | 'image'
  | 'action_prompt'
  | 'error'
  | 'system_event'
  | 'file_reference'
  | 'image_reference'
  | 'action_card'
  | 'status_card';

export type GoalStatus = 'active' | 'completed' | 'cancelled';

export type GoalType = 'directive' | 'scheduled';

export type JobStatus =
  | 'scheduled'
  | 'queued'
  | 'running'
  | 'waiting_for_input'
  | 'completed'
  | 'failed';

export type ArtifactType = 'table' | 'chart' | 'file' | 'image' | 'text';

export type NotificationCategory =
  | 'informational'
  | 'success'
  | 'action_required'
  | 'warning'
  | 'failure';

export type PluginType =
  | 'agent_adapter'
  | 'renderer'
  | 'notification'
  | 'storage'
  | 'auth_policy'
  | 'search';

export type PluginStatus = 'active' | 'degraded' | 'disabled';

export type MalwareScanStatus = 'pending' | 'clean' | 'quarantined';

// ── Core Entities ──────────────────────────────────────────────

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  configJson: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantConfig {
  inputTimeoutSeconds?: number;
  uploadLimits?: {
    maxSizeBytes: number;
    allowedMimeTypes: string[];
  };
  rateLimits?: {
    perUserPerMin: number;
    perTenantPerMin: number;
  };
}

export interface User {
  id: string;
  email: string;
  name?: string | null;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Conversation {
  id: string;
  title?: string | null;
  ownerUserId: string;
  tenantId: string;
  activeGoalId?: string | null;
  status: ConversationStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  conversationId: string;
  sourceType: MessageSourceType;
  type: MessageType;
  version: string;
  payloadJson: Record<string, unknown>;
  correlationId?: string | null;
  createdAt: Date;
}

export interface Attachment {
  id: string;
  conversationId: string;
  messageId: string;
  storageKey: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  malwareScanStatus: MalwareScanStatus;
  metadataJson?: Record<string, unknown> | null;
  createdAt: Date;
}

export interface Goal {
  id: string;
  userId: string;
  tenantId: string;
  conversationId?: string | null;
  goalType: GoalType;
  title: string;
  description?: string | null;
  status: GoalStatus;
  schedule?: string | null;
  metadataJson?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Job {
  id: string;
  conversationId: string;
  goalId?: string | null;
  tenantId: string;
  externalJobRef?: string | null;
  jobType: string;
  status: JobStatus;
  priority: number;
  scheduleAt?: Date | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
  progressPercent?: number | null;
  inputRef?: string | null;
  resultRef?: string | null;
  errorCode?: string | null;
  errorSummary?: string | null;
  retryCount: number;
  metadataJson?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Artifact {
  id: string;
  jobId: string;
  conversationId: string;
  tenantId: string;
  artifactType: ArtifactType;
  title: string;
  version: number;
  storageUri?: string | null;
  payloadJson?: Record<string, unknown> | null;
  previewJson?: Record<string, unknown> | null;
  schemaVersion: string;
  metadataJson?: Record<string, unknown> | null;
  createdAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  tenantId: string;
  conversationId?: string | null;
  jobId?: string | null;
  artifactId?: string | null;
  category: NotificationCategory;
  title: string;
  body?: string | null;
  isRead: boolean;
  deliveredAt?: Date | null;
  acknowledgedAt?: Date | null;
  createdAt: Date;
}

export interface Plugin {
  id: string;
  pluginType: PluginType;
  pluginName: string;
  version: string;
  contractVersion: string;
  status: PluginStatus;
  configJson?: Record<string, unknown> | null;
  healthLastCheckedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantPlugin {
  tenantId: string;
  pluginId: string;
  enabled: boolean;
  configOverrideJson?: Record<string, unknown> | null;
  enabledAt?: Date | null;
}

export interface AuditLog {
  id: string;
  tenantId: string;
  userId?: string | null;
  eventType: string;
  entityType: string;
  entityId: string;
  beforeState?: string | null;
  afterState?: string | null;
  correlationId?: string | null;
  ipAddress?: string | null;
  metadataJson?: Record<string, unknown> | null;
  createdAt: Date;
}

// ── Versioned Payload Types (contracts/message-envelope.v1.json) ──

export interface MessageEnvelopeV1<T = unknown> {
  version: '1.0';
  type: MessageType;
  payload: T;
  meta: {
    correlationId: string;
    timestamp: string;
    sourceType: MessageSourceType;
  };
}

export interface TextPayload {
  text: string;
  markdown?: boolean;
}

export interface ErrorPayload {
  message: string;
  errorCode?: string;
  retryable?: boolean;
}

export interface FormRequestPayload {
  formId: string;
  jobId: string;
  schema: FormFieldSchema[];
  title?: string;
  description?: string;
}

export interface FormFieldSchema {
  name: string;
  type: 'text' | 'number' | 'date' | 'select' | 'file';
  label: string;
  required?: boolean;
  options?: string[];
  validation?: Record<string, unknown>;
}

export interface TablePayload {
  columns: TableColumn[];
  rows: Record<string, unknown>[];
  totalRows?: number;
}

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  type?: 'string' | 'number' | 'date' | 'boolean';
}

export interface ChartPayload {
  chartType: 'bar' | 'line' | 'pie' | 'area';
  title?: string;
  labels: string[];
  datasets: ChartDataset[];
  xAxisLabel?: string;
  yAxisLabel?: string;
}

export interface ChartDataset {
  label: string;
  data: number[];
  color?: string;
}

export interface FileReferencePayload {
  artifactId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

export interface ImageReferencePayload {
  artifactId: string;
  altText?: string;
  width?: number;
  height?: number;
}

export interface JobStatusPayload {
  jobId: string;
  status: JobStatus;
  progressPercent?: number;
  errorCode?: string;
  errorSummary?: string;
}

export interface GoalUpdatePayload {
  goalId: string;
  title: string;
  status: GoalStatus;
  goalType: GoalType;
}

// ── API Response Types ─────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  cursor?: string | null;
  hasMore: boolean;
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
  correlationId?: string;
}

export interface SearchResult {
  entityType: 'conversation' | 'message' | 'goal' | 'job' | 'artifact';
  entityId: string;
  conversationId?: string;
  title: string;
  preview?: string;
  score: number;
  metadata?: Record<string, unknown>;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  queryMs: number;
  unavailable?: boolean;
}

// ── Auth Context ───────────────────────────────────────────────

export interface AuthContext {
  userId: string;
  tenantId: string;
  email: string;
  correlationId: string;
}

// ── Upload Limits ──────────────────────────────────────────────

export interface UploadLimits {
  maxSizeBytes: number;
  allowedMimeTypes: string[];
}

export const DEFAULT_UPLOAD_LIMITS: UploadLimits = {
  maxSizeBytes: 52_428_800, // 50 MB
  allowedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
    'text/markdown',
  ],
};
