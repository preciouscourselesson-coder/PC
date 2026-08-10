import { FIELD_LABELS, HARGA_FIELDS } from '../constants';
import { formatRupiah, formatTanggalDisplay } from './format';

// Bandingkan baris lama vs baru, hasilkan daftar baris teks perubahan
// per field (dipakai untuk kolom `perubahan` pada tabel riwayat).
export const buildDiffText = (oldRow, newRow) => {
  const lines = [];
  Object.keys(FIELD_LABELS).forEach((key) => {
    const oldVal = oldRow ? oldRow[key] : undefined;
    const newVal = newRow[key];
    const oldNorm = oldVal === null || oldVal === undefined ? '' : String(oldVal);
    const newNorm = newVal === null || newVal === undefined ? '' : String(newVal);
    if (oldNorm === newNorm) return;
    const label = FIELD_LABELS[key];
    if (HARGA_FIELDS.has(key)) {
      lines.push(`${label}: ${formatRupiah(oldVal || 0)} \u2192 ${formatRupiah(newVal || 0)}`);
    } else if (key === 'tanggal_berlaku') {
      lines.push(`${label}: ${formatTanggalDisplay(oldVal)} \u2192 ${formatTanggalDisplay(newVal)}`);
    } else {
      lines.push(`${label}: ${oldNorm || '-'} \u2192 ${newNorm || '-'}`);
    }
  });
  return lines;
};
