import { prisma } from '../db/client';
import { createHttpAgentAdapter } from './adapters/http-agent-adapter';
import { createEchoAgentAdapter } from './adapters/echo-agent.adapter';

export type PluginType = 'agent_adapter' | 'renderer' | 'notification' | 'storage' | 'auth_policy';

export interface IAgentAdapter {
  metadata?: Record<string, unknown>;
  startTurn(request: unknown): AsyncGenerator<unknown> | Promise<unknown>;
  submitFormInput?(request: {
    jobId: string;
    tenantId: string;
    formResponse: Record<string, unknown>;
    attachments?: unknown[];
  }): Promise<void>;
  getHealth?(): Promise<{ ok: boolean }>;
  getCapabilities?(): Promise<Record<string, unknown>>;
}

/** Registry of plugin name -> adapter instance for agent_adapter plugins. */
const agentAdapterRegistry = new Map<string, IAgentAdapter>();

export function registerAgentAdapter(pluginName: string, adapter: IAgentAdapter): void {
  agentAdapterRegistry.set(pluginName, adapter);
}

export async function getPlugin<T>(type: PluginType, tenantId: string): Promise<T | null> {
  const enabled = await prisma.tenantPlugin.findFirst({
    where: { tenantId, enabled: true },
    include: { plugin: true },
  });
  if (!enabled || enabled.plugin.pluginType !== type) return null;
  return enabled.plugin as unknown as T;
}

export async function getAgentAdapter(tenantId: string): Promise<IAgentAdapter | null> {
  const enabled = await prisma.tenantPlugin.findFirst({
    where: { tenantId, enabled: true },
    include: { plugin: true },
  });
  if (!enabled || enabled.plugin.pluginType !== 'agent_adapter') return null;
  const adapter = agentAdapterRegistry.get(enabled.plugin.pluginName) ?? null;
  return adapter;
}

export type AgentListEntry = { id: string; displayName: string; pluginName: string };

export async function listAgentAdapters(tenantId: string): Promise<AgentListEntry[]> {
  const list = await prisma.tenantPlugin.findMany({
    where: { tenantId, enabled: true },
    include: { plugin: true },
  });
  const agentPlugins = list
    .filter((tp) => tp.plugin.pluginType === 'agent_adapter')
    .map((tp) => tp.plugin)
    .sort((a, b) => (a.pluginName ?? '').localeCompare(b.pluginName ?? ''));
  return agentPlugins.map((p) => {
    const config = (p.configJson as { displayName?: string } | null) ?? {};
    return {
      id: p.id,
      displayName: config.displayName ?? p.pluginName,
      pluginName: p.pluginName,
    };
  });
}

export async function getAgentAdapterByPluginId(
  tenantId: string,
  pluginId: string,
): Promise<IAgentAdapter | null> {
  const tp = await prisma.tenantPlugin.findFirst({
    where: { tenantId, pluginId, enabled: true },
    include: { plugin: true },
  });
  if (!tp || tp.plugin.pluginType !== 'agent_adapter') return null;
  return agentAdapterRegistry.get(tp.plugin.pluginName) ?? null;
}

export async function healthCheck(): Promise<{ ok: boolean }> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

// Register built-in adapters (http and echo are seeded in DB)
registerAgentAdapter('http', createHttpAgentAdapter());
registerAgentAdapter('echo', createEchoAgentAdapter());
