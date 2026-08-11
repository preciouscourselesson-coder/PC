import React from 'react';

export const IconBtn = ({ title, color, bg, onClick, children, disabled }) => (
  <button
    title={title}
    onClick={onClick}
    disabled={disabled}
    style={{
      width: '30px', height: '30px', borderRadius: '8px', border: 'none',
      background: bg, color, display: 'flex', alignItems: 'center',
      justifyContent: 'center', cursor: disabled ? 'not-allowed' : 'pointer',
      fontSize: '0.9rem', flexShrink: 0, opacity: disabled ? 0.6 : 1,
    }}
  >
    {children}
  </button>
);

export default IconBtn;
