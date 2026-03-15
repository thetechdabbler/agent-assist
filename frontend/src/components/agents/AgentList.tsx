'use client';

export interface ExampleAgent {
  id: string;
  displayName: string;
  pluginName?: string;
}

interface AgentListProps {
  agents: ExampleAgent[];
  onSelect: (agentId: string) => void;
  isLoading?: boolean;
}

export function AgentList({ agents, onSelect, isLoading }: AgentListProps) {
  if (isLoading) return <p>Loading agents…</p>;
  if (agents.length === 0) {
    return (
      <p style={{ color: '#666' }}>
        No example agents available (enable in dev/local or check backend config).
      </p>
    );
  }
  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {agents.map((a) => (
        <li key={a.id} style={{ marginBottom: 8 }}>
          <button
            type="button"
            onClick={() => onSelect(a.id)}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: 16,
              border: '1px solid #eee',
              borderRadius: 8,
              background: '#fff',
              cursor: 'pointer',
            }}
          >
            <strong>{a.displayName}</strong>
            {a.pluginName && (
              <span style={{ marginLeft: 8, color: '#666', fontSize: 14 }}>({a.pluginName})</span>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}
