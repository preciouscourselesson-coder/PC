import React from 'react';

export const Badge = ({ label, style }) => (
  <span style={{ padding: '2px 9px', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 'bold', background: style.bg, color: style.color, whiteSpace: 'nowrap' }}>
    {label}
  </span>
);
