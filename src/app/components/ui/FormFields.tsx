import React, { InputHTMLAttributes, SelectHTMLAttributes } from 'react';

// ─── InputField ───────────────────────────────────────────────────────────────
interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const InputField = ({ label, className = '', ...rest }: InputFieldProps) => (
  <div className="input-group">
    {label && <label className="input-label">{label}</label>}
    <input className={`input-field ${className}`} {...rest} />
  </div>
);

// ─── SelectField ──────────────────────────────────────────────────────────────
interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?:   string;
  options:  SelectOption[];
}

export const SelectField = ({
  label,
  options,
  className = '',
  ...rest
}: SelectFieldProps) => (
  <div className="input-group">
    {label && <label className="input-label">{label}</label>}
    <select className={`select-field ${className}`} {...rest}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  </div>
);
