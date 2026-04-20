import React, { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'outline' | 'danger';
type Size    = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:  Variant;
  size?:     Size;
  icon?:     ReactNode;
  children?: ReactNode;
}

const Button = ({
  children,
  variant = 'primary',
  size    = 'md',
  icon,
  className = '',
  ...rest
}: ButtonProps) => (
  <button
    className={`btn btn-${variant} ${size === 'sm' ? 'btn-sm' : ''} ${className}`}
    {...rest}
  >
    {icon && <span>{icon}</span>}
    {children}
  </button>
);

export default Button;
