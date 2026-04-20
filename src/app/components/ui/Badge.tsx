import React, { CSSProperties, ReactNode } from 'react';

type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'gold' | 'muted';

interface BadgeProps {
  children:  ReactNode;
  variant?:  BadgeVariant;
  style?:    CSSProperties;
  onClick?:  () => void;
}

const Badge = ({ children, variant = 'muted', style, onClick }: BadgeProps) => (
  <span
    className={`badge badge-${variant}`}
    style={style}
    onClick={onClick}
  >
    {children}
  </span>
);

export default Badge;
