import React, { CSSProperties, ReactNode } from 'react';

interface CardProps {
  title?:     string;
  children:   ReactNode;
  actions?:   ReactNode;
  className?: string;
  style?: CSSProperties;
}

const Card = ({ title, children, actions, className = '', style }: CardProps) => (
  <div className={`card ${className}`} style={style}>
    {title && (
      <div className="card-header">
        <span className="card-title">{title}</span>
        {actions && <div style={{ display: 'flex', gap: 8 }}>{actions}</div>}
      </div>
    )}
    {children}
  </div>
);

export default Card;
