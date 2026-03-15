import { trace, context } from '@opentelemetry/api';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';

const provider = new NodeTracerProvider({});
provider.register();
const tracer = trace.getTracer('agent-assist-backend', '1.0.0');

export function startSpan(
  name: string,
  options?: { attributes?: Record<string, string | number | boolean> },
) {
  return tracer.startSpan(name, { attributes: options?.attributes });
}

export function getTracer() {
  return tracer;
}

export { context, trace };
