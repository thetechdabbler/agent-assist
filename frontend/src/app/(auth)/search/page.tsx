'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AppLayout from '@/layouts/AppLayout';
import { apiGet } from '@/services/api-client';
import type { SearchResultItem } from '@/components/GlobalSearchBar';

function typeLabel(type: string): string {
  const labels: Record<string, string> = {
    conversations: 'Conversation',
    messages: 'Message',
    goals: 'Goal',
    jobs: 'Job',
    artifacts: 'Artifact',
  };
  return labels[type] ?? type;
}

function typeIcon(type: string): string {
  const icons: Record<string, string> = {
    conversations: '💬',
    messages: '📝',
    goals: '🎯',
    jobs: '⚙',
    artifacts: '▦',
  };
  return icons[type] ?? '•';
}

export default function SearchResultsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const q = searchParams.get('q') ?? '';
  const type = searchParams.get('type') ?? '';
  const status = searchParams.get('status') ?? '';
  const from = searchParams.get('from') ?? '';
  const to = searchParams.get('to') ?? '';

  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(!!q);
  const [unavailable, setUnavailable] = useState(false);

  const [filterQ, setFilterQ] = useState(q);
  const [filterType, setFilterType] = useState(type);
  const [filterStatus, setFilterStatus] = useState(status);
  const [filterFrom, setFilterFrom] = useState(from);
  const [filterTo, setFilterTo] = useState(to);

  useEffect(() => {
    setFilterQ(q);
    setFilterType(type);
    setFilterStatus(status);
    setFilterFrom(from);
    setFilterTo(to);
  }, [q, type, status, from, to]);

  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setUnavailable(false);
    const params = new URLSearchParams({ q: q.trim() });
    if (type) params.set('type', type);
    if (status) params.set('status', status);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    apiGet<{ results: SearchResultItem[] }>(`/api/search?${params.toString()}`)
      .then((res) => {
        setResults(res?.results ?? []);
      })
      .catch((e: { status?: number }) => {
        if (e?.status === 503) setUnavailable(true);
        else setResults([]);
      })
      .finally(() => setLoading(false));
  }, [q, type, status, from, to]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (filterQ.trim()) params.set('q', filterQ.trim());
    if (filterType) params.set('type', filterType);
    if (filterStatus) params.set('status', filterStatus);
    if (filterFrom) params.set('from', filterFrom);
    if (filterTo) params.set('to', filterTo);
    router.replace(`/search?${params.toString()}`);
  };

  const linkFor = (r: SearchResultItem) => {
    if (r.conversationId) {
      return r.messageId
        ? `/conversations/${r.conversationId}?highlight=${r.messageId}`
        : `/conversations/${r.conversationId}`;
    }
    if (r.type === 'conversations' && r.id) return `/conversations/${r.id}`;
    if (r.type === 'goals' && r.id) return `/goals/${r.id}`;
    if (r.type === 'jobs' && r.id) return `/jobs?selected=${r.id}`;
    return '#';
  };

  return (
    <AppLayout>
      <h1 style={{ marginTop: 0 }}>Search</h1>
      <form onSubmit={handleSearch} style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
          <label style={{ flex: '1 1 200px' }}>
            <span style={{ display: 'block', marginBottom: 4, fontSize: 13 }}>Keyword</span>
            <input
              type="text"
              value={filterQ}
              onChange={(e) => setFilterQ(e.target.value)}
              placeholder="Search…"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid #ccc',
              }}
            />
          </label>
          <label>
            <span style={{ display: 'block', marginBottom: 4, fontSize: 13 }}>Type</span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ccc' }}
            >
              <option value="">All</option>
              <option value="conversations">Conversations</option>
              <option value="messages">Messages</option>
              <option value="goals">Goals</option>
              <option value="jobs">Jobs</option>
              <option value="artifacts">Artifacts</option>
            </select>
          </label>
          <label>
            <span style={{ display: 'block', marginBottom: 4, fontSize: 13 }}>Status</span>
            <input
              type="text"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              placeholder="e.g. completed"
              style={{ width: 120, padding: '8px 12px', borderRadius: 6, border: '1px solid #ccc' }}
            />
          </label>
          <label>
            <span style={{ display: 'block', marginBottom: 4, fontSize: 13 }}>From</span>
            <input
              type="date"
              value={filterFrom}
              onChange={(e) => setFilterFrom(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ccc' }}
            />
          </label>
          <label>
            <span style={{ display: 'block', marginBottom: 4, fontSize: 13 }}>To</span>
            <input
              type="date"
              value={filterTo}
              onChange={(e) => setFilterTo(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ccc' }}
            />
          </label>
          <button type="submit" style={{ padding: '8px 16px', borderRadius: 6, cursor: 'pointer' }}>
            Search
          </button>
        </div>
      </form>

      {unavailable && (
        <div
          style={{
            padding: 12,
            background: '#fff3cd',
            border: '1px solid #ffc107',
            borderRadius: 8,
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span>Search is temporarily unavailable.</span>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{ padding: '4px 12px', cursor: 'pointer' }}
          >
            Retry
          </button>
        </div>
      )}

      {loading && <p>Loading…</p>}
      {!loading && !unavailable && (
        <div>
          {results.length === 0 && q ? (
            <p style={{ color: '#666' }}>No results found.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {results.map((r) => (
                <li
                  key={`${r.type}-${r.id}`}
                  style={{
                    padding: 12,
                    borderBottom: '1px solid #eee',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <span style={{ fontSize: 20 }} title={r.type}>
                    {typeIcon(r.type)}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500 }}>{r.title ?? r.snippet ?? r.id}</div>
                    <div style={{ fontSize: 13, color: '#666', marginTop: 2 }}>
                      {typeLabel(r.type)}
                      {r.status && ` · ${r.status}`}
                      {r.conversationId && ` · Conversation ${r.conversationId.slice(0, 8)}…`}
                    </div>
                  </div>
                  <Link
                    href={linkFor(r)}
                    style={{
                      padding: '6px 12px',
                      background: '#1976d2',
                      color: '#fff',
                      borderRadius: 6,
                      textDecoration: 'none',
                      fontSize: 13,
                    }}
                  >
                    Open
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </AppLayout>
  );
}
