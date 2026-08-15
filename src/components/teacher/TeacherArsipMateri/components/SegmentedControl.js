import React from 'react';
import { C } from '../../../shared/Theme';

export const SegmentedControl = ({ options, value, onChange, disabled }) => (
  <div style={{ display: 'flex', gap: '6px', background: C.cream, padding: '4px', borderRadius: '10px', border: `1.5px solid ${C.border}` }}>
    {options.map(opt => (
      <button
        key={opt.value}
        type="button"
        disabled={disabled}
        onClick={() => onChange(opt.value)}
        style={{
          flex: 1, padding: '8px 10px', borderRadius: '7px', border: 'none',
          cursor: disabled ? 'default' : 'pointer', fontFamily: 'inherit', fontSize: '0.82rem',
          fontWeight: value === opt.value ? 'bold' : 'normal',
          background: value === opt.value ? C.white : 'transparent',
          color: value === opt.value ? C.dark : C.gray,
          boxShadow: value === opt.value ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
        }}
      >
        {opt.label}
      </button>
    ))}
  </div>
);
