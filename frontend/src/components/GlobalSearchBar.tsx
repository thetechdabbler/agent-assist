'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet } from '@/services/api-client';

const DEBOUNCE_MS = 300;
const TOP_PER_TYPE = 5;

export interface SearchResultItem {
  type: string;
  id: string;
  conversationId?: string;
  messageId?: string;
  title?: string;
  jobType?: string;
  status?: string;
  artifactType?: string;
  updatedAt?: string;
  snippet?: string;
}

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

export function GlobalSearchBar() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setUnavailable(false);
      return;
    }
    setLoading(true);
    setUnavailable(false);
    try {
      const res = await apiGet<{ results: SearchResultItem[] }>(
        `/api/search?q=${encodeURIComponent(q.trim())}`,
      );
      const list = res?.results ?? [];
      const byType = new Map<string, SearchResultItem[]>();
      for (const r of list) {
        const arr = byType.get(r.type) ?? [];
        if (arr.length < TOP_PER_TYPE) arr.push(r);
        byType.set(r.type, arr);
      }
      const top = ([] as SearchResultItem[]).concat(...byType.values());
      setResults(top);
    } catch (e: unknown) {
      const status = (e as { status?: number })?.status;
      if (status === 503) setUnavailable(true);
      else setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debouncedQuery) runSearch(debouncedQuery);
    else setResults([]);
  }, [debouncedQuery, runSearch]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  useEffect(() => {
    if (!open || results.length === 0) return;
    const el = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [open, results.length, selectedIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) {
      if (e.key === 'Escape') setOpen(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const r = results[selectedIndex];
      if (r?.conversationId) {
        const url = r.messageId
          ? `/conversations/${r.conversationId}?highlight=${r.messageId}`
          : `/conversations/${r.conversationId}`;
        router.push(url);
      } else if (r?.type === 'conversations' && r.id) {
        router.push(`/conversations/${r.id}`);
      } else if (r?.type === 'goals' && r.id) {
        router.push(`/goals/${r.id}`);
      } else if (r?.type === 'jobs' && r.id) {
        router.push(`/jobs?selected=${r.id}`);
      }
      setOpen(false);
      setQuery('');
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const handleSelect = (r: SearchResultItem) => {
    if (r.conversationId) {
      const url = r.messageId
        ? `/conversations/${r.conversationId}?highlight=${r.messageId}`
        : `/conversations/${r.conversationId}`;
      router.push(url);
    } else if (r.type === 'conversations' && r.id) {
      router.push(`/conversations/${r.id}`);
    } else if (r.type === 'goals' && r.id) {
      router.push(`/goals/${r.id}`);
    } else if (r.type === 'jobs' && r.id) {
      router.push(`/jobs?selected=${r.id}`);
    }
    setOpen(false);
    setQuery('');
  };

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 360 }}>
      <input
        ref={inputRef}
        type="search"
        placeholder="Search…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={handleKeyDown}
        style={{
          width: '100%',
          padding: '8px 12px',
          borderRadius: 8,
          border: '1px solid #ccc',
          fontSize: 14,
        }}
      />
      {open && (query || results.length > 0) && (
        <div
          ref={listRef}
          role="listbox"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 4,
            maxHeight: 320,
            overflow: 'auto',
            background: '#fff',
            border: '1px solid #ddd',
            borderRadius: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            zIndex: 100,
          }}
        >
          {loading && <div style={{ padding: 12, color: '#666' }}>Searching…</div>}
          {!loading && results.length === 0 && query && (
            <div style={{ padding: 12, color: '#666' }}>No results</div>
          )}
          {!loading &&
            results.map((r, i) => (
              <button
                key={`${r.type}-${r.id}`}
                type="button"
                role="option"
                aria-selected={i === selectedIndex}
                data-index={i}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(r);
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '10px 12px',
                  textAlign: 'left',
                  border: 'none',
                  background: i === selectedIndex ? '#e3f2fd' : 'transparent',
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                <span style={{ color: '#666', marginRight: 6 }}>{typeLabel(r.type)}</span>
                {r.title ?? r.snippet ?? r.id.slice(0, 8)}…
              </button>
            ))}
        </div>
      )}
      {unavailable && (
        <div
          style={{
            marginTop: 8,
            padding: 12,
            background: '#fff3cd',
            border: '1px solid #ffc107',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span>Search is temporarily unavailable.</span>
          <button
            type="button"
            onClick={() => runSearch(debouncedQuery || query)}
            style={{ padding: '4px 12px', cursor: 'pointer' }}
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
