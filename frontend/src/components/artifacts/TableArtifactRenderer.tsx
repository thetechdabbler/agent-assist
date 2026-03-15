'use client';

import { useMemo, useState } from 'react';

export interface TableColumn {
  key: string;
  label: string;
  type?: 'string' | 'number' | 'date' | 'boolean';
  sortable?: boolean;
}

export interface TableArtifactPayload {
  columns: TableColumn[];
  rows: Record<string, unknown>[];
  totalRows?: number;
  capabilities?: {
    sort?: boolean;
    filter?: boolean;
    paginate?: boolean;
    export?: ('csv' | 'xlsx' | 'json')[];
  };
}

const PAGE_SIZES = [10, 25, 50] as const;

export function TableArtifactRenderer({ payload }: { payload: TableArtifactPayload }) {
  const { columns, rows, capabilities } = payload;
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [filter, setFilter] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    if (!filter.trim()) return rows;
    const lower = filter.toLowerCase();
    return rows.filter((row) =>
      columns.some((col) => {
        const v = row[col.key];
        return v != null && String(v).toLowerCase().includes(lower);
      }),
    );
  }, [rows, columns, filter]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const col = columns.find((c) => c.key === sortKey);
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return dir;
      if (bv == null) return -dir;
      if (col?.type === 'number') return dir * (Number(av) - Number(bv));
      if (col?.type === 'date')
        return dir * (new Date(av as string).getTime() - new Date(bv as string).getTime());
      return dir * String(av).localeCompare(String(bv));
    });
  }, [filtered, sortKey, sortDir, columns]);

  const paginated = useMemo(() => {
    const start = page * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page, pageSize]);
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));

  const handleSort = (key: string) => {
    const sortable = columns.find((c) => c.key === key)?.sortable !== false;
    if (!sortable) return;
    setSortKey((k) => (k === key ? k : key));
    setSortDir((d) => (sortKey === key ? (d === 'asc' ? 'desc' : 'asc') : 'asc'));
  };

  const exportCsv = () => {
    const headers = columns.map((c) => c.label).join(',');
    const escape = (v: unknown) => (v == null ? '' : `"${String(v).replace(/"/g, '""')}"`);
    const lines = [headers, ...sorted.map((r) => columns.map((c) => escape(r[c.key])).join(','))];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'export.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(sorted, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'export.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const canExport = capabilities?.export?.length;
  const canSort = capabilities?.sort !== false;
  const canFilter = capabilities?.filter !== false;

  return (
    <div
      style={{ overflow: 'auto', maxWidth: '100%', border: '1px solid #e0e0e0', borderRadius: 8 }}
    >
      {canFilter && (
        <div
          style={{
            padding: 8,
            borderBottom: '1px solid #e0e0e0',
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <input
            type="text"
            placeholder="Filter across columns…"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(0);
            }}
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              border: '1px solid #ccc',
              minWidth: 200,
            }}
          />
          <span style={{ fontSize: 13, color: '#666' }}>
            {sorted.length} row{sorted.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr style={{ background: '#f5f5f5' }}>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{
                  padding: '8px 12px',
                  textAlign: 'left',
                  borderBottom: '1px solid #e0e0e0',
                  cursor: canSort && col.sortable !== false ? 'pointer' : 'default',
                }}
                onClick={() => canSort && col.sortable !== false && handleSort(col.key)}
              >
                {col.label}
                {sortKey === col.key && (sortDir === 'asc' ? ' ↑' : ' ↓')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {paginated.map((row, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
              {columns.map((col) => (
                <td key={col.key} style={{ padding: '8px 12px' }}>
                  {row[col.key] != null ? String(row[col.key]) : '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div
        style={{
          padding: 8,
          borderTop: '1px solid #e0e0e0',
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: 13, color: '#666' }}>Rows per page:</span>
        <select
          value={pageSize}
          onChange={(e) => {
            setPageSize(Number(e.target.value));
            setPage(0);
          }}
          style={{ padding: '4px 8px', borderRadius: 4 }}
        >
          {PAGE_SIZES.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <span style={{ fontSize: 13, color: '#666' }}>
          Page {page + 1} of {totalPages}
        </span>
        <button
          type="button"
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
          style={{ padding: '4px 8px' }}
        >
          Previous
        </button>
        <button
          type="button"
          onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          disabled={page >= totalPages - 1}
          style={{ padding: '4px 8px' }}
        >
          Next
        </button>
        {canExport && (
          <>
            {capabilities?.export?.includes('csv') && (
              <button
                type="button"
                onClick={exportCsv}
                style={{ marginLeft: 8, padding: '4px 8px' }}
              >
                Export CSV
              </button>
            )}
            {capabilities?.export?.includes('json') && (
              <button type="button" onClick={exportJson} style={{ padding: '4px 8px' }}>
                Export JSON
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
