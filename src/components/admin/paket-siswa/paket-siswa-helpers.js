// src/components/admin/paketSiswa/paketSiswaHelpers.js
//
// Semua fungsi & konstanta di sini murni ("pure") -- tidak ada state,
// tidak ada side effect, tidak ada panggilan Supabase. Dipindahkan apa
// adanya dari PaketSiswa.js supaya bisa di-unit-test terpisah dari UI.
import { C } from '../../shared/Theme';

export const STATUS_META = {
  Aktif: { bg: C.greenBg, fg: C.green, dot: C.green },
  'Akan Berakhir': { bg: C.amberBg, fg: C.amber, dot: C.amber },
  Berakhir: { bg: C.grayBg, fg: C.gray, dot: C.gray },
  Selesai: { bg: C.grayBg, fg: C.gray, dot: C.gray },
};

// Badge untuk jenis pengajar (menentukan tarif pricelist yang dipakai)
export const PENGAJAR_META = {
  Profesional: { bg: C.amberBg, fg: C.amber, icon: '🎓' },
  Mahasiswa: { bg: C.blueBg, fg: C.blue, icon: '📘' },
};

export const getPengajarMeta = (pengajar) =>
  PENGAJAR_META[pengajar] || { bg: C.grayBg, fg: C.gray, icon: '👤' };

export const formatRupiah = (value) => {
  const num = Number(value) || 0;
  return 'Rp' + num.toLocaleString('id-ID');
};

// Hitung harga pricelist sesuai jenis paket (Private/Group) & jumlah siswa group.
// Disamakan persis dengan getHargaPaket di InvoicePaketSiswa.js agar Total Harga
// yang ditampilkan di sini konsisten dengan nominal yang muncul di invoice.
export const getHargaPaket = (jenis, jumlahGroup, pricelist) => {
  if (!pricelist) return 0;
  if (jenis !== 'Group') return pricelist.harga_privat || 0;
  if (jumlahGroup === 2) return pricelist.harga_2siswa ?? pricelist.harga_privat ?? 0;
  if (jumlahGroup === 3) return pricelist.harga_3siswa ?? pricelist.harga_privat ?? 0;
  if (jumlahGroup === 4) return pricelist.harga_4siswa ?? pricelist.harga_privat ?? 0;
  return pricelist.harga_privat || 0;
};

const BULAN_SINGKAT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export const formatTanggal = (isoDate) => {
  if (!isoDate) return '-';
  const [y, m, d] = isoDate.split('-');
  const bulan = BULAN_SINGKAT[parseInt(m, 10) - 1] || m;
  return `${d} ${bulan} ${y}`;
};

// Kolom pricelist.jumlah_pertemuan berisi teks deskriptif, contoh:
// "2x per minggu (8 pertemuan satu bulan)". Untuk disimpan sebagai integer
// di paket_siswa.total_pertemuan, ambil angka di dalam tanda kurung (mis. 8).
export const extractJumlahPertemuan = (text) => {
  if (!text) return 0;
  const match = String(text).match(/\((\d+)\s*pertemuan/i);
  if (match) return parseInt(match[1], 10);
  // Fallback: kalau formatnya tidak sesuai pola di atas, ambil angka pertama yang ditemukan
  const fallback = String(text).match(/\d+/);
  return fallback ? parseInt(fallback[0], 10) : 0;
};

export const generateSiswaId = (createdAt, index) => {
  if (!createdAt) return `SIS-${String(index + 1).padStart(4, '0')}`;
  const d = new Date(createdAt);
  const y = String(d.getFullYear()).slice(2);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `SIS-${y}${m}${day}${String(index + 1).padStart(2, '0')}`;
};

// Label dropdown paket: gabungan program · kelas · jumlah pertemuan · durasi · pengajar
export const formatPaketLabel = (p) => {
  const parts = [p.program];
  if (p.kelas) parts.push(p.kelas);
  if (p.jumlah_pertemuan) parts.push(`${p.jumlah_pertemuan}x pertemuan`);
  if (p.durasi) parts.push(p.durasi);
  if (p.pengajar) parts.push(p.pengajar);
  return parts.join(' · ');
};

// Opsi filter Durasi & Pengajar -- disamakan dengan opsi pada Pricelist.js
export const KELAS_OPTIONS = ['SMA', 'SMP'];
export const DURASI_OPTIONS = ['60 Menit', '90 Menit'];
export const PENGAJAR_OPTIONS = ['Profesional', 'Mahasiswa'];

export const PAGE_SIZE = 8;