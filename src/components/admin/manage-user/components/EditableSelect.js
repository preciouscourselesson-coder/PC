// Select "hantu" (ghost select): defaultnya tampil seperti teks biasa, tanpa
// border/kotak, supaya baris tabel tidak terasa penuh dropdown. Border,
// background, dan panah baru terlihat jelas saat kolom ini di-hover/fokus —
// jadi tetap kelihatan bisa diklik (ada panah kecil transparan), tapi tidak
// bikin tabel berisik saat sekadar dibaca.
import React, { useState } from 'react';
import { C } from '../constants';

const EditableSelect = ({
  value,
  onChange,
  disabled,
  options,            // [{ value, label }]
  placeholder = 'Belum diisi',
  allowEmpty = true,
  valueColor,         // optional: warna teks khusus utk value yang terisi (mis. warna per-peran)
  minWidth = '96px',
}) => {
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  const active = hover || focus;
  const displayColor = value ? (valueColor || C.dark) : C.gray;

  return (
    <div
      style={{ position: 'relative', display: 'inline-block', minWidth }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <select
        value={value || ''}
        disabled={disabled}
        onChange={onChange}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={{
          width: '100%',
          appearance: 'none',
          WebkitAppearance: 'none',
          MozAppearance: 'none',
          padding: '6px 22px 6px 8px',
          borderRadius: '8px',
          border: `1.5px solid ${active ? C.border : 'transparent'}`,
          background: active ? C.white : 'transparent',
          fontSize: '0.83rem',
          fontFamily: 'inherit',
          fontWeight: value ? 600 : 400,
          color: disabled ? C.gray : displayColor,
          cursor: disabled ? 'not-allowed' : 'pointer',
          outline: 'none',
          transition: 'background 0.12s ease, border-color 0.12s ease',
        }}
      >
        {allowEmpty && <option value="">{placeholder}</option>}
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {/* Panah kecil: samar saat idle, lebih jelas saat hover/fokus — penanda halus "ini bisa diklik" */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)',
          fontSize: '0.6rem', color: C.gray, opacity: disabled ? 0 : (active ? 0.85 : 0.3),
          pointerEvents: 'none', transition: 'opacity 0.12s ease',
        }}
      >
        ▾
      </span>
    </div>
  );
};

export default EditableSelect;
