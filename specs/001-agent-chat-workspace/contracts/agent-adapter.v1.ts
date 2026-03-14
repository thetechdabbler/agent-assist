/**
 * Agent Adapter Contract — Version 1.0
 *
 * All external agent system integrations MUST implement IAgentAdapter.
 * Breaking changes require a MAJOR version increment and a new contract file.
 * Non-breaking additions require a MINOR version increment.
 *
 * Constitution reference: Principle I (Separation of Concerns), Principle II (Pluggable Architecture)
 */

export const AGENT_ADAPTER_CONTRACT_VERSION = "1.0";

// ─── Input Types ─────────────────────────────────────────────────────────────

export interface UserInput {
  text?: string;
  attachments?: AttachmentRef[];
}

export interface AttachmentRef {
  id: string;
  filename: string;
  mimeType: string;
  storageUri: string;
}

export interface UserSettings {
  agenticSystemGoal?: string;
  dailyWorkflow?: string;
  timezone?: string;
  preferredLanguage?: string;
  [key: string]: unknown;
}

export interface ConversationContext {
  goals: GoalSummary[];
  settings: UserSettings;
  recentMessages: MessageSummary[];
}

export interface GoalSummary {
  id: string;
  title: string;
  description?: string;
  status: "active" | "completed" | "cancelled";
}

export interface MessageSummary {
  source: "user" | "agent" | "system";
  text: string;
  createdAt: string; // ISO 8601
}

export interface StartTurnRequest {
  conversationId: string;
  userId: string;
  tenantId: string;
  userInput: UserInput;
  context: ConversationContext;
  correlationId: string;
}

export interface SetGoalRequest {
  conversationId: string;
  userId: string;
  tenantId: string;
  goal: {
    id: string;
    title: string;
    description?: string;
    type: "one_shot" | "scheduled" | "continuous";
    schedule?: string; // cron expression for scheduled goals
  };
}

export interface SubmitFormInputRequest {
  jobId: string;
  tenantId: string;
  formResponse: Record<string, unknown>;
  attachments?: AttachmentRef[];
}

// ─── Output Types ─────────────────────────────────────────────────────────────

export interface TurnAcknowledgement {
  jobId: string;
  status: "accepted";
}

export interface JobRef {
  jobId: string;
}

export interface AgentJobState {
  jobId: string;
  externalJobRef: string;
  status: "scheduled" | "queued" | "running" | "waiting_for_input" | "completed" | "failed";
  progressPercent?: number;
  statusMessage?: string;
  errorCode?: string;
  errorMessage?: string;
  retryable?: boolean;
}

// ─── Health ───────────────────────────────────────────────────────────────────

export type HealthStatus = "healthy" | "degraded" | "unhealthy";

export interface AdapterHealth {
  status: HealthStatus;
  latencyMs?: number;
  details?: Record<string, unknown>;
  checkedAt: string; // ISO 8601
}

// ─── Plugin Metadata ─────────────────────────────────────────────────────────

export interface AgentAdapterMetadata {
  pluginType: "agent_adapter";
  name: string;
  version: string; // MAJOR.MINOR of this adapter implementation
  contractVersion: typeof AGENT_ADAPTER_CONTRACT_VERSION;
  description: string;
  capabilities: AgentCapability[];
}

export type AgentCapability =
  | "text"
  | "form_input"
  | "file_processing"
  | "scheduled_jobs"
  | "streaming";

// ─── Core Interface ───────────────────────────────────────────────────────────

/**
 * Every external agent system integration MUST implement this interface.
 * The Agent Gateway interacts exclusively through this contract.
 */
export interface IAgentAdapter {
  readonly metadata: AgentAdapterMetadata;

  /**
   * Process a user conversation turn.
   * MUST return synchronously with a jobId.
   * All output is delivered asynchronously via events.
   */
  startTurn(request: StartTurnRequest): Promise<TurnAcknowledgement>;

  /**
   * Notify the agent system of a new or updated goal.
   */
  setGoal(request: SetGoalRequest): Promise<JobRef | null>;

  /**
   * Submit a form response to unblock a waiting_for_input job.
   */
  submitFormInput(request: SubmitFormInputRequest): Promise<void>;

  /**
   * Request cancellation of a job.
   */
  cancelJob(jobId: string, tenantId: string): Promise<void>;

  /**
   * Fetch the current state of a job from the external system.
   * Used for state reconciliation when the event bus is temporarily unavailable.
   */
  getJob(jobId: string, tenantId: string): Promise<AgentJobState>;

  /**
   * Health check. Called by the registry on a periodic schedule.
   */
  getHealth(): Promise<AdapterHealth>;
}
