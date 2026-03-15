'use client';

import { useMemo } from 'react';

export interface ChartSeries {
  name: string;
  data: number[];
}

export interface ChartArtifactPayload {
  kind: 'line' | 'bar' | 'pie' | 'area' | 'progress' | 'trend';
  title: string;
  x: string[];
  series: ChartSeries[];
  yAxisLabel?: string;
  xAxisLabel?: string;
}

const CHART_WIDTH = 400;
const CHART_HEIGHT = 240;
const PADDING = { top: 20, right: 20, bottom: 32, left: 44 };

export function ChartArtifactRenderer({ payload }: { payload: ChartArtifactPayload }) {
  const { kind, title, x, series, xAxisLabel, yAxisLabel } = payload;
  const flatValues = useMemo(() => series.flatMap((s) => s.data), [series]);
  const maxVal = useMemo(() => Math.max(...flatValues, 1), [flatValues]);
  const minVal = useMemo(() => Math.min(...flatValues, 0), [flatValues]);
  const range = maxVal - minVal || 1;
  const innerW = CHART_WIDTH - PADDING.left - PADDING.right;
  const innerH = CHART_HEIGHT - PADDING.top - PADDING.bottom;

  if (kind === 'pie') {
    const total = series.reduce((acc, s) => acc + s.data.reduce((a, b) => a + b, 0), 0);
    let start = 0;
    return (
      <div
        style={{ padding: 12, border: '1px solid #e0e0e0', borderRadius: 8, background: '#fafafa' }}
      >
        {title && <div style={{ fontWeight: 600, marginBottom: 12 }}>{title}</div>}
        <svg
          width={CHART_WIDTH}
          height={CHART_HEIGHT}
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        >
          <g transform={`translate(${CHART_WIDTH / 2},${CHART_HEIGHT / 2})`}>
            {series.flatMap((s) =>
              s.data.map((val, i) => {
                const pct = total ? val / total : 0;
                const angle = pct * 2 * Math.PI;
                const startAngle = start;
                start += angle;
                const r = Math.min(CHART_WIDTH, CHART_HEIGHT) / 2 - 24;
                const x1 = r * Math.cos(startAngle);
                const y1 = -r * Math.sin(startAngle);
                const x2 = r * Math.cos(startAngle + angle);
                const y2 = -r * Math.sin(startAngle + angle);
                const large = angle > Math.PI ? 1 : 0;
                const path = `M 0 0 L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
                const hue = (i * 137 + series.indexOf(s) * 60) % 360;
                return (
                  <path
                    key={`${s.name}-${i}`}
                    d={path}
                    fill={`hsl(${hue}, 60%, 70%)`}
                    stroke="#fff"
                    strokeWidth={1}
                  />
                );
              }),
            )}
          </g>
        </svg>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8, fontSize: 13 }}>
          {series.flatMap((s) =>
            s.data.map((val, i) => {
              const label = x[i] ?? `${s.name} #${i + 1}`;
              const pct = total ? ((val / total) * 100).toFixed(0) : '0';
              return (
                <span key={`${s.name}-${i}`}>
                  {label}: {pct}%
                </span>
              );
            }),
          )}
        </div>
      </div>
    );
  }

  const step = x.length ? innerW / x.length : innerW;
  const barWidth = Math.max(4, (step / Math.max(series.length, 1)) * 0.7);

  return (
    <div
      style={{ padding: 12, border: '1px solid #e0e0e0', borderRadius: 8, background: '#fafafa' }}
    >
      {title && <div style={{ fontWeight: 600, marginBottom: 8 }}>{title}</div>}
      {yAxisLabel && (
        <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>{yAxisLabel}</div>
      )}
      <svg width={CHART_WIDTH} height={CHART_HEIGHT} viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}>
        <g transform={`translate(${PADDING.left},${PADDING.top})`}>
          {kind === 'line'
            ? series.map((s, si) => {
                const hue = (si * 137) % 360;
                const points = s.data
                  .map((v, j) => {
                    const nx = (j + 0.5) * step;
                    const ny = innerH - ((v - minVal) / range) * innerH;
                    return `${nx},${ny}`;
                  })
                  .join(' ');
                return (
                  <polyline
                    key={s.name}
                    points={points}
                    fill="none"
                    stroke={`hsl(${hue}, 60%, 45%)`}
                    strokeWidth={2}
                  />
                );
              })
            : series.flatMap((s, si) =>
                s.data.map((val, i) => {
                  const x0 = i * step + si * barWidth + (step - barWidth * series.length) / 2;
                  const norm = (val - minVal) / range;
                  const h = norm * innerH;
                  const y = innerH - h;
                  const hue = (si * 137) % 360;
                  return (
                    <rect
                      key={`${s.name}-${i}`}
                      x={x0}
                      y={y}
                      width={barWidth - 2}
                      height={h}
                      fill={`hsl(${hue}, 60%, 65%)`}
                      rx={2}
                    />
                  );
                }),
              )}
        </g>
      </svg>
      {xAxisLabel && (
        <div style={{ fontSize: 12, color: '#666', marginTop: 4, paddingLeft: PADDING.left }}>
          {xAxisLabel}
        </div>
      )}
      <div style={{ fontSize: 11, color: '#888', marginTop: 4, paddingLeft: PADDING.left }}>
        {x.slice(0, 8).join(' · ')}
        {x.length > 8 ? ' …' : ''}
      </div>
    </div>
  );
}
