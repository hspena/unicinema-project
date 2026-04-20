import React from 'react';
import { BarChartItem } from '../../types';

interface BarChartProps {
  data: BarChartItem[];
}

const BarChart = ({ data }: BarChartProps) => {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="bar-chart">
      {data.map((d, i) => (
        <div key={i} className="bar-row">
          <span className="bar-label">{d.label}</span>
          <div className="bar-track">
            <div
              className="bar-fill"
              style={{ width: `${(d.value / max) * 100}%` }}
            />
          </div>
          <span className="bar-value">{d.value}</span>
        </div>
      ))}
    </div>
  );
};

export default BarChart;
