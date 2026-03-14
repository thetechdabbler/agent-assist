import { prisma } from '../db/client';

export type PluginType = 'agent_adapter' | 'renderer' | 'notification' | 'storage' | 'auth_policy';

export interface IAgentAdapter {
  startTurn(request: unknown): AsyncGenerator<unknown> | Promise<unknown>;
  getHealth?(): Promise<{ ok: boolean }>;
  getCapabilities?(): Promise<Record<string, unknown>>;
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
  return getPlugin<IAgentAdapter>('agent_adapter', tenantId);
}

export async function healthCheck(): Promise<{ ok: boolean }> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
