import { C, HARI_LIST, HARI_INDEX_FROM_GETDAY } from '../constants';

export const getHariFromTanggal = (tanggalStr) => {
  if (!tanggalStr) return '';
  const d = new Date(`${tanggalStr}T00:00:00`);
  if (isNaN(d.getTime())) return '';
  return HARI_LIST[HARI_INDEX_FROM_GETDAY[d.getDay()]];
};

/** Cari tanggal terdekat (hari ini atau setelahnya) yang jatuh pada hari tertentu */
export const nextTanggalForHari = (hari) => {
  const targetIdx = HARI_LIST.indexOf(hari);
  if (targetIdx === -1) return '';
  const today = new Date();
  const todayIdx = HARI_INDEX_FROM_GETDAY[today.getDay()];
  let diff = targetIdx - todayIdx;
  if (diff < 0) diff += 7;
  const hasil = new Date(today);
  hasil.setDate(today.getDate() + diff);
  return hasil.toISOString().slice(0, 10);
};

/** Menentukan huruf & warna badge jenis kelas: "G" (Group/Kelompok) atau "P" (Private) */
export const badgeForJenis = (jenis) => {
  const isGroup = (jenis || '').toLowerCase().startsWith('group') || (jenis || '').toLowerCase().startsWith('kelompok');
  return isGroup ? { letter: 'G', color: C.gold } : { letter: 'P', color: C.green };
};

/** Nama siswa (tunggal atau gabungan, untuk kelas kelompok) pada satu baris jadwal */
export const displayNamaSiswa = (jadwalRow, studentNameMap) => {
  if (jadwalRow.siswa_id) return studentNameMap[jadwalRow.siswa_id] || jadwalRow.siswa_id;
  if (Array.isArray(jadwalRow.siswa_ids) && jadwalRow.siswa_ids.length > 0) {
    return jadwalRow.siswa_ids.map((id) => studentNameMap[id] || id).join(', ');
  }
  return '-';
};
