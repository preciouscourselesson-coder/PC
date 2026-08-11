// ─────────────────────────────────────────────────────────────────────────
// Palet warna & konstanta tampilan yang dipakai di seluruh sub-komponen
// AdminPengaturanMateri (tab-tab, badge status, pagination, dsb).
// ─────────────────────────────────────────────────────────────────────────

export const C = {
  gold: '#b4964b',
  dark: '#171411',
  gray: '#444242',
  cream: '#f7f6f0',
  white: '#ffffff',
  border: '#e0ddd6',
  goldBg: 'rgba(180,150,75,0.10)',
  danger: '#e74c3c',
  dangerBg: '#fff0f0',
  success: '#2e9e5b',
  successBg: '#eefaf2',
  warn: '#b7791f',
  warnBg: '#fdf6ec',
  blue: '#2f6fed',
  blueBg: 'rgba(47,111,237,0.10)',
};

// Status di database materi_file tetap 'Dipublish' | 'Draft' | 'Diarsipkan'.
// Di tampilan admin, 'Dipublish' ditampilkan dengan label 'Aktif'.
export const STATUS_DB_TO_LABEL = {
  Dipublish: 'Aktif',
  Draft: 'Draft',
  Diarsipkan: 'Diarsipkan',
};

export const STATUS_COLOR = {
  Dipublish: { color: C.success, bg: C.successBg },
  Draft: { color: C.warn, bg: C.warnBg },
  Diarsipkan: { color: C.gold, bg: C.goldBg },
};

export const MATERI_TABS = [
  { key: '', label: 'Semua' },
  { key: 'Dipublish', label: 'Aktif' },
  { key: 'Diarsipkan', label: 'Diarsipkan' },
];

export const SESI_STATUS_COLOR = {
  Menunggu: { color: C.warn, bg: C.warnBg },
  Disetujui: { color: C.success, bg: C.successBg },
  Ditolak: { color: C.danger, bg: C.dangerBg },
};

export const SESI_TABS = [
  { key: '', label: 'Semua' },
  { key: 'Menunggu', label: 'Menunggu' },
  { key: 'Disetujui', label: 'Disetujui' },
  { key: 'Ditolak', label: 'Ditolak' },
];

export const JENIS_COLOR = {
  Ulangan: { color: C.blue, bg: C.blueBg },
  Penugasan: { color: C.warn, bg: C.warnBg },
};

export const BANK_TABS = [
  { key: '', label: 'Semua' },
  { key: 'Ulangan', label: 'Ulangan (PH)' },
  { key: 'Penugasan', label: 'Tugas' },
];

export const SOURCE_TABS = [
  { key: 'materi', label: '📘 Materi Guru' },
  { key: 'sesi', label: '📝 Sesi Pembelajaran' },
  { key: 'bank', label: '🗂️ Bank Soal Siswa' },
];

export const PAGE_SIZE = 20;

export const selectStyle = {
  padding: '9px 12px', borderRadius: '10px', border: `1.5px solid ${C.border}`,
  fontSize: '0.85rem', color: C.dark, background: C.white, fontFamily: 'inherit', cursor: 'pointer',
};

export const pagerBtnStyle = (disabled) => ({
  padding: '7px 14px', borderRadius: '8px', border: `1.5px solid ${C.border}`,
  background: C.white, color: C.gray, cursor: disabled ? 'not-allowed' : 'pointer',
  fontFamily: 'inherit', opacity: disabled ? 0.5 : 1,
});
