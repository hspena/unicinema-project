import React from 'react';
import { BarChartItem } from '../../types';
import { pctText } from '../../utils/metrics';

interface BarChartProps {
  data: BarChartItem[];
  /** Formats the trailing value. Default: locale integer. */
  format?: (n: number) => string;
  /** Show each bar's share of the total beside its value. Only meaningful when
   *  the values are parts of a whole (tickets, bookings) — off for averages. */
  showShare?: boolean;
  /** Fixed upper bound for the bars. Default: the largest value in the data. */
  max?: number;
}

const BarChart = ({ data, format, showShare = true, max }: BarChartProps) => {
  const top   = max ?? Math.max(...data.map((d) => d.value), 1);
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const fmt   = format ?? ((n: number) => n.toLocaleString());

  return (
    <div className="bar-chart">
      {data.map((d, i) => {
        const share = total > 0 ? (d.value / total) * 100 : 0;
        return (
          <div
            key={i}
            className="bar-row"
            title={`${d.label} — ${fmt(d.value)}${showShare && total > 0 ? ` (${share.toFixed(1)}%)` : ''}`}
          >
            <span className="bar-label">{d.label}</span>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{
                  width: `${Math.min((d.value / top) * 100, 100)}%`,
                  animationDelay: `${Math.min(i, 8) * 55}ms`,
                }}
              />
            </div>
            <span className="bar-value">
              {fmt(d.value)}
              {showShare && total > 0 && <span className="bar-share">{pctText(share)}</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default BarChart;
