import React, { ReactNode } from 'react';
import { TrendingUp, TrendingDown } from '../../utils/icons';

interface StatCardProps {
  icon:     ReactNode;
  value:    string | number;
  label:    string;
  trend?:   string;
  trendUp?: boolean;
  delay?:   number; // 1–4 for staggered animation
}

const StatCard = ({ icon, value, label, trend, trendUp, delay }: StatCardProps) => (
  <div className={`stat-card ${delay ? `fade-up-${delay}` : 'fade-up'}`}>
    <div className="stat-card-icon">{icon}</div>
    <div className="stat-card-value">{value}</div>
    <div className="stat-card-label">{label}</div>
    {trend && (
      <div className={`stat-card-trend ${trendUp ? 'trend-up' : 'trend-down'}`}>
        {trendUp ? <TrendingUp size={13} /> : <TrendingDown size={13} />} {trend}
      </div>
    )}
  </div>
);

export default StatCard;
