// src/components/admin/paketSiswa/paketSiswaStyles.js
//
// Style object/helper dipisah dari komponen supaya file komponen fokus ke
// markup & logic, dan style bisa dipakai ulang oleh sub-komponen lain
// (FormTambahSiswa, PaketSiswaTable, dst) tanpa duplikasi.
import { C } from '../../Theme';

export const inputStyle = (hasError) => ({
  width: '100%',
  padding: '9px 12px',
  borderRadius: '10px',
  border: `1.5px solid ${hasError ? C.red : C.border}`,
  fontSize: '0.85rem',
  color: C.dark,
  fontFamily: 'inherit',
  background: C.white,
  outline: 'none',
  boxSizing: 'border-box',
});

export const labelStyle = {
  display: 'block',
  fontSize: '0.72rem',
  fontWeight: 600,
  color: C.gray,
  marginBottom: '6px',
};

export const iconBtnStyle = (bg, fg) => ({
  width: '26px',
  height: '26px',
  borderRadius: '50%',
  border: 'none',
  background: bg,
  color: fg,
  fontSize: '0.75rem',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
});

export const cardStyle = {
  background: C.white,
  borderRadius: '16px',
  border: `1.5px solid ${C.border}`,
  padding: '1.5rem',
  boxSizing: 'border-box',
};

export const errorTextStyle = { color: C.red, fontSize: '0.75rem', marginTop: '4px' };