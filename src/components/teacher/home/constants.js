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

// Daftar mapel tetap, sama seperti yang dipakai di form "Tambah Tugas/Penilaian" milik siswa
// (StudentHome.js). Dipakai untuk menerjemahkan value teks (mis. 'matematika') jadi label.
export const MAPEL_TUGAS_LIST = [
  { value: 'matematika', label: 'Matematika' },
  { value: 'fisika', label: 'Fisika' },
  { value: 'kimia', label: 'Kimia' },
  { value: 'bahasa_inggris', label: 'Bahasa Inggris' },
];

export const MOBILE_BREAKPOINT = 768;

// Status pengajuan perubahan jadwal yang dianggap "sudah disetujui siswa"
// (dipakai untuk menghitung status gabungan pengajuan batch/grup).
export const STATUS_SISWA_SETUJU = ['disetujui_siswa', 'disetujui_menunggu_admin', 'disetujui_admin'];

// Konversi hasil Date.getDay() (0=Minggu..6=Sabtu) ke index HARI_LIST (0=Senin..6=Minggu)
export const HARI_INDEX_FROM_GETDAY = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 0: 6 };
