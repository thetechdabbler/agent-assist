'use client';

export function AgentUnavailableCard() {
  return (
    <div
      role="alert"
      style={{
        padding: 12,
        background: '#fff3cd',
        border: '1px solid #ffc107',
        borderRadius: 8,
        margin: '8px 0',
        color: '#856404',
      }}
    >
      Agent temporarily unavailable — send will re-enable automatically.
    </div>
  );
}
