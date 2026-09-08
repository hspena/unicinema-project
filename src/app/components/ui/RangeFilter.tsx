import React from 'react';
import { TimeRange, TIME_RANGES } from '../../utils/metrics';

interface RangeFilterProps {
  value:    TimeRange;
  onChange: (r: TimeRange) => void;
  /** Optional note shown beside the pills, e.g. the resolved date span. */
  hint?:    string;
}

/** Time-range pills. Sits in one row above the figures it governs. */
const RangeFilter = ({ value, onChange, hint }: RangeFilterProps) => (
  <div className="range-filter">
    <div className="range-pills" role="group" aria-label="Time range">
      {TIME_RANGES.map(r => (
        <button
          key={r.key}
          type="button"
          className={`range-pill ${value === r.key ? 'is-active' : ''}`}
          aria-pressed={value === r.key}
          onClick={() => onChange(r.key)}
        >
          {r.label}
        </button>
      ))}
    </div>
    {hint && <span className="range-hint">{hint}</span>}
  </div>
);

export default RangeFilter;
