// src/components/admin/adminAbsensi/admin-absensi-styles.js
//
// Style object dipisah dari komponen supaya file komponen fokus ke markup
// & logic, dan style bisa dipakai ulang oleh sub-komponen lain tanpa
// duplikasi.
import { C } from '../../shared/Theme';

export const selectStyle = {
  padding: '9px 12px',
  borderRadius: '9px',
  border: `1.5px solid ${C.border}`,
  fontSize: '0.85rem',
  color: C.dark,
  background: C.white,
  cursor: 'pointer',
  outline: 'none',
};
