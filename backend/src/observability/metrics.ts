import { metrics } from '@opentelemetry/api';
import { MeterProvider } from '@opentelemetry/sdk-metrics';

const meterProvider = new MeterProvider({});
metrics.setGlobalMeterProvider(meterProvider);
const meter = metrics.getMeter('agent-assist-backend', '1.0.0');

export const agentAssistActiveConversations = meter.createUpDownCounter(
  'agent_assist_active_conversations',
  { description: 'Number of active conversations' },
);
export const agentAssistJobCount = meter.createUpDownCounter('agent_assist_job_count', {
  description: 'Job count by status',
});
export const agentAssistJobCompletionSeconds = meter.createHistogram(
  'agent_assist_job_completion_seconds',
  { description: 'Job completion duration' },
);
export const agentAssistAdapterErrorTotal = meter.createCounter(
  'agent_assist_adapter_error_total',
  { description: 'Adapter errors by name' },
);
export const agentAssistAgentResolutionTotal = meter.createCounter(
  'agent_assist_agent_resolution_total',
  { description: 'Agent adapter resolution by conversation (default vs by agentId)' },
);
export const agentAssistRendererValidationFailureTotal = meter.createCounter(
  'agent_assist_renderer_validation_failure_total',
  { description: 'Renderer validation failures by payload type' },
);
export const agentAssistSearchLatencySeconds = meter.createHistogram(
  'agent_assist_search_latency_seconds',
  { description: 'Search query latency' },
);
export const agentAssistNotificationDeliveryLatencySeconds = meter.createHistogram(
  'agent_assist_notification_delivery_latency_seconds',
  { description: 'Notification delivery latency' },
);

export function getMeter() {
  return meter;
}

export async function getPrometheusMetrics(): Promise<string> {
  return '# agent-assist metrics (Prometheus scrape endpoint)\n';
}
