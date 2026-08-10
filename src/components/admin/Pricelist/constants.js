import { C, D } from '../../Theme';

// ------------------------------------------------------------------
// Opsi dropdown -- disamakan dengan sheet "PRICE_LIST" & "INPUT DATA
// PRICE LIST" pada Pricelist_Precious_Course.xlsx yang diberikan user.
// ------------------------------------------------------------------
export const KELAS_OPTIONS = ['SMA', 'SMP'];
export const PROGRAM_OPTIONS = [
  'Math Focus',
  'English Focus',
  'Math & English Combo',
  'Complete Science',
  'SNBT Program',
  'Intensive',
];
export const PERTEMUAN_OPTIONS = [
  '1x per minggu (4 pertemuan satu bulan)',
  '2x per minggu (8 pertemuan satu bulan)',
  '4x dalam satu minggu',
];
export const DURASI_OPTIONS = ['60 Menit', '90 Menit'];
export const PENGAJAR_OPTIONS = ['Profesional', 'Mahasiswa'];
export const STATUS_OPTIONS = ['Aktif', 'Draft', 'Nonaktif'];

export const STATUS_META = {
  Aktif: { bg: C.greenBg, fg: C.green, dot: C.green },
  Draft: { bg: C.amberBg, fg: C.amber, dot: C.amber },
  Nonaktif: { bg: C.grayBg, fg: C.gray, dot: C.gray },
};

export const FIELD_LABELS = {
  kelas: 'Kelas',
  program: 'Program',
  jumlah_pertemuan: 'Jumlah Pertemuan',
  durasi: 'Durasi',
  pengajar: 'Pengajar',
  harga_privat: 'Harga Privat',
  harga_2siswa: 'Harga 2 Siswa',
  harga_3siswa: 'Harga 3 Siswa',
  harga_4siswa: 'Harga 4 Siswa',
  status: 'Status',
  tanggal_berlaku: 'Tanggal Berlaku',
};
export const HARGA_FIELDS = new Set(['harga_privat', 'harga_2siswa', 'harga_3siswa', 'harga_4siswa']);

export const PRICELIST_TABLE = 'pricelist';
export const RIWAYAT_TABLE = 'pricelist_riwayat';
export const PAGE_SIZE = 8;

// ------------------------------------------------------------------
// Kolom untuk template import & export CSV. Urutan & label kolom ini
// yang akan muncul di file .csv, key merujuk ke nama kolom tabel DB.
// ------------------------------------------------------------------
export const CSV_COLUMNS = [
  { key: 'kelas', label: 'Kelas' },
  { key: 'program', label: 'Program' },
  { key: 'jumlah_pertemuan', label: 'Jumlah Pertemuan' },
  { key: 'durasi', label: 'Durasi' },
  { key: 'pengajar', label: 'Pengajar' },
  { key: 'harga_privat', label: 'Harga Privat' },
  { key: 'harga_2siswa', label: 'Harga 2 Siswa' },
  { key: 'harga_3siswa', label: 'Harga 3 Siswa' },
  { key: 'harga_4siswa', label: 'Harga 4 Siswa' },
  { key: 'status', label: 'Status' },
  { key: 'tanggal_berlaku', label: 'Tanggal Berlaku (YYYY-MM-DD)' },
];

export const CSV_TEMPLATE_EXAMPLE = {
  kelas: 'SMA',
  program: 'Math Focus',
  jumlah_pertemuan: '1x per minggu (4 pertemuan satu bulan)',
  durasi: '60 Menit',
  pengajar: 'Profesional',
  harga_privat: '500000',
  harga_2siswa: '450000',
  harga_3siswa: '400000',
  harga_4siswa: '350000',
  status: 'Draft',
  tanggal_berlaku: '2026-08-01',
};

export const SHEET_NAME = 'Pricelist';

export const emptyForm = {
  kelas: KELAS_OPTIONS[0],
  program: PROGRAM_OPTIONS[0],
  jumlahPertemuan: PERTEMUAN_OPTIONS[0],
  durasi: DURASI_OPTIONS[0],
  pengajar: PENGAJAR_OPTIONS[0],
  hargaPrivat: '',
  harga2: '',
  harga3: '',
  harga4: '',
  status: 'Draft',
  tanggalBerlaku: '',
};

// Dipakai ulang oleh beberapa komponen (Theme di-passthrough dari sini
// supaya sub-komponen tidak perlu menghitung ulang path relatif ke Theme).
export { C, D };
