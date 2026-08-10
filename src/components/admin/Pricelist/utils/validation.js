import { KELAS_OPTIONS, DURASI_OPTIONS, PENGAJAR_OPTIONS, STATUS_OPTIONS } from '../constants';

// Validasi form tambah/edit pricelist (input manual lewat UI)
export const validateForm = (form) => {
  const e = {};
  if (!form.kelas) e.kelas = 'Pilih jenjang';
  if (!form.program) e.program = 'Pilih program';
  if (!form.jumlahPertemuan) e.jumlahPertemuan = 'Pilih jumlah pertemuan';
  if (!form.durasi) e.durasi = 'Pilih durasi';
  if (!form.pengajar) e.pengajar = 'Pilih pengajar';
  if (form.hargaPrivat === '' || Number(form.hargaPrivat) <= 0) e.hargaPrivat = 'Isi harga privat';
  if (!form.tanggalBerlaku) e.tanggalBerlaku = 'Isi tanggal berlaku';
  return e;
};

// Validasi satu baris hasil parsing file import Excel. Catatan: fungsi ini
// juga mengisi default `status` jika kosong (mutasi rowObj), sama seperti
// perilaku file asli.
export const validateImportRow = (rowObj, rowNumber) => {
  const errs = [];
  if (!KELAS_OPTIONS.includes(rowObj.kelas)) errs.push(`Kelas tidak valid (harus salah satu dari: ${KELAS_OPTIONS.join(', ')})`);
  if (!rowObj.program) errs.push('Program kosong');
  if (!rowObj.jumlah_pertemuan) errs.push('Jumlah Pertemuan kosong');
  if (!DURASI_OPTIONS.includes(rowObj.durasi)) errs.push(`Durasi tidak valid (harus salah satu dari: ${DURASI_OPTIONS.join(', ')})`);
  if (!PENGAJAR_OPTIONS.includes(rowObj.pengajar)) errs.push(`Pengajar tidak valid (harus salah satu dari: ${PENGAJAR_OPTIONS.join(', ')})`);
  if (rowObj.harga_privat === '' || Number.isNaN(Number(rowObj.harga_privat)) || Number(rowObj.harga_privat) <= 0) errs.push('Harga Privat harus angka > 0');
  if (!rowObj.status) rowObj.status = 'Draft';
  else if (!STATUS_OPTIONS.includes(rowObj.status)) errs.push(`Status tidak valid (harus salah satu dari: ${STATUS_OPTIONS.join(', ')})`);
  if (!rowObj.tanggal_berlaku || !/^\d{4}-\d{2}-\d{2}$/.test(rowObj.tanggal_berlaku)) errs.push('Tanggal Berlaku harus format YYYY-MM-DD');
  return errs.length > 0 ? `Baris ${rowNumber}: ${errs.join('; ')}` : null;
};
