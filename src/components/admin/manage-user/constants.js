// Konstanta bersama untuk modul AdminManageUser: palet warna, label, dan opsi dropdown.

export const C = {
  gold:   '#b4964b',
  dark:   '#171411',
  gray:   '#444242',
  cream:  '#f7f6f0',
  white:  '#ffffff',
  border: '#e0ddd6',
  goldBg: 'rgba(180,150,75,0.08)',
  danger: '#e74c3c',
  dangerBg: '#fff0f0',
  success: '#2e9e5b',
  successBg: '#eefaf2',
  warn: '#b7791f',
  warnBg: '#fdf6ec',
  // Dipakai khusus utk tombol filter "Semua Peran" / "Semua Status" (FiltersBar)
  // supaya warnanya beda dari tombol filter spesifik lain (yang pakai gold).
  allFilterBg: 'rgba(23,20,17,0.07)',
  allFilterBorder: 'rgba(23,20,17,0.35)',
};

export const ROLE_LABEL = {
  student: 'Siswa',
  teacher: 'Guru',
  parent:  'Wali Siswa',
  admin:   'Admin',
};

export const STATUS_LABEL = {
  approved: 'Disetujui',
  pending:  'Menunggu',
  rejected: 'Ditolak',
};

export const STATUS_COLOR = {
  approved: { color: C.success, bg: C.successBg },
  pending:  { color: C.warn,    bg: C.warnBg },
  rejected: { color: C.danger,  bg: C.dangerBg },
};

export const GENDER_LABEL = {
  L: 'Laki-laki',
  P: 'Perempuan',
};

export const KELAS_OPTIONS = ['VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
export const MAPEL_OPTIONS = ['Matematika', 'Fisika', 'Kimia', 'Bahasa Inggris'];