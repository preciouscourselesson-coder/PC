import {
  ConfirmDeleteModal,
  Dashboard,
  HomeworkEditor,
  NewAssignmentModal,
  NewFolderModal,
  PublishedHomeworkModal,
} from "./homework/components";
import { useHomeworkDashboard } from "./homework/hooks/useHomeworkDashboard";

// ---------------------------------------------------------------------------
// Integrasi Supabase
//
// Skema tabel (lihat supabase_schema.sql):
// homework            (id, title, subject, grade, description, due_date,
//                       status, share_code, folder_id, teacher_id,
//                       created_at, updated_at)
// homework_questions  (id, homework_id, question_text, image_url, audio_url,
//                       blanks jsonb, points, order_index, created_at)
// homework_assignments(id, homework_id, student_id, assigned_at)
// homework_folders    (id, name, teacher_id, created_at)
//
// Catatan migrasi: tambahkan kolom `description` (text, nullable) dan
// `folder_id` (uuid, nullable) pada tabel `homework` jika belum ada.
// `due_date` sudah ada di skema lama, namun sekarang sengaja dibiarkan
// kosong sampai tugas dibagikan ke siswa (lihat ShareModal) — tidak lagi
// diminta saat tugas pertama kali dibuat.
//
// Catatan migrasi tambahan — tenggat waktu kini menyertakan JAM, bukan
// cuma tanggal. Kalau kolom `due_date` masih bertipe `date`, ubah ke
// `timestamp` (tanpa timezone) supaya jam ikut tersimpan:
//   alter table homework alter column due_date type timestamp using due_date::timestamp;
// Baris lama yang cuma berisi tanggal (tanpa jam) tetap terbaca normal —
// UI otomatis mengasumsikan jam 23:59 untuk data lama tersebut.
//
// Catatan migrasi tambahan — lepas publikasi (unpublish) & publish ulang:
// tidak perlu kolom baru. Guru bisa mengembalikan `homework.status` dari
// "published" ke "draft" (lihat handleUnpublish di
// TeacherHomework/hooks/useHomeworkEditor.js) supaya bebas merevisi soal,
// lalu mempublikasikan ulang (handlePublish akan memakai ulang `share_code`
// yang sama kalau sudah pernah ada, jadi link/kode yang sudah dipegang
// siswa tetap berlaku dan baris `homework_assignments` yang sudah ada
// tidak perlu dibuat ulang).
//
// Catatan migrasi tambahan — dukungan gambar pada soal: tambahkan kolom
// `image_url` (text, nullable) pada `homework_questions` jika belum ada:
//   alter table homework_questions add column if not exists image_url text;
// Gambar disimpan di Supabase Storage bucket bernama "homework-images".
// Buat bucket ini (public) lalu tambahkan policy insert/select untuk guru
// pemilik tugas, mis.:
//   insert into storage.buckets (id, name, public) values ('homework-images', 'homework-images', true);
//   create policy "guru unggah gambar soal" on storage.objects
//     for insert with check (bucket_id = 'homework-images' and auth.uid()::text = (storage.foldername(name))[1]);
//   create policy "publik lihat gambar soal" on storage.objects
//     for select using (bucket_id = 'homework-images');
//
// Catatan migrasi tambahan — dukungan audio pada soal: tambahkan kolom
// `audio_url` (text, nullable) pada `homework_questions` jika belum ada:
//   alter table homework_questions add column if not exists audio_url text;
// Audio disimpan di Supabase Storage bucket terpisah bernama "homework-audio"
// (public), dengan policy serupa gambar di atas, mis.:
//   insert into storage.buckets (id, name, public) values ('homework-audio', 'homework-audio', true);
//   create policy "guru unggah audio soal" on storage.objects
//     for insert with check (bucket_id = 'homework-audio' and auth.uid()::text = (storage.foldername(name))[1]);
//   create policy "publik dengar audio soal" on storage.objects
//     for select using (bucket_id = 'homework-audio');
//
// PENTING — folder kini dibaca/ditulis langsung ke tabel `homework_folders`
// (bukan lagi state lokal). Berdasarkan audit skema per 1 Agustus 2026,
// tabel ini sudah RLS aktif tapi belum punya SATU POLICY pun, jadi semua
// query dari client (select/insert/delete) akan gagal sampai policy
// ditambahkan. Tambahkan minimal 4 policy di Supabase (ganti sesuai
// kebutuhan Anda):
//   create policy "guru kelola folder sendiri" on homework_folders
//     for all using (auth.uid() = teacher_id) with check (auth.uid() = teacher_id);
// homework.folder_id sudah FK ON DELETE SET NULL ke homework_folders.id,
// jadi menghapus folder otomatis melepas folder_id tugas terkait di DB.
//
// Strategi penyimpanan soal: setiap kali disimpan, soal lama untuk homework_id
// terkait dihapus lalu diinsert ulang sesuai state saat ini. Sederhana dan
// cukup untuk skala kelas; untuk skala besar pertimbangkan diffing per-soal.
//
// Catatan migrasi tambahan — dukungan soal pilihan ganda: tambahkan 3 kolom
// pada `homework_questions` jika belum ada:
//   alter table homework_questions add column if not exists type text not null default 'isian';
//   alter table homework_questions add column if not exists options jsonb;
//   alter table homework_questions add column if not exists correct_option_id text;
// `type` berisi 'isian' (format [blank] seperti sebelumnya), 'pilihan_ganda',
// atau 'speaking'. Untuk 'pilihan_ganda', `options` berisi array
// [{ id, text }] dan `correct_option_id` menyimpan id opsi yang benar;
// kolom `blanks` dikosongkan ([]) untuk tipe ini. Soal lama tanpa kolom
// `type` otomatis dibaca sebagai 'isian' lewat fallback di kode.
//
// Catatan migrasi tambahan — dukungan soal Speaking (siswa merekam jawaban
// suara): tambahkan 1 kolom lagi pada `homework_questions`:
//   alter table homework_questions add column if not exists reference_answer text;
// `reference_answer` bersifat opsional, hanya catatan internal guru untuk
// membantu menilai (mis. jawaban/pengucapan yang diharapkan) — TIDAK
// ditampilkan ke siswa. Soal tipe 'speaking' tidak punya `blanks`/`options`/
// `correct_option_id` (semua dikosongkan), dan tidak dinilai otomatis —
// guru menilai manual lewat kolom skor di GradingPanel setelah mendengarkan
// rekaman siswa.
//
// PENTING — StudentHomework.js (sisi siswa, tidak ada di file ini) juga
// perlu diperbarui agar bisa merender & menilai soal bertipe
// 'pilihan_ganda' dan 'speaking':
// - 'pilihan_ganda': tampilkan `options` sebagai radio button, simpan id
//   opsi yang dipilih siswa ke `answers[question_id]` (array 1 elemen:
//   [optionId] agar formatnya konsisten dengan soal isian), lalu
//   bandingkan dengan `correct_option_id` saat menghitung skor otomatis.
// - 'speaking': sediakan tombol rekam (Web Audio/MediaRecorder), unggah
//   hasil rekaman ke bucket Storage baru (mis. "homework-speaking-answers",
//   public, dengan policy serupa "homework-audio"), lalu simpan public
//   URL-nya ke `answers[question_id]` (array 1 elemen: [audioUrl]). Karena
//   tidak ada penilaian otomatis untuk audio, skor soal ini TIDAK ikut
//   dihitung ke `computeInteractiveScore` — guru menilainya manual.
//
// ---------------------------------------------------------------------------
// Peta file setelah refaktor (lihat folder ./TeacherHomework):
//   constants.js        - opsi mata pelajaran & tingkat kelas
//   utils/               - helper murni (id, tanggal, factory objek, blank)
//   api/students.js      - query Supabase terkait daftar siswa guru
//   hooks/                - seluruh state & efek samping (fetch, simpan,
//                           publish, unpublish, upload gambar/audio, dst)
//   components/           - potongan UI yang memakai hooks di atas
// ---------------------------------------------------------------------------

export default function TeacherHomework() {
  const {
    view,
    folders,
    homeworkList,
    loadingList,
    activeHomework,
    showNewFolderModal,
    setShowNewFolderModal,
    showNewAssignmentModal,
    setShowNewAssignmentModal,
    pendingFolderId,
    viewingHomeworkId,
    setViewingHomeworkId,
    deleteTarget,
    setDeleteTarget,
    fetchHomeworkList,
    handleCreateFolder,
    requestDeleteFolder,
    requestDeleteHomework,
    handleConfirmDelete,
    handleOpenNewAssignment,
    handleCreateAssignment,
    handleOpenHomework,
    handleBackToDashboard,
  } = useHomeworkDashboard();

  return (
    <>
      {view === "dashboard" && (
        <Dashboard
          folders={folders}
          homeworkList={homeworkList}
          loading={loadingList}
          onOpenHomework={handleOpenHomework}
          onOpenNewFolder={() => setShowNewFolderModal(true)}
          onOpenNewAssignment={handleOpenNewAssignment}
          onDeleteFolder={requestDeleteFolder}
          onDeleteHomework={requestDeleteHomework}
          onViewPublished={setViewingHomeworkId}
        />
      )}

      {view === "editor" && activeHomework && (
        <HomeworkEditor
          key={activeHomework.id || "new"}
          initialHomework={activeHomework}
          onBack={handleBackToDashboard}
          onSaved={fetchHomeworkList}
        />
      )}

      {showNewFolderModal && (
        <NewFolderModal
          onCreate={handleCreateFolder}
          onClose={() => setShowNewFolderModal(false)}
        />
      )}

      {showNewAssignmentModal && (
        <NewAssignmentModal
          folders={folders}
          defaultFolderId={pendingFolderId}
          onCreate={handleCreateAssignment}
          onClose={() => setShowNewAssignmentModal(false)}
        />
      )}

      {viewingHomeworkId && (
        <PublishedHomeworkModal
          homeworkId={viewingHomeworkId}
          onClose={() => setViewingHomeworkId(null)}
          onSaved={fetchHomeworkList}
          onEdit={(id) => {
            setViewingHomeworkId(null);
            handleOpenHomework(id);
          }}
        />
      )}

      <ConfirmDeleteModal
        target={deleteTarget}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
