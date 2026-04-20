import React from 'react';

interface StatCardProps {
  icon:     string;
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
        {trendUp ? '↑' : '↓'} {trend}
      </div>
    )}
  </div>
);

export default StatCard;
