import React, { ReactNode } from 'react';

interface CardProps {
  title?:     string;
  children:   ReactNode;
  actions?:   ReactNode;
  className?: string;
}

const Card = ({ title, children, actions, className = '' }: CardProps) => (
  <div className={`card ${className}`}>
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
