import { STATUS_SISWA_SETUJU } from '../constants';

/**
 * Menentukan status gabungan untuk satu pengajuan perubahan jadwal yang bisa
 * terdiri dari beberapa baris (pengajuan batch/grup, satu baris per siswa).
 * Bukan batch (cuma 1 siswa) -> tampilkan status aslinya langsung, tidak
 * perlu logika agregat.
 */
export const getAggregateStatus = (rows) => {
  if (rows.length === 1) return rows[0].status;
  if (rows.some((r) => r.status === 'ditolak')) return 'ditolak';
  if (rows.some((r) => r.status === 'ditolak_admin')) return 'ditolak_admin';
  if (rows.every((r) => r.status === 'disetujui_admin')) return 'disetujui_admin';
  if (rows.every((r) => r.status === 'disetujui_menunggu_admin')) return 'disetujui_menunggu_admin';
  if (rows.some((r) => STATUS_SISWA_SETUJU.includes(r.status))) return 'disetujui_siswa';
  return 'menunggu_persetujuan';
};
