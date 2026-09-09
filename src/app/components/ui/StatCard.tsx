import React, { ReactNode } from 'react';
import { TrendingUp, TrendingDown } from '../../utils/icons';

interface StatCardProps {
  icon:     ReactNode;
  value:    string | number;
  label:    string;
  /** Context line under the label — the denominator, the comparison, the "of what". */
  sub?:     string;
  /** Tone for the sub line. 'muted' (default) for context, 'good'/'bad' for a verdict. */
  subTone?: 'muted' | 'good' | 'bad';
  trend?:   string;
  trendUp?: boolean;
  color?:   string;
  delay?:   number; // 1–5 for staggered animation
}

const TONE: Record<string, string> = {
  muted: 'var(--text-muted)',
  good:  'var(--success)',
  bad:   'var(--danger)',
};

const StatCard = ({ icon, value, label, sub, subTone = 'muted', trend, trendUp, color, delay }: StatCardProps) => (
  <div className={`stat-card ${delay ? `fade-up-${delay}` : 'fade-up'}`}>
    <div className="stat-card-icon">{icon}</div>
    <div className="stat-card-value" style={color ? { color } : undefined}>{value}</div>
    <div className="stat-card-label">{label}</div>
    {sub && <div className="stat-card-sub" style={{ color: TONE[subTone] }}>{sub}</div>}
    {trend && (
      <div className={`stat-card-trend ${trendUp ? 'trend-up' : 'trend-down'}`}>
        {trendUp ? <TrendingUp size={13} /> : <TrendingDown size={13} />} {trend}
      </div>
    )}
  </div>
);

export default StatCard;
