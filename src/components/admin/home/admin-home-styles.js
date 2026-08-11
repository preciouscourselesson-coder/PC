// src/components/admin/adminHome/admin-home-styles.js
//
// Style object dipisah dari komponen supaya file komponen fokus ke
// markup & logic, dan style bisa dipakai ulang oleh sub-komponen lain
// tanpa duplikasi (sama seperti paket-siswa-styles.js).
import { C } from '../../shared/Theme';

export const cardStyle = {
  background: C.white,
  borderRadius: '16px',
  border: `1.5px solid ${C.border}`,
  padding: '1.5rem',
};

export const inputStyle = {
  padding: '8px 10px',
  borderRadius: '8px',
  border: `1px solid ${C.border}`,
  fontSize: '0.85rem',
  width: '100%',
  boxSizing: 'border-box',
};

export const labelStyle = {
  fontSize: '0.8rem',
  fontWeight: '600',
  color: C.dark,
  marginBottom: '4px',
  display: 'block',
};

export const btnPrimary = {
  background: C.gold,
  color: C.white,
  border: 'none',
  borderRadius: '8px',
  padding: '8px 14px',
  fontWeight: '600',
  cursor: 'pointer',
  fontSize: '0.85rem',
};

export const btnSecondary = {
  background: 'none',
  border: `1px solid ${C.border}`,
  borderRadius: '8px',
  padding: '8px 14px',
  fontWeight: '600',
  cursor: 'pointer',
  fontSize: '0.85rem',
  color: C.gray,
};

export const btnDelete = {
  background: C.red,
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  padding: '2px 8px',
  fontSize: '0.7rem',
  cursor: 'pointer',
};
