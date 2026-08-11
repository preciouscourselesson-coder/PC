import { supabase } from "../../../../supabaseClient";

/**
 * Mengambil daftar unik siswa yang benar-benar diajar oleh guru yang sedang
 * login, digabung dari jadwal_les (privat: kolom siswa_id, group: kolom
 * siswa_ids[]) — pola query yang sama dengan TeacherListStudent.js.
 *
 * Menggantikan DUMMY_STUDENTS yang sebelumnya statis, supaya "Bagikan
 * langsung ke siswa" di ShareModal terisi siswa nyata (UUID dari
 * profiles.id), bukan id palsu seperti "s1"/"s2" yang akan gagal saat
 * di-insert ke homework_assignments.student_id (kolom uuid).
 *
 * Catatan: jadwal_les.guru_id menunjuk ke guru.id, BUKAN langsung ke
 * profiles.id/auth.uid() — jadi perlu cari guru.id lewat guru.profile_id
 * dulu (lihat bagian 4.6 dokumentasi skema soal ketidakkonsistenan ini).
 */
export async function fetchTeacherStudents() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Sesi tidak ditemukan. Silakan login ulang.");
  }

  const { data: guruRow, error: guruError } = await supabase
    .from("guru")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (guruError) throw guruError;
  if (!guruRow) {
    throw new Error("Akun ini belum terhubung ke data guru (tabel guru).");
  }

  const { data: jadwalData, error: jadwalError } = await supabase
    .from("jadwal_les")
    .select("siswa_id, siswa_ids")
    .eq("guru_id", guruRow.id);
  if (jadwalError) throw jadwalError;

  const siswaIdSet = new Set();
  (jadwalData || []).forEach((row) => {
    if (row.siswa_id) siswaIdSet.add(row.siswa_id);
    (row.siswa_ids || []).forEach((sid) => siswaIdSet.add(sid));
  });

  const siswaIds = [...siswaIdSet];
  if (siswaIds.length === 0) return [];

  const { data: profilesData, error: profilesError } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", siswaIds);
  if (profilesError) throw profilesError;

  return (profilesData || [])
    .map((p) => ({ id: p.id, name: p.full_name || "Tanpa nama" }))
    .sort((a, b) => a.name.localeCompare(b.name, "id"));
}

/**
 * Mengambil id siswa yang sudah punya baris `homework_assignments` untuk
 * tugas tertentu. Dipakai supaya ShareModal bisa menampilkan siapa saja
 * yang sudah ditugaskan (checkbox otomatis tercentang), dan supaya
 * `handleAssignToStudents` tidak insert baris duplikat untuk siswa yang
 * sama — homework_assignments TIDAK punya unique constraint pada
 * (homework_id, student_id), jadi insert ulang akan membuat baris ganda
 * kalau tidak difilter dulu di sisi client.
 */
export async function fetchAssignedStudentIds(homeworkId) {
  if (!homeworkId) return new Set();
  const { data, error } = await supabase
    .from("homework_assignments")
    .select("student_id")
    .eq("homework_id", homeworkId);
  if (error) throw error;
  return new Set((data || []).map((row) => row.student_id));
}
