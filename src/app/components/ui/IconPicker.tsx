import React from 'react';
import { resolveIcon } from '../../utils/icons';

interface IconPickerProps {
  value:    string;
  onChange: (key: string) => void;
  options:  string[];   // icon keys (see ICON_LIBRARY)
  size?:    number;
}

/** Grid of selectable Lucide icons — used wherever the data model previously stored a raw emoji glyph. */
const IconPicker = ({ value, onChange, options, size = 18 }: IconPickerProps) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
    {options.map(key => {
      const Icon = resolveIcon(key);
      const active = value === key;
      return (
        <button
          type="button"
          key={key}
          title={key}
          onClick={() => onChange(key)}
          style={{
            width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 'var(--radius)', cursor: 'pointer',
            border: `1px solid ${active ? 'var(--gold)' : 'var(--border)'}`,
            background: active ? 'var(--gold-dim)' : 'var(--navy)',
            color: active ? 'var(--gold)' : 'var(--text-muted)',
            transition: 'all var(--transition)',
          }}
        >
          <Icon size={size} />
        </button>
      );
    })}
  </div>
);

export default IconPicker;
