import React, { InputHTMLAttributes } from 'react';

interface ToggleProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

const Toggle = ({ label, ...rest }: ToggleProps) => (
  <div className="toggle-wrap">
    <label className="toggle">
      <input type="checkbox" {...rest} />
      <span className="toggle-slider" />
    </label>
    {label && <span className="toggle-label">{label}</span>}
  </div>
);

export default Toggle;
