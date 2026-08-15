import { C } from '../../shared/Theme';

export const MOBILE_BREAKPOINT = 768;

export const TABS = ['Dipublish', 'Draft', 'Diarsipkan'];

export const STATUS_STYLE = {
  Dipublish: { bg: C.greenBg, color: C.green },
  Draft: { bg: C.grayBg, color: C.gray },
  Diarsipkan: { bg: C.goldBg, color: C.gold },
};

// Kategori sumber materi: milik pribadi guru, materi resmi sekolah tempat mengajar,
// atau materi yang lahir dari menjawab request siswa (kategori ini TIDAK dipilih manual
// oleh guru saat upload -- hanya diisi otomatis oleh alur "Kirim Materi" di TeacherHome.js
// saat guru menjawab request dengan mengunggah file baru, lalu langsung tersimpan di arsip ini).
export const KATEGORI_OPTIONS = [
  { value: 'Pribadi', label: 'Pribadi' },
  { value: 'Sekolah', label: 'Sekolah yang Diajar' },
];

// Dipakai khusus untuk tab filter di halaman arsip (baca-saja). "Sekolah yang
// Diajar" dan "Dari Request Siswa" digabung jadi satu tab "Bersama" karena
// keduanya sama-sama materi yang berpotensi dilihat/dibagikan ke banyak
// siswa (bukan koleksi pribadi guru) -- lihat KATEGORI_FILTER_GROUPS di
// bawah untuk mapping tab ini ke nilai kategori asli di database.
export const KATEGORI_FILTER_OPTIONS = [
  { value: 'Pribadi', label: 'Pribadi' },
  { value: 'Bersama', label: 'Shared' },
];

// Setiap value tab filter di atas bisa mewakili lebih dari satu nilai
// `kategori` asli di tabel materi_file/folder_materi. "Pribadi" tetap 1:1,
// sedangkan "Bersama" mewakili gabungan 'Sekolah' dan 'Request'.
export const KATEGORI_FILTER_GROUPS = {
  Pribadi: ['Pribadi'],
  Bersama: ['Sekolah', 'Request'],
};

// Kategori asli yang dipakai saat membuat folder baru: folder hanya pernah
// dimiliki kategori 'Pribadi' atau 'Sekolah' (folder untuk 'Request' tidak
// pernah dibuat manual, karena materi Request selalu otomatis tanpa folder).
// Jadi kalau tab "Bersama" aktif, folder baru selalu dianggap kategori
// 'Sekolah'.
export const resolveKategoriForFolder = (filterKategori) => (filterKategori === 'Bersama' ? 'Sekolah' : filterKategori);

export const KATEGORI_STYLE = {
  Pribadi: { bg: C.grayBg, color: C.gray },
  Sekolah: { bg: C.greenBg, color: C.green },
  Request: { bg: C.blueBg, color: C.blue },
};

export const KATEGORI_LABEL = {
  Pribadi: 'Pribadi',
  Sekolah: 'Sekolah',
  Request: 'Dari Request',
};

// Jenis materi khusus untuk kategori Sekolah
export const JENIS_OPTIONS = ['Materi', 'Tugas', 'Penilaian Harian'];
export const JENIS_STYLE = {
  Materi: { bg: C.blueBg, color: C.blue },
  Tugas: { bg: C.goldBg, color: C.gold },
  'Penilaian Harian': { bg: C.redBg, color: C.red },
};

// Bentuk unggahan: file yang diupload, atau tautan (link) eksternal
export const BENTUK_OPTIONS = [
  { value: 'File', label: '📁 Unggah File' },
  { value: 'Link', label: '🔗 Tautan (Link)' },
];

// Pilihan mapel yang tersedia
export const MAPEL_OPTIONS = ['Matematika', 'Fisika', 'Kimia', 'Bahasa Inggris'];
export const KELAS_GROUPS = [
  { label: 'SD', options: ['I', 'II', 'III', 'IV', 'V', 'VI'] },
  { label: 'SMP', options: ['VII', 'VIII', 'IX'] },
  { label: 'SMA', options: ['X', 'XI', 'XII'] },
];
