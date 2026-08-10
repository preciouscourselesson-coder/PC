// src/components/admin/adminAbsensi/admin-absensi-helpers.js
//
// Semua fungsi & konstanta di sini murni ("pure") -- tidak ada state,
// tidak ada side effect, tidak ada panggilan Supabase. Dipindahkan apa
// adanya dari AdminAbsensi.js supaya bisa di-unit-test terpisah dari UI.
import { C } from '../../Theme';

export const MOBILE_BREAKPOINT = 768;

export const initials = (name = '') =>
  name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const AVATAR_PALETTE = ['#b4964b', '#2d6a4f', '#7a5c9e', '#3f7ea6', '#b0413e', '#a3760f'];

export const avatarColor = (name = '') => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
};

export const formatTanggalDisplay = (isoDate) => {
  if (!isoDate) return '-';
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
};

const BULAN_NAMA = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export const formatTanggalIndo = (isoDate) => {
  if (!isoDate) return '-';
  const [y, m, d] = isoDate.split('-');
  return `${parseInt(d, 10)} ${BULAN_NAMA[parseInt(m, 10) - 1]} ${y}`;
};

export const bulanFromIso = (isoDate) => {
  if (!isoDate) return '';
  const [y, m] = isoDate.split('-');
  return `${BULAN_NAMA[parseInt(m, 10) - 1]} ${y}`;
};

export const fileTypeFromUrl = (url = '') => (url.toLowerCase().endsWith('.pdf') ? 'pdf' : 'img');
export const fileNameFromUrl = (url = '') => decodeURIComponent(url.split('/').pop() || 'file');

export const statusStyle = (status) => {
  if (status === 'Disetujui') return { bg: C.greenBg, fg: C.green };
  if (status === 'Ditolak') return { bg: C.redBg, fg: C.red };
  return { bg: C.amberBg, fg: C.amber };
};
