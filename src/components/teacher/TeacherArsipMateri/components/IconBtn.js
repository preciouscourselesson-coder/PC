import React from 'react';

export const IconBtn = ({ title, color, bg, onClick, children, size = 30 }) => (
  <button
    title={title}
    onClick={onClick}
    style={{
      width: `${size}px`, height: `${size}px`, borderRadius: '8px', border: 'none',
      background: bg, color, display: 'flex', alignItems: 'center',
      justifyContent: 'center', cursor: 'pointer', fontSize: '0.9rem', flexShrink: 0,
    }}
  >
    {children}
  </button>
);
