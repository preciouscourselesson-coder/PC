import React from 'react';
import { C } from '../constants';

// ─── Filter khusus mobile: chip yang bisa digeser horizontal ────────────────
export const FilterChip = ({ label, count, active, onClick }) => (
  <button
    onClick={onClick}
    style={{
      flexShrink: 0, whiteSpace: 'nowrap',
      display: 'inline-flex', alignItems: 'center', gap: '6px',
      padding: '8px 14px', minHeight: '40px', borderRadius: '40px',
      border: `1.5px solid ${active ? C.primary : C.border}`,
      background: active ? C.primary : C.white,
      color: active ? C.white : C.dark,
      fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit',
    }}
  >
    {label}
    <span style={{
      background: active ? 'rgba(255,255,255,0.25)' : C.primaryBg,
      color: active ? C.white : C.primary,
      padding: '1px 8px', borderRadius: '40px', fontSize: '0.7rem',
    }}>
      {count}
    </span>
  </button>
);
