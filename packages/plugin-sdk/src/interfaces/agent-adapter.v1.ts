/**
 * Agent Adapter Contract — Version 1.0
 * Canonical types for IAgentAdapter (see specs/001-agent-chat-workspace/contracts/agent-adapter.v1.ts).
 */

export const AGENT_ADAPTER_CONTRACT_VERSION = '1.0';

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
  status: 'active' | 'completed' | 'cancelled';
}

export interface MessageSummary {
  source: 'user' | 'agent' | 'system';
  text: string;
  createdAt: string;
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
    type: 'one_shot' | 'scheduled' | 'continuous';
    schedule?: string;
  };
}

export interface SubmitFormInputRequest {
  jobId: string;
  tenantId: string;
  formResponse: Record<string, unknown>;
  attachments?: AttachmentRef[];
}

export interface TurnAcknowledgement {
  jobId: string;
  status: 'accepted';
}

export interface JobRef {
  jobId: string;
}

export interface AgentJobState {
  jobId: string;
  externalJobRef: string;
  status: 'scheduled' | 'queued' | 'running' | 'waiting_for_input' | 'completed' | 'failed';
  progressPercent?: number;
  statusMessage?: string;
  errorCode?: string;
  errorMessage?: string;
  retryable?: boolean;
}

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface AdapterHealth {
  status: HealthStatus;
  latencyMs?: number;
  details?: Record<string, unknown>;
  checkedAt: string;
}

export interface AgentAdapterMetadata {
  pluginType: 'agent_adapter';
  name: string;
  version: string;
  contractVersion: typeof AGENT_ADAPTER_CONTRACT_VERSION;
  description: string;
  capabilities: AgentCapability[];
}

export type AgentCapability =
  | 'text'
  | 'form_input'
  | 'file_processing'
  | 'scheduled_jobs'
  | 'streaming';

export interface IAgentAdapter {
  readonly metadata: AgentAdapterMetadata;
  startTurn(request: StartTurnRequest): Promise<TurnAcknowledgement>;
  setGoal(request: SetGoalRequest): Promise<JobRef | null>;
  submitFormInput(request: SubmitFormInputRequest): Promise<void>;
  cancelJob(jobId: string, tenantId: string): Promise<void>;
  getJob(jobId: string, tenantId: string): Promise<AgentJobState>;
  getHealth(): Promise<AdapterHealth>;
}
