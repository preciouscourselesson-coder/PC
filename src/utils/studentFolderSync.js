// utils/studentFolderSync.js
//
// Logika untuk membuat & menghapus folder_materi secara OTOMATIS berdasarkan
// daftar siswa yang diajar oleh guru (jadwal_les), dipakai bareng oleh
// TeacherArsipMateri.js dan TeacherListStudent.js supaya folder selalu
// sinkron dari kedua sisi:
//   - TeacherListStudent -> saat siswa dihapus dari jadwal, folder ikut dihapus.
//   - TeacherArsipMateri -> saat guru membuka arsip, folder utk siswa baru dibuat
//     (dan di sinilah konflik nama folder ditanyakan ke guru, lewat onDuplicateConfirm).
//
// PENTING soal skema database: folder_materi butuh kolom baru `siswa_id`
// (uuid, nullable, referensi ke profiles.id) untuk MENGIKAT folder ke siswa
// berdasarkan ID -- bukan berdasarkan nama. Ini supaya folder tetap boleh
// di-rename bebas tanpa memutus keterkaitannya ke siswa, dan supaya folder
// yang dibuat manual (siswa_id = null) tidak pernah dianggap "folder siswa".
// Lihat file migrasi SQL: folder_materi_add_siswa_id.sql

import { supabase } from '../supabaseClient';

// Kategori folder_materi yang dipakai untuk folder otomatis per-siswa.
// Dipilih 'Sekolah' (ditampilkan sbg "Shared" di UI) karena folder ini
// PERSIS merepresentasikan apa yang dilihat siswa ybs di FolderShared --
// guru bisa memantau materi per-siswa dari sisi TeacherArsipMateri dengan
// struktur folder yang sama. Kategori 'Pribadi' sengaja tidak dipakai di
// sini karena Pribadi harus murni milik guru & tidak pernah terlihat siswa.
const FOLDER_KATEGORI_UNTUK_SISWA = 'Sekolah';

/**
 * Ambil daftar siswa yang sedang/pernah diajar guru ini, diturunkan dari
 * jadwal_les (siswa_id untuk privat, siswa_ids untuk group) -- sama seperti
 * logika di TeacherListStudent, tapi tanpa peduli status Aktif/Off, karena
 * siswa yang statusnya "Off" pun masih dianggap "ada di list siswa" (masih
 * tampil di halaman Siswa, hanya jadwalnya yang sudah tidak berlaku).
 *
 * @returns {Promise<Array<{siswaId: string, nama: string}>>}
 */
export async function fetchTaughtStudents(userId) {
  if (!userId) return [];

  const { data: guruRow, error: guruError } = await supabase
    .from('guru')
    .select('id')
    .eq('profile_id', userId)
    .maybeSingle();
  if (guruError || !guruRow) return [];

  const { data: jadwalData, error: jadwalError } = await supabase
    .from('jadwal_les')
    .select('siswa_id, siswa_ids')
    .eq('guru_id', guruRow.id);
  if (jadwalError) return [];

  const siswaIdSet = new Set();
  (jadwalData || []).forEach((row) => {
    if (row.siswa_id) siswaIdSet.add(row.siswa_id);
    (row.siswa_ids || []).forEach((sid) => sid && siswaIdSet.add(sid));
  });

  const siswaIds = Array.from(siswaIdSet);
  if (siswaIds.length === 0) return [];

  const { data: profilesData, error: profilesError } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', siswaIds);
  if (profilesError) return [];

  return (profilesData || []).map((p) => ({
    siswaId: p.id,
    nama: p.full_name || 'Tanpa Nama',
  }));
}

/**
 * Sinkronkan folder_materi milik guru ini dengan daftar siswa yang diajar:
 *  1. Folder yang siswa_id-nya sudah tidak ada lagi di daftar siswa -> DIHAPUS.
 *  2. Siswa yang belum punya folder -> DIBUATKAN folder baru (kategori 'Sekolah').
 *  3. Kalau nama folder yang mau dibuat persis sama dengan folder lain yang
 *     sudah ada (dan folder itu bukan folder otomatis siswa lain), proses
 *     berhenti sejenak dan bertanya lewat callback `onDuplicateConfirm`
 *     (kalau disediakan). Kalau tidak disediakan, siswa itu dilewati dulu
 *     (akan dicoba lagi di sinkronisasi berikutnya, mis. saat guru membuka
 *     halaman Arsip Materi).
 *
 * @param {string} userId - auth.uid() guru yang login
 * @param {{ onDuplicateConfirm?: (args: { student: {siswaId:string, nama:string}, existingFolder: object }) => Promise<'use-existing'|'create-new'|'skip'> }} options
 * @returns {Promise<{ created: object[], linked: object[], deleted: object[], skipped: object[] }>}
 */
export async function syncStudentFolders(userId, { onDuplicateConfirm } = {}) {
  const summary = { created: [], linked: [], deleted: [], skipped: [] };
  if (!userId) return summary;

  const students = await fetchTaughtStudents(userId);
  const studentIds = new Set(students.map((s) => s.siswaId));

  const { data: folders, error: folderError } = await supabase
    .from('folder_materi')
    .select('id, nama, kategori, siswa_id')
    .eq('user_id', userId);
  if (folderError) return summary;

  let currentFolders = folders || [];

  // 1) Hapus folder milik siswa yang sudah tidak lagi ada di daftar siswa guru ini.
  //    Materi yang tadinya ada di folder ini otomatis pindah ke "Tanpa Folder"
  //    (folder_materi.id di materi_file.folder_id sudah ON DELETE SET NULL,
  //    sama seperti perilaku hapus folder manual).
  const foldersToDelete = currentFolders.filter((f) => f.siswa_id && !studentIds.has(f.siswa_id));
  for (const f of foldersToDelete) {
    const { error } = await supabase.from('folder_materi').delete().eq('id', f.id);
    if (!error) summary.deleted.push(f);
  }
  if (foldersToDelete.length > 0) {
    const deletedIds = new Set(foldersToDelete.map((f) => f.id));
    currentFolders = currentFolders.filter((f) => !deletedIds.has(f.id));
  }

  // 2) Buatkan folder untuk siswa yang belum punya folder otomatis.
  for (const student of students) {
    const sudahAda = currentFolders.some((f) => f.siswa_id === student.siswaId);
    if (sudahAda) continue;

    const namaTrim = (student.nama || '').trim().toLowerCase();
    const conflict = currentFolders.find(
      (f) => !f.siswa_id && (f.nama || '').trim().toLowerCase() === namaTrim
    );

    if (conflict) {
      if (!onDuplicateConfirm) {
        summary.skipped.push(student);
        continue;
      }

      // eslint-disable-next-line no-await-in-loop
      const decision = await onDuplicateConfirm({ student, existingFolder: conflict });

      if (decision === 'use-existing') {
        // eslint-disable-next-line no-await-in-loop
        const { data, error } = await supabase
          .from('folder_materi')
          .update({ siswa_id: student.siswaId })
          .eq('id', conflict.id)
          .select('id, nama, kategori, siswa_id')
          .single();
        if (!error && data) {
          const idx = currentFolders.findIndex((f) => f.id === conflict.id);
          if (idx !== -1) currentFolders[idx] = data;
          summary.linked.push(data);
        }
        continue;
      }

      if (decision === 'skip') {
        summary.skipped.push(student);
        continue;
      }
      // decision === 'create-new' -> lanjut ke pembuatan folder baru di bawah
    }

    // eslint-disable-next-line no-await-in-loop
    const { data, error } = await supabase
      .from('folder_materi')
      .insert({
        user_id: userId,
        nama: student.nama,
        kategori: FOLDER_KATEGORI_UNTUK_SISWA,
        siswa_id: student.siswaId,
      })
      .select('id, nama, kategori, siswa_id')
      .single();
    if (!error && data) {
      currentFolders.push(data);
      summary.created.push(data);
    }
  }

  return summary;
}