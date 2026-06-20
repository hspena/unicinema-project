import React, { useEffect, useRef, useState } from 'react';

export interface LinePoint {
  label: string;
  value: number | null;   // null renders as a gap in the line
}

export interface LineSeries {
  name:    string;
  color:   string;
  points:  LinePoint[];
  type?:   'line' | 'bar';     // how this series renders (default 'line')
  axis?:   'left' | 'right';   // which y-axis this series is scaled against (default 'left')
  yMin?:   number;             // fixed lower bound for this series' axis (default 0)
  yMax?:   number;             // fixed upper bound for this series' axis (default data max)
  format?: (n: number) => string;
}

interface LineChartProps {
  series:  LineSeries[];        // all series must share the same x labels
  height?: number;              // px, default 220
}

const PAD_T = 16;
const PAD_B = 30;

interface Axis { min: number; max: number; format: (n: number) => string; }

const axisFor = (list: LineSeries[]): Axis | null => {
  if (!list.length) return null;
  const values = list.flatMap(s => s.points.map(p => p.value).filter((v): v is number => v != null));
  const min = list[0].yMin ?? 0;
  const max = list[0].yMax ?? Math.max(...values, 1);
  return { min, max, format: list[0].format ?? ((n) => String(Math.round(n))) };
};

const LineChart = ({ series, height = 220 }: LineChartProps) => {
  // Measure the real rendered width so the SVG uses a 1:1 pixel coordinate
  // space — no horizontal stretching, and points stay perfectly round.
  const wrapRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(600);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(entries => {
      const cw = entries[0].contentRect.width;
      if (cw > 0) setW(Math.round(cw));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const labels = series[0]?.points.map(p => p.label) ?? [];
  const n      = labels.length;

  const leftSeries  = series.filter(s => (s.axis ?? 'left') === 'left');
  const rightSeries = series.filter(s => s.axis === 'right');
  const left  = axisFor(leftSeries);
  const right = axisFor(rightSeries);

  const PAD_L = left  ? 38 : 14;
  const PAD_R = right ? 38 : 14;

  const W = w;
  const H = height;
  const xFor = (i: number) =>
    n <= 1 ? (W / 2) : PAD_L + (i * (W - PAD_L - PAD_R)) / (n - 1);
  const yFor = (v: number, ax: Axis) =>
    H - PAD_B - ((v - ax.min) / (ax.max - ax.min || 1)) * (H - PAD_T - PAD_B);

  // Build polyline segments for a series, splitting on null gaps.
  const segmentsFor = (s: LineSeries, ax: Axis): string[] => {
    const segs: string[] = [];
    let cur: string[] = [];
    s.points.forEach((p, i) => {
      if (p.value == null) { if (cur.length) { segs.push(cur.join(' ')); cur = []; } return; }
      cur.push(`${xFor(i)},${yFor(p.value, ax)}`);
    });
    if (cur.length) segs.push(cur.join(' '));
    return segs;
  };

  // Anchor edge labels inward so the first/last never clip at the SVG bounds.
  const anchorFor = (i: number): 'start' | 'middle' | 'end' =>
    n > 1 && i === 0 ? 'start' : n > 1 && i === n - 1 ? 'end' : 'middle';

  // With many buckets, only label an evenly-spaced subset (always incl. first/last)
  // so dense daily/monthly axes stay readable. Points keep full labels for tooltips.
  const maxTicks = 7;
  const showTick = (i: number): boolean => {
    if (n <= maxTicks) return true;
    if (i === 0 || i === n - 1) return true;
    const step = (n - 1) / (maxTicks - 1);
    return Math.round(Math.round(i / step) * step) === i;
  };

  const gridFracs = [0, 0.5, 1];

  // Bar layout: bars are grouped/centered on each x position.
  const step       = n > 1 ? (W - PAD_L - PAD_R) / (n - 1) : (W - PAD_L - PAD_R) || W * 0.5;
  const barSeries  = series.filter(s => s.type === 'bar');
  const groupWidth = Math.min(step * 0.7, 46);
  const barWidth   = groupWidth / (barSeries.length || 1);

  return (
    <div ref={wrapRef}>
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img">
        {/* Gridlines + axis labels */}
        {gridFracs.map((f, i) => {
          const y = (H - PAD_B) - f * (H - PAD_T - PAD_B);
          return (
            <g key={i}>
              <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke="var(--border)" strokeWidth={1} />
              {left && (
                <text x={PAD_L - 6} y={y + 4} textAnchor="end" fontSize={11} fill={leftSeries.length === 1 ? leftSeries[0].color : 'var(--text-muted)'}>
                  {left.format(left.min + f * (left.max - left.min))}
                </text>
              )}
              {right && (
                <text x={W - PAD_R + 6} y={y + 4} textAnchor="start" fontSize={11} fill={rightSeries[0].color}>
                  {right.format(right.min + f * (right.max - right.min))}
                </text>
              )}
            </g>
          );
        })}

        {/* Bar series (drawn first, behind the lines) */}
        {barSeries.map((s, bi) => {
          const ax = (s.axis === 'right' ? right : left)!;
          const baseline = yFor(ax.min, ax);
          return (
            <g key={`bar-${bi}`}>
              {s.points.map((p, i) => {
                if (p.value == null) return null;
                const yv = yFor(p.value, ax);
                const x  = xFor(i) - groupWidth / 2 + bi * barWidth;
                return (
                  <rect
                    key={i}
                    x={x} y={Math.min(yv, baseline)}
                    width={Math.max(barWidth * 0.82, 1)} height={Math.abs(baseline - yv)}
                    rx={1.5} fill={s.color} opacity={0.85}
                  >
                    <title>{`${p.label} — ${s.name}: ${(s.format ?? ax.format)(p.value)}`}</title>
                  </rect>
                );
              })}
            </g>
          );
        })}

        {/* Line series (drawn on top of bars) */}
        {series.filter(s => s.type !== 'bar').map((s, si) => {
          const ax = (s.axis === 'right' ? right : left)!;
          return (
            <g key={`line-${si}`}>
              {segmentsFor(s, ax).map((seg, i) => (
                <polyline key={i} points={seg} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              ))}
              {s.points.map((p, i) => p.value != null && (
                <circle key={i} cx={xFor(i)} cy={yFor(p.value, ax)} r={3.5} fill={s.color}>
                  <title>{`${p.label} — ${s.name}: ${(s.format ?? ax.format)(p.value)}`}</title>
                </circle>
              ))}
            </g>
          );
        })}

        {/* X labels (sampled when dense) */}
        {labels.map((label, i) => showTick(i) && (
          <text key={i} x={xFor(i)} y={H - 9} textAnchor={anchorFor(i)} fontSize={11} fill="var(--text-muted)">
            {label}
          </text>
        ))}
      </svg>

      {/* Legend (when more than one series) */}
      {series.length > 1 && (
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 6 }}>
          {series.map((s, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              <span style={{
                width: s.type === 'bar' ? 11 : 14,
                height: s.type === 'bar' ? 9 : 3,
                borderRadius: 2, background: s.color, display: 'inline-block',
              }} /> {s.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default LineChart;
