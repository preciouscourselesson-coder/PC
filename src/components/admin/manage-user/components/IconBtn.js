// Tombol ikon bulat yang dipakai berulang di kolom Aksi tabel.
import React from 'react';

const IconBtn = ({ onClick, disabled, title, color, bg, border, children }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    aria-label={title}
    style={{
      width: '30px', height: '30px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      borderRadius: '8px', border: `1.5px solid ${border}`, background: bg, color,
      cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1, padding: 0,
    }}
  >
    {children}
  </button>
);

export default IconBtn;
