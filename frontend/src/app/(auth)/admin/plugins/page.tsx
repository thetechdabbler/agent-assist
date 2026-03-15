'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import AppLayout from '@/layouts/AppLayout';
import { apiGet, apiPatch } from '@/services/api-client';

interface PluginItem {
  id: string;
  pluginType: string;
  pluginName: string;
  version: string;
  status: string;
  enabled: boolean;
}

export default function AdminPluginsPage() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const tenantId = (session as { tenantId?: string })?.tenantId ?? '';

  const { data, isLoading } = useQuery({
    queryKey: ['plugins'],
    queryFn: () => apiGet<{ plugins: PluginItem[] }>('/api/plugins'),
  });

  const updateEnabled = useMutation({
    mutationFn: ({ pluginId, enabled }: { pluginId: string; enabled: boolean }) =>
      apiPatch(`/api/tenants/${tenantId}/plugins/${pluginId}/enabled`, { enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plugins'] });
    },
  });

  const plugins = data?.plugins ?? [];
  const byType = plugins.reduce(
    (acc, p) => {
      const t = p.pluginType;
      if (!acc[t]) acc[t] = [];
      acc[t].push(p);
      return acc;
    },
    {} as Record<string, PluginItem[]>,
  );

  return (
    <AppLayout>
      <div style={{ maxWidth: 800 }}>
        <h1 style={{ marginTop: 0 }}>Plugins</h1>
        <p style={{ color: '#666', marginBottom: 24 }}>
          Enable or disable plugins for your tenant. Changes apply to message renderers and agent
          adapters.
        </p>
        {isLoading && <p>Loading…</p>}
        {!isLoading && plugins.length === 0 && (
          <p style={{ color: '#666' }}>
            No plugins registered. Seed the database to see plugins here.
          </p>
        )}
        {!isLoading && Object.keys(byType).length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {Object.entries(byType).map(([pluginType, list]) => (
              <section key={pluginType}>
                <h2 style={{ fontSize: 18, marginBottom: 12 }}>{pluginType.replace(/_/g, ' ')}</h2>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {list.map((p) => (
                    <li
                      key={p.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 0',
                        borderBottom: '1px solid #eee',
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: 500 }}>{p.pluginName}</span>
                        <span style={{ marginLeft: 8, fontSize: 13, color: '#666' }}>
                          v{p.version}
                        </span>
                        {p.status && (
                          <span style={{ marginLeft: 8, fontSize: 12, color: '#888' }}>
                            ({p.status})
                          </span>
                        )}
                      </div>
                      <label
                        style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                      >
                        <span style={{ fontSize: 14, color: '#666' }}>Enabled</span>
                        <input
                          type="checkbox"
                          checked={p.enabled}
                          disabled={updateEnabled.isPending}
                          onChange={(e) =>
                            updateEnabled.mutate({ pluginId: p.id, enabled: e.target.checked })
                          }
                        />
                      </label>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
