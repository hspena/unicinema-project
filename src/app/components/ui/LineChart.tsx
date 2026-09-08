import React, { useEffect, useId, useRef, useState } from 'react';

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

const PAD_T = 18;
const PAD_B = 32;

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
  const [hover, setHover] = useState<number | null>(null);
  const gid = useId().replace(/:/g, '');

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

  const PAD_L = left  ? 40 : 14;
  const PAD_R = right ? 40 : 14;

  const W = w;
  const H = height;
  const xFor = (i: number) =>
    n <= 1 ? (W / 2) : PAD_L + (i * (W - PAD_L - PAD_R)) / (n - 1);
  const yFor = (v: number, ax: Axis) =>
    H - PAD_B - ((v - ax.min) / (ax.max - ax.min || 1)) * (H - PAD_T - PAD_B);

  const axisOf = (s: LineSeries) => (s.axis === 'right' ? right : left)!;
  const valueOf = (s: LineSeries, v: number) => (s.format ?? axisOf(s).format)(v);

  // Build point runs for a series, splitting on null gaps.
  const runsFor = (s: LineSeries, ax: Axis): { x: number; y: number }[][] => {
    const runs: { x: number; y: number }[][] = [];
    let cur: { x: number; y: number }[] = [];
    s.points.forEach((p, i) => {
      if (p.value == null) { if (cur.length) { runs.push(cur); cur = []; } return; }
      cur.push({ x: xFor(i), y: yFor(p.value, ax) });
    });
    if (cur.length) runs.push(cur);
    return runs;
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

  const gridFracs = [0, 0.25, 0.5, 0.75, 1];

  // Bar layout: bars are grouped/centered on each x position.
  const step       = n > 1 ? (W - PAD_L - PAD_R) / (n - 1) : (W - PAD_L - PAD_R) || W * 0.5;
  const barSeries  = series.filter(s => s.type === 'bar');
  const lineSeries = series.filter(s => s.type !== 'bar');
  const groupWidth = Math.min(step * 0.7, 46);
  const barWidth   = groupWidth / (barSeries.length || 1);

  // Individual dots turn into noise on dense ranges — keep the line clean and
  // let the hover crosshair mark the point instead.
  const showDots = n <= 24;

  // Map a pointer position to the nearest bucket.
  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (n === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / (rect.width || 1)) * W;
    const i = n <= 1 ? 0 : Math.round(((x - PAD_L) / (W - PAD_L - PAD_R)) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  };

  const hoverRows = hover == null ? [] :
    series
      .map(s => ({ s, v: s.points[hover]?.value ?? null }))
      .filter((r): r is { s: LineSeries; v: number } => r.v != null);

  const dual = !!left && !!right;

  return (
    <div ref={wrapRef} className="chart-wrap">
      <svg
        className="chart-svg"
        width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          {lineSeries.map((s, i) => (
            <linearGradient key={i} id={`${gid}-area-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={s.color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={s.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>

        {/* Gridlines + axis labels */}
        {gridFracs.map((f, i) => {
          const y = (H - PAD_B) - f * (H - PAD_T - PAD_B);
          const baseline = f === 0;
          return (
            <g key={i}>
              <line
                x1={PAD_L} y1={y} x2={W - PAD_R} y2={y}
                stroke="var(--border)" strokeWidth={1}
                strokeDasharray={baseline ? undefined : '3 4'}
                opacity={baseline ? 1 : 0.7}
              />
              {left && (
                <text x={PAD_L - 7} y={y + 3.5} textAnchor="end" fontSize={10.5} fill="var(--text-muted)">
                  {left.format(left.min + f * (left.max - left.min))}
                </text>
              )}
              {right && (
                <text x={W - PAD_R + 7} y={y + 3.5} textAnchor="start" fontSize={10.5} fill="var(--text-muted)">
                  {right.format(right.min + f * (right.max - right.min))}
                </text>
              )}
            </g>
          );
        })}

        {/* Hover crosshair, behind the marks */}
        {hover != null && hoverRows.length > 0 && (
          <line
            x1={xFor(hover)} y1={PAD_T - 6} x2={xFor(hover)} y2={H - PAD_B}
            stroke="var(--text-muted)" strokeWidth={1} strokeDasharray="3 3" opacity={0.7}
          />
        )}

        {/* Bar series (drawn first, behind the lines) */}
        {barSeries.map((s, bi) => {
          const ax = axisOf(s);
          const baseline = yFor(ax.min, ax);
          return (
            <g key={`bar-${bi}`}>
              {s.points.map((p, i) => {
                if (p.value == null) return null;
                const yv = yFor(p.value, ax);
                const x  = xFor(i) - groupWidth / 2 + bi * barWidth;
                const wd = Math.max(barWidth * 0.82, 1);
                return (
                  <rect
                    key={i}
                    x={x} y={Math.min(yv, baseline)}
                    width={wd} height={Math.max(Math.abs(baseline - yv), 1)}
                    rx={Math.min(3, wd / 2)} fill={s.color}
                    opacity={hover == null || hover === i ? 0.9 : 0.35}
                    style={{ transition: 'opacity 0.15s' }}
                  />
                );
              })}
            </g>
          );
        })}

        {/* Line series (drawn on top of bars) */}
        {lineSeries.map((s, si) => {
          const ax = axisOf(s);
          const baseY = yFor(ax.min, ax);
          const runs = runsFor(s, ax);
          return (
            <g key={`line-${si}`}>
              {/* Soft area under the line for weight and readability */}
              {runs.map((run, i) => run.length > 1 && (
                <path
                  key={`a-${i}`}
                  d={`M ${run[0].x},${baseY} ` + run.map(p => `L ${p.x},${p.y}`).join(' ') + ` L ${run[run.length - 1].x},${baseY} Z`}
                  fill={`url(#${gid}-area-${si})`}
                />
              ))}
              {runs.map((run, i) => (
                <polyline
                  key={`l-${i}`}
                  points={run.map(p => `${p.x},${p.y}`).join(' ')}
                  fill="none" stroke={s.color} strokeWidth={2}
                  strokeLinejoin="round" strokeLinecap="round"
                />
              ))}
              {s.points.map((p, i) => p.value != null && (showDots || hover === i) && (
                <circle
                  key={i}
                  cx={xFor(i)} cy={yFor(p.value, ax)}
                  r={hover === i ? 5 : 4}
                  fill={s.color}
                  stroke="var(--surface)" strokeWidth={2}
                />
              ))}
            </g>
          );
        })}

        {/* X labels (sampled when dense) */}
        {labels.map((label, i) => showTick(i) && (
          <text
            key={i} x={xFor(i)} y={H - 10} textAnchor={anchorFor(i)} fontSize={10.5}
            fill={hover === i ? 'var(--text-primary)' : 'var(--text-muted)'}
          >
            {label}
          </text>
        ))}
      </svg>

      {/* Hover tooltip */}
      {hover != null && hoverRows.length > 0 && (
        <div
          className="chart-tooltip"
          style={{
            left: xFor(hover),
            top: PAD_T,
            transform: xFor(hover) > W * 0.6 ? 'translateX(calc(-100% - 12px))' : 'translateX(12px)',
          }}
        >
          <div className="chart-tooltip-title">{labels[hover]}</div>
          {hoverRows.map((r, i) => (
            <div key={i} className="chart-tooltip-row">
              <span className="chart-swatch" style={{ background: r.s.color }} />
              {r.s.name}
              <b>{valueOf(r.s, r.v)}</b>
            </div>
          ))}
        </div>
      )}

      {/* Legend (when more than one series) */}
      {series.length > 1 && (
        <div className="chart-legend">
          {series.map((s, i) => (
            <span key={i} className="chart-legend-item">
              <span
                className="chart-swatch"
                style={{
                  width: s.type === 'bar' ? 10 : 14,
                  height: s.type === 'bar' ? 10 : 3,
                  borderRadius: 2,
                  background: s.color,
                }}
              />
              {s.name}
              {dual && <small>({s.axis === 'right' ? 'right' : 'left'} axis)</small>}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default LineChart;
