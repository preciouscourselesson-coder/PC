export const C = {
  gold: '#b4964b',
  goldBg: '#f6efdc',
  green: '#2d6a4f',
  greenBg: '#e4efe9',
  red: '#b3423a',
  redBg: '#fbeceb',
  dark: '#171411',
  gray: '#444242',
  grayLight: '#8a8782',
  cream: '#f7f6f0',
  white: '#ffffff',
  border: '#e0ddd6',
};

export const HARI_LIST = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

export const MAPEL_TUGAS_LIST = [
  { value: 'matematika', label: 'Matematika' },
  { value: 'fisika', label: 'Fisika' },
  { value: 'kimia', label: 'Kimia' },
  { value: 'bahasa_inggris', label: 'Bahasa Inggris' },
];

// Ukuran maksimal file gambar catatan (5MB)
export const MAX_CATATAN_GAMBAR_SIZE = 5 * 1024 * 1024;

// Ukuran maksimal file lampiran permintaan materi (10MB)
export const MAX_MATERI_FILE_SIZE = 10 * 1024 * 1024;
// Ekstensi file yang diizinkan untuk lampiran permintaan materi
export const MATERI_FILE_ACCEPT = '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.webp';

// Status pengajuan perubahan jadwal yang dianggap "sudah disetujui siswa"
// (dipakai untuk menghitung progres persetujuan pada pengajuan batch/grup).
export const STATUS_SISWA_SETUJU = ['disetujui_siswa', 'disetujui_menunggu_admin', 'disetujui_admin'];

// Konversi hasil Date.getDay() (0=Minggu..6=Sabtu) ke index HARI_LIST (0=Senin..6=Minggu)
export const HARI_INDEX_FROM_GETDAY = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 0: 6 };
