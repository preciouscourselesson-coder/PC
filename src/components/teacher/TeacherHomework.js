import React, { useState, useRef, useCallback, useMemo, useEffect } from "react";
import {
  Plus,
  Trash2,
  Share2,
  Save,
  Eye,
  Check,
  Copy,
  Calendar,
  X,
  BookOpen,
  GraduationCap,
  Type,
  Users,
  Loader2,
  ClipboardList,
  PenLine,
  ListChecks,
  FolderPlus,
  Folder,
  ArrowLeft,
  FileText,
  Image as ImageIcon,
  Music,
  Mic,
} from "lucide-react";
import { supabase } from "../../supabaseClient";
import { checkedUpdate } from "../../utils/supabaseUpdateGuard";

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
// "published" ke "draft" (lihat handleUnpublish di HomeworkEditor) supaya
// bebas merevisi soal, lalu mempublikasikan ulang (handlePublish akan
// memakai ulang `share_code` yang sama kalau sudah pernah ada, jadi
// link/kode yang sudah dipegang siswa tetap berlaku dan baris
// `homework_assignments` yang sudah ada tidak perlu dibuat ulang).
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
// ---------------------------------------------------------------------------

/** Menghasilkan kode tugas acak 6 karakter, mis. "K3F9XA" */
function generateShareCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

let idCounter = 1;
const generateId = () => `q${idCounter++}_${Date.now().toString(36)}`;

/**
 * Mengubah nilai due_date dari Supabase (bisa berupa "YYYY-MM-DD" lama,
 * "YYYY-MM-DD HH:mm:ss", atau string ISO dengan timezone) menjadi format
 * yang dibutuhkan <input type="datetime-local">, yaitu "YYYY-MM-DDTHH:mm".
 * Data lama yang cuma tanggal (belum punya jam) diasumsikan jam 23:59
 * supaya tidak tampil kosong di form.
 */
function toDateTimeInputValue(value) {
  if (!value) return "";
  const normalized = String(value).replace(" ", "T");
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return `${normalized}T23:59`;
  }
  return normalized.slice(0, 16);
}

/**
 * Memformat due_date untuk ditampilkan ke guru, mis. "4 Agustus 2026, 23.59".
 */
function formatDueDateDisplay(value) {
  if (!value) return "";
  const normalized =
    String(value).length === 10 ? `${value}T23:59` : String(value).replace(" ", "T");
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return value;
  const tanggal = d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const jam = d.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${tanggal}, ${jam}`;
}

const SUBJECT_OPTIONS = [
  "Matematika",
  "Fisika",
  "Kimia",
  "Bahasa Inggris",
  "Bahasa Mandarin",
];

// Tingkat kelas dikelompokkan per jenjang: SD (Kelas I-VI), SMP (Kelas
// VII-IX), SMA (Kelas X-XII), dan Universitas (Semester 1-8). Dirender
// sebagai <optgroup> di dropdown "Tingkat Kelas" supaya tetap satu field
// tapi terlihat rapi per jenjang.
const GRADE_GROUPS = [
  {
    label: "SD",
    options: ["Kelas I", "Kelas II", "Kelas III", "Kelas IV", "Kelas V", "Kelas VI"],
  },
  {
    label: "SMP",
    options: ["Kelas VII", "Kelas VIII", "Kelas IX"],
  },
  {
    label: "SMA",
    options: ["Kelas X", "Kelas XI", "Kelas XII"],
  },
  {
    label: "Universitas",
    options: [
      "Semester 1",
      "Semester 2",
      "Semester 3",
      "Semester 4",
      "Semester 5",
      "Semester 6",
      "Semester 7",
      "Semester 8",
    ],
  },
];


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
async function fetchTeacherStudents() {
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
async function fetchAssignedStudentIds(homeworkId) {
  if (!homeworkId) return new Set();
  const { data, error } = await supabase
    .from("homework_assignments")
    .select("student_id")
    .eq("homework_id", homeworkId);
  if (error) throw error;
  return new Set((data || []).map((row) => row.student_id));
}

/** Mengekstrak jawaban dari teks berformat [kata_kunci] */
function extractBlanks(text) {
  const matches = [...text.matchAll(/\[(.+?)\]/g)];
  return matches.map((m) => m[1].trim()).filter(Boolean);
}

let optionIdCounter = 1;
const generateOptionId = () => `opt${optionIdCounter++}_${Date.now().toString(36)}`;

function createEmptyOption() {
  return { id: generateOptionId(), text: "" };
}

function createEmptyQuestion() {
  return {
    id: generateId(),
    type: "isian", // "isian" (format [blank]), "pilihan_ganda", atau "speaking"
    questionText: "",
    imageUrl: null,
    audioUrl: null,
    blanks: [],
    options: [],
    correctOptionId: null,
    referenceAnswer: "", // catatan internal guru untuk soal speaking (opsional)
    points: 10,
  };
}

/** Membuat objek tugas baru berdasarkan keterangan yang diisi di modal "Tugas Baru" */
function createEmptyHomework(overrides = {}) {
  return {
    id: null,
    title: "",
    subject: "",
    grade: "",
    description: "",
    dueDate: "", // sengaja kosong — diisi nanti saat tugas dibagikan ke siswa
    folderId: null,
    status: "draft",
    shareCode: null,
    questions: [createEmptyQuestion()],
    ...overrides,
  };
}

/** Merender preview soal: gambar/audio (jika ada) + teks biasa + kotak blank untuk setiap [kata], atau daftar opsi untuk soal pilihan ganda */
function QuestionPreview({ text, imageUrl, audioUrl, type = "isian", options = [], correctOptionId = null }) {
  const parts = text.split(/(\[.+?\])/g).filter((p) => p !== "");
  const isPilihanGanda = type === "pilihan_ganda";
  const isSpeaking = type === "speaking";

  if (!text.trim() && !imageUrl && !audioUrl) {
    return (
      <p className="text-sm italic text-slate-400">
        Preview akan muncul di sini setelah Anda mengetik soal…
      </p>
    );
  }

  const optionLetters = ["A", "B", "C", "D", "E", "F"];

  return (
    <div>
      {imageUrl && (
        <img
          src={imageUrl}
          alt="Gambar soal"
          className="mb-2 max-h-64 w-full rounded-lg border border-slate-200 object-contain"
        />
      )}
      {audioUrl && (
        <audio
          src={audioUrl}
          controls
          className="mb-2 w-full"
        />
      )}
      {text.trim() && !isPilihanGanda && !isSpeaking && (
        <p className="text-base leading-8 text-slate-700">
          {parts.map((part, i) => {
            const match = part.match(/^\[(.+?)\]$/);
            if (match) {
              return (
                <span
                  key={i}
                  className="mx-1 inline-block min-w-[64px] rounded-md border-b-2 border-dashed border-teal-500 bg-teal-50 px-3 py-0.5 text-center align-middle text-teal-700"
                  title={`Jawaban: ${match[1]}`}
                >
                  &nbsp;
                </span>
              );
            }
            return <span key={i}>{part}</span>;
          })}
        </p>
      )}
      {text.trim() && (isPilihanGanda || isSpeaking) && (
        <p className="mb-2 text-base leading-7 text-slate-700">{text}</p>
      )}
      {isSpeaking && (
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-teal-300 bg-teal-50 px-3 py-3 text-sm text-teal-700">
          <Mic size={18} className="shrink-0" />
          Siswa akan merekam jawaban suara di sini
        </div>
      )}
      {isPilihanGanda && (
        <div className="space-y-1.5">
          {options.map((opt, i) => {
            const isCorrect = opt.id === correctOptionId;
            return (
              <div
                key={opt.id || i}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                  isCorrect
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-white text-slate-700"
                }`}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    isCorrect
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {optionLetters[i] || i + 1}
                </span>
                <span className="flex-1">{opt.text || "(opsi kosong)"}</span>
                {isCorrect && <Check size={15} className="shrink-0 text-emerald-600" />}
              </div>
            );
          })}
          {options.length === 0 && (
            <p className="text-sm italic text-slate-400">
              Belum ada opsi jawaban…
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function QuestionEditor({ question, index, onChange, onDelete }) {
  const textareaRef = useRef(null);
  const imageInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState("");
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [audioError, setAudioError] = useState("");

  const handleTextChange = (value) => {
    onChange(question.id, {
      ...question,
      questionText: value,
      blanks: extractBlanks(value),
    });
  };

  const handlePointsChange = (value) => {
    const points = Math.max(0, Number(value) || 0);
    onChange(question.id, { ...question, points });
  };

  /**
   * Beralih tipe soal antara "Isian", "Pilihan Ganda", dan "Speaking".
   *
   * PENTING: field milik tipe lain (mis. `correctOptionId`/`options` untuk
   * Pilihan Ganda, `blanks` untuk Isian, `referenceAnswer` untuk Speaking)
   * SENGAJA TIDAK direset di sini — hanya `type` yang berubah. Field yang
   * tidak relevan dengan tipe aktif memang tidak dipakai (lihat
   * `persistHomework`, `validateHomework`, dan `QuestionPreview`, yang
   * semuanya sudah menyaring berdasarkan `q.type`), tapi datanya tetap
   * disimpan di objek soal supaya kalau guru beralih tipe lalu balik lagi
   * (mis. iseng klik "Isian" lalu klik "Pilihan Ganda" lagi), kunci
   * jawaban / opsi yang sudah dibuat sebelumnya TIDAK hilang. Sebelumnya
   * kode ini menyetel `correctOptionId: null` setiap ganti tipe — itulah
   * penyebab kunci soal Pilihan Ganda tampak hilang.
   */
  const handleTypeChange = (type) => {
    if (type === question.type) return;
    if (type === "pilihan_ganda") {
      onChange(question.id, {
        ...question,
        type,
        options:
          question.options && question.options.length >= 2
            ? question.options
            : [createEmptyOption(), createEmptyOption()],
      });
    } else if (type === "speaking") {
      onChange(question.id, { ...question, type });
    } else {
      onChange(question.id, {
        ...question,
        type,
        blanks: extractBlanks(question.questionText),
      });
    }
  };

  const handleOptionTextChange = (optionId, text) => {
    onChange(question.id, {
      ...question,
      options: question.options.map((o) =>
        o.id === optionId ? { ...o, text } : o
      ),
    });
  };

  const handleAddOption = () => {
    if (question.options.length >= 6) return;
    onChange(question.id, {
      ...question,
      options: [...question.options, createEmptyOption()],
    });
  };

  const handleRemoveOption = (optionId) => {
    if (question.options.length <= 2) return;
    onChange(question.id, {
      ...question,
      options: question.options.filter((o) => o.id !== optionId),
      correctOptionId:
        question.correctOptionId === optionId ? null : question.correctOptionId,
    });
  };

  const handleSetCorrectOption = (optionId) => {
    onChange(question.id, { ...question, correctOptionId: optionId });
  };

  const handleReferenceAnswerChange = (value) => {
    onChange(question.id, { ...question, referenceAnswer: value });
  };

  /**
   * Mengunggah gambar soal ke Supabase Storage bucket "homework-images"
   * dengan path {teacher_id}/{timestamp}_{nama_file}, lalu menyimpan public
   * URL-nya ke field `imageUrl` pada soal. Lihat catatan skema di bagian
   * atas file ini untuk setup bucket & policy yang dibutuhkan.
   */
  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageError("");

    if (!file.type.startsWith("image/")) {
      setImageError("File harus berupa gambar (JPG, PNG, dsb).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setImageError("Ukuran gambar maksimal 5MB.");
      return;
    }

    setUploadingImage(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Sesi tidak ditemukan. Silakan login ulang.");

      const safeName = file.name.replace(/\s+/g, "_");
      const path = `${user.id}/${Date.now()}_${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("homework-images")
        .upload(path, file);
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("homework-images")
        .getPublicUrl(path);

      onChange(question.id, { ...question, imageUrl: publicUrlData.publicUrl });
    } catch (err) {
      console.error("Gagal mengunggah gambar soal:", err);
      setImageError(err.message || "Gagal mengunggah gambar.");
    } finally {
      setUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  const handleRemoveImage = () => {
    setImageError("");
    onChange(question.id, { ...question, imageUrl: null });
  };

  /**
   * Mengunggah audio soal ke Supabase Storage bucket "homework-audio" dengan
   * pola path yang sama seperti gambar. Lihat catatan skema di bagian atas
   * file ini untuk setup bucket & policy yang dibutuhkan.
   */
  const handleAudioChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAudioError("");

    if (!file.type.startsWith("audio/")) {
      setAudioError("File harus berupa audio (MP3, WAV, dsb).");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setAudioError("Ukuran audio maksimal 10MB.");
      return;
    }

    setUploadingAudio(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Sesi tidak ditemukan. Silakan login ulang.");

      const safeName = file.name.replace(/\s+/g, "_");
      const path = `${user.id}/${Date.now()}_${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("homework-audio")
        .upload(path, file);
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("homework-audio")
        .getPublicUrl(path);

      onChange(question.id, { ...question, audioUrl: publicUrlData.publicUrl });
    } catch (err) {
      console.error("Gagal mengunggah audio soal:", err);
      setAudioError(err.message || "Gagal mengunggah audio.");
    } finally {
      setUploadingAudio(false);
      if (audioInputRef.current) audioInputRef.current.value = "";
    }
  };

  const handleRemoveAudio = () => {
    setAudioError("");
    onChange(question.id, { ...question, audioUrl: null });
  };

  /** Membungkus teks yang dipilih di textarea dengan tanda kurung siku [ ] */
  const handleMakeBlank = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd, value } = textarea;
    if (selectionStart === selectionEnd) return; // tidak ada teks dipilih

    const selected = value.slice(selectionStart, selectionEnd).trim();
    if (!selected) return;

    const newValue =
      value.slice(0, selectionStart) +
      `[${selected}]` +
      value.slice(selectionEnd);

    handleTextChange(newValue);

    // kembalikan fokus ke textarea setelah update
    requestAnimationFrame(() => {
      textarea.focus();
      const cursorPos = selectionStart + selected.length + 2;
      textarea.setSelectionRange(cursorPos, cursorPos);
    });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-600 text-sm font-semibold text-white">
            {index + 1}
          </span>
          <h3 className="text-sm font-semibold text-slate-700">
            Soal {index + 1}
          </h3>
        </div>
        <button
          type="button"
          onClick={() => onDelete(question.id)}
          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
          aria-label="Hapus soal"
        >
          <Trash2 size={18} />
        </button>
      </div>

      {/* Toggle tipe soal */}
      <div className="mb-3 inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
        <button
          type="button"
          onClick={() => handleTypeChange("isian")}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
            question.type === "isian" || !question.type
              ? "bg-white text-teal-700 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Isian
        </button>
        <button
          type="button"
          onClick={() => handleTypeChange("pilihan_ganda")}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
            question.type === "pilihan_ganda"
              ? "bg-white text-teal-700 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Pilihan Ganda
        </button>
        <button
          type="button"
          onClick={() => handleTypeChange("speaking")}
          className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition ${
            question.type === "speaking"
              ? "bg-white text-teal-700 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Mic size={13} />
          Speaking
        </button>
      </div>

      <label className="mb-1 block text-xs font-medium text-slate-500">
        {question.type === "pilihan_ganda"
          ? "Kalimat Soal"
          : question.type === "speaking"
          ? "Pertanyaan / Instruksi Speaking"
          : 'Kalimat Soal (pilih kata lalu klik "Jadikan Blank", atau ketik manual dengan format [kata])'}
      </label>
      <textarea
        ref={textareaRef}
        value={question.questionText}
        onChange={(e) => handleTextChange(e.target.value)}
        rows={3}
        placeholder={
          question.type === "pilihan_ganda"
            ? "Contoh: Planet apa yang paling dekat dengan Matahari?"
            : question.type === "speaking"
            ? "Contoh: Ceritakan kegiatanmu hari ini dalam Bahasa Inggris (minimal 3 kalimat)."
            : "Contoh: Sistem tata surya kita berpusat pada [Matahari]."
        }
        className="w-full resize-none rounded-lg border border-slate-300 p-3 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
      />

      {/* Gambar soal (opsional) */}
      <div className="mt-3">
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="hidden"
        />
        {question.imageUrl ? (
          <div className="relative inline-block">
            <img
              src={question.imageUrl}
              alt="Gambar soal"
              className="max-h-48 rounded-lg border border-slate-200 object-contain"
            />
            <button
              type="button"
              onClick={handleRemoveImage}
              aria-label="Hapus gambar soal"
              className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white text-slate-500 shadow ring-1 ring-slate-200 transition hover:bg-red-50 hover:text-red-600"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            disabled={uploadingImage}
            className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:border-teal-400 hover:bg-teal-50 hover:text-teal-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {uploadingImage ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <ImageIcon size={14} />
            )}
            {uploadingImage ? "Mengunggah…" : "Tambah Gambar"}
          </button>
        )}
        {imageError && (
          <p className="mt-1 text-xs font-medium text-red-500">{imageError}</p>
        )}
      </div>

      {/* Audio soal (opsional) */}
      <div className="mt-2">
        <input
          ref={audioInputRef}
          type="file"
          accept="audio/*"
          onChange={handleAudioChange}
          className="hidden"
        />
        {question.audioUrl ? (
          <div className="flex items-center gap-2">
            <audio src={question.audioUrl} controls className="h-9 max-w-[260px]" />
            <button
              type="button"
              onClick={handleRemoveAudio}
              aria-label="Hapus audio soal"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-slate-500 shadow ring-1 ring-slate-200 transition hover:bg-red-50 hover:text-red-600"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => audioInputRef.current?.click()}
            disabled={uploadingAudio}
            className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:border-teal-400 hover:bg-teal-50 hover:text-teal-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {uploadingAudio ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Music size={14} />
            )}
            {uploadingAudio ? "Mengunggah…" : "Tambah Audio"}
          </button>
        )}
        {audioError && (
          <p className="mt-1 text-xs font-medium text-red-500">{audioError}</p>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        {question.type === "isian" ? (
          <button
            type="button"
            onClick={handleMakeBlank}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-700 transition hover:bg-teal-100"
          >
            <Type size={14} />
            Jadikan Blank
          </button>
        ) : (
          <span />
        )}

        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-500">Poin</label>
          <input
            type="number"
            min={0}
            value={question.points}
            onChange={(e) => handlePointsChange(e.target.value)}
            className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
          />
        </div>
      </div>

      {/* Editor opsi jawaban (khusus Pilihan Ganda) */}
      {question.type === "pilihan_ganda" && (
        <div className="mt-3 space-y-2">
          <label className="mb-1 block text-xs font-medium text-slate-500">
            Opsi Jawaban (pilih tombol bulat di kiri untuk menandai jawaban benar)
          </label>
          {question.options.map((opt, i) => (
            <div key={opt.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSetCorrectOption(opt.id)}
                aria-label={`Tandai opsi ${i + 1} sebagai jawaban benar`}
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition ${
                  question.correctOptionId === opt.id
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-slate-300 text-transparent hover:border-emerald-400"
                }`}
              >
                <Check size={13} />
              </button>
              <input
                type="text"
                value={opt.text}
                onChange={(e) => handleOptionTextChange(opt.id, e.target.value)}
                placeholder={`Opsi ${i + 1}`}
                className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
              />
              <button
                type="button"
                onClick={() => handleRemoveOption(opt.id)}
                disabled={question.options.length <= 2}
                aria-label={`Hapus opsi ${i + 1}`}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <X size={16} />
              </button>
            </div>
          ))}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handleAddOption}
              disabled={question.options.length >= 6}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-700 transition hover:bg-teal-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={14} />
              Tambah Opsi
            </button>
            {!question.correctOptionId && (
              <span className="text-xs font-medium text-amber-600">
                Pilih salah satu opsi sebagai jawaban benar
              </span>
            )}
          </div>
        </div>
      )}

      {/* Catatan jawaban acuan (khusus Speaking, tidak terlihat siswa) */}
      {question.type === "speaking" && (
        <div className="mt-3">
          <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <Mic size={13} />
            Catatan Jawaban Acuan (opsional, hanya guru — tidak dilihat siswa)
          </label>
          <textarea
            rows={2}
            value={question.referenceAnswer}
            onChange={(e) => handleReferenceAnswerChange(e.target.value)}
            placeholder="Contoh: jawaban minimal 3 kalimat, pengucapan kata 'weather' dan 'temperature' jelas."
            className="w-full resize-none rounded-lg border border-slate-300 p-3 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
          />
          <p className="mt-1 text-xs text-slate-400">
            Soal Speaking dinilai manual oleh guru setelah mendengarkan
            rekaman siswa (lihat panel Penilaian).
          </p>
        </div>
      )}

      {/* Jawaban terdeteksi (khusus Isian) */}
      {question.type === "isian" && question.blanks.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-slate-400">
            Kunci jawaban:
          </span>
          {question.blanks.map((b, i) => (
            <span
              key={i}
              className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700"
            >
              {b}
            </span>
          ))}
        </div>
      )}

      {/* Preview */}
      <div className="mt-3 rounded-lg bg-slate-50 p-3">
        <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-400">
          <Eye size={13} />
          Preview Siswa
        </div>
        <QuestionPreview
          text={question.questionText}
          imageUrl={question.imageUrl}
          audioUrl={question.audioUrl}
          type={question.type}
          options={question.options}
          correctOptionId={question.correctOptionId}
        />
      </div>
    </div>
  );
}

/**
 * Modal share tugas. Tenggat waktu pengerjaan diminta di sini — bukan saat
 * tugas dibuat — karena tenggat baru relevan ketika tugas benar-benar
 * dibagikan ke siswa.
 */
function ShareModal({
  shareCode,
  shareLink,
  students,
  loadingStudents,
  studentsError,
  onToggleStudent,
  onClose,
  dueDate,
  onDueDateChange,
  onUpdateDueDate,
  updatingDueDate,
  dueDateMessage,
  onAssign,
  assigning,
  assignMessage,
}) {
  const [copiedField, setCopiedField] = useState(null);
  const selectedCount = students.filter((s) => s.selected).length;

  const handleCopy = async (text, field) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1800);
    } catch (err) {
      console.error("Gagal menyalin:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">
            Tugas Berhasil Dipublikasikan 🎉
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        <p className="mb-4 text-sm text-slate-500">
          Bagikan link atau kode berikut kepada siswa Anda untuk mengerjakan
          tugas ini.
        </p>

        {/* Link unik */}
        <div className="mb-3">
          <label className="mb-1 block text-xs font-medium text-slate-500">
            Link Tugas
          </label>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={shareLink}
              className="flex-1 truncate rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600"
            />
            <button
              onClick={() => handleCopy(shareLink, "link")}
              className="flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-teal-700"
            >
              {copiedField === "link" ? <Check size={16} /> : <Copy size={16} />}
              {copiedField === "link" ? "Tersalin" : "Salin"}
            </button>
          </div>
        </div>

        {/* Kode tugas */}
        <div className="mb-5">
          <label className="mb-1 block text-xs font-medium text-slate-500">
            Kode Tugas
          </label>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={shareCode}
              className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-center text-lg font-bold tracking-widest text-slate-700"
            />
            <button
              onClick={() => handleCopy(shareCode, "code")}
              className="flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-teal-700"
            >
              {copiedField === "code" ? <Check size={16} /> : <Copy size={16} />}
              {copiedField === "code" ? "Tersalin" : "Salin"}
            </button>
          </div>
        </div>

        {/* Tenggat waktu — bisa diubah kapan saja, terpisah dari langkah
            "Bagikan ke siswa" di bawah (klik "Simpan" tidak menyentuh
            daftar siswa yang sudah ditugaskan). */}
        <div className="mb-5">
          <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <Calendar size={13} />
            Tenggat Waktu Pengerjaan (Tanggal & Jam)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => onDueDateChange(e.target.value)}
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
            />
            <button
              type="button"
              onClick={onUpdateDueDate}
              disabled={updatingDueDate || !dueDate}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-teal-600 px-3 py-2 text-sm font-medium text-teal-700 transition hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {updatingDueDate ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Save size={14} />
              )}
              Simpan
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Wajib diisi sebelum membagikan tugas ke siswa terpilih di bawah.
            Sudah dibagikan sebelumnya? Ubah tanggal lalu klik "Simpan" — tidak
            perlu memilih ulang siswa.
          </p>
          {dueDateMessage && (
            <p
              className={`mt-1 text-xs font-medium ${
                dueDateMessage.includes("berhasil")
                  ? "text-emerald-600"
                  : "text-red-500"
              }`}
            >
              {dueDateMessage}
            </p>
          )}
        </div>

        {/* Bagikan ke kelas */}
        <div>
          <label className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <Users size={14} />
            Bagikan langsung ke siswa
          </label>
          <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
            {loadingStudents ? (
              <div className="flex items-center justify-center gap-2 py-4 text-xs text-slate-400">
                <Loader2 size={14} className="animate-spin" />
                Memuat daftar siswa…
              </div>
            ) : studentsError ? (
              <p className="px-2 py-3 text-xs text-red-500">{studentsError}</p>
            ) : students.length === 0 ? (
              <p className="px-2 py-3 text-xs text-slate-400">
                Belum ada siswa di jadwal Anda. Tambahkan siswa lewat halaman
                Jadwal terlebih dahulu.
              </p>
            ) : (
              students.map((s) => (
                <label
                  key={s.id}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={s.selected}
                    onChange={() => onToggleStudent(s.id)}
                    className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  {s.name}
                </label>
              ))
            )}
          </div>
        </div>

        {assignMessage && (
          <p
            className={`mt-3 text-xs font-medium ${
              assignMessage.includes("berhasil")
                ? "text-emerald-600"
                : "text-red-500"
            }`}
          >
            {assignMessage}
          </p>
        )}

        <div className="mt-5 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-slate-300 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Tutup
          </button>
          <button
            onClick={onAssign}
            disabled={assigning || selectedCount === 0}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-teal-600 py-2.5 text-sm font-medium text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {assigning ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Share2 size={16} />
            )}
            Bagikan{selectedCount > 0 ? ` ke ${selectedCount} Siswa` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Modal read-only untuk melihat soal yang sudah dipublikasikan beserta
 * siswa yang ditunjuk (assigned), sekaligus mengubah tenggat waktu langsung
 * dari sini — tanpa perlu membuka editor soal lengkap. Dibuka dari kartu
 * tugas di Beranda lewat tombol mata (👁) yang hanya muncul untuk tugas
 * berstatus "published".
 *
 * Fetch dilakukan mandiri (tidak lewat props homeworkList) supaya selalu
 * dapat data terbaru, termasuk daftar siswa yang di-assign.
 *
 * Catatan: homework_assignments.student_id TIDAK punya FK resmi ke
 * profiles.id (lihat bagian 4.4 dokumentasi skema), jadi embed nested
 * select lewat PostgREST tidak bisa diandalkan — data siswa diambil lewat
 * dua query terpisah, sama seperti pola di `fetchTeacherStudents()`.
 */
function PublishedHomeworkModal({ homeworkId, onClose, onSaved, onEdit }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [homework, setHomework] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [assignedStudents, setAssignedStudents] = useState([]);

  const [dueDateInput, setDueDateInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const { data: hwRow, error: hwErr } = await supabase
          .from("homework")
          .select("*")
          .eq("id", homeworkId)
          .single();
        if (hwErr) throw hwErr;

        const { data: qRows, error: qErr } = await supabase
          .from("homework_questions")
          .select("*")
          .eq("homework_id", homeworkId)
          .order("order_index", { ascending: true });
        if (qErr) throw qErr;

        const { data: assignRows, error: assignErr } = await supabase
          .from("homework_assignments")
          .select("student_id, assigned_at")
          .eq("homework_id", homeworkId);
        if (assignErr) throw assignErr;

        const studentIds = [
          ...new Set((assignRows || []).map((r) => r.student_id)),
        ];
        let profilesById = new Map();
        if (studentIds.length > 0) {
          const { data: profilesData, error: profilesErr } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", studentIds);
          if (profilesErr) throw profilesErr;
          profilesById = new Map((profilesData || []).map((p) => [p.id, p]));
        }

        if (cancelled) return;

        setHomework({
          id: hwRow.id,
          title: hwRow.title || "",
          subject: hwRow.subject || "",
          grade: hwRow.grade || "",
          description: hwRow.description || "",
          dueDate: hwRow.due_date || "",
          status: hwRow.status || "draft",
        });
        setQuestions(
          (qRows || [])
            .slice()
            .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
        );
        setAssignedStudents(
          (assignRows || [])
            .map((r) => ({
              id: r.student_id,
              name:
                profilesById.get(r.student_id)?.full_name ||
                "Siswa tidak ditemukan",
              assignedAt: r.assigned_at,
            }))
            .sort((a, b) => a.name.localeCompare(b.name, "id"))
        );
        setDueDateInput(toDateTimeInputValue(hwRow.due_date));
      } catch (err) {
        console.error("Gagal memuat detail tugas:", err);
        if (!cancelled) setError(err.message || "Gagal memuat detail tugas.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [homeworkId]);

  const handleSaveDueDate = async () => {
    if (!dueDateInput) {
      setSaveMessage("Tenggat waktu tidak boleh kosong.");
      return;
    }
    setSaving(true);
    setSaveMessage("");
    try {
      const { error: updateError } = await checkedUpdate(
        supabase
          .from("homework")
          .update({ due_date: dueDateInput })
          .eq("id", homeworkId)
      );
      if (updateError) throw updateError;

      setHomework((prev) =>
        prev ? { ...prev, dueDate: dueDateInput } : prev
      );
      setSaveMessage("Tenggat waktu berhasil diperbarui.");
      onSaved?.();
    } catch (err) {
      console.error(err);
      setSaveMessage(
        `Gagal memperbarui tenggat waktu: ${err.message || "Terjadi kesalahan"}`
      );
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMessage(""), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
              <Eye size={18} className="text-teal-600" />
              Soal Terpublikasi
            </h2>
            {homework?.title && (
              <p className="mt-0.5 text-sm text-slate-500">{homework.title}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-400">
            <Loader2 size={18} className="animate-spin" />
            Memuat detail tugas…
          </div>
        ) : error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap gap-1.5">
              {homework.subject && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
                  {homework.subject}
                </span>
              )}
              {homework.grade && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
                  {homework.grade}
                </span>
              )}
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                Terpublikasi
              </span>
            </div>

            {homework.description && (
              <p className="mb-4 text-sm text-slate-600">
                {homework.description}
              </p>
            )}

            {/* Tenggat waktu — bisa langsung diubah di sini */}
            <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <Calendar size={13} />
                Tenggat Waktu Pengerjaan (Tanggal & Jam)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="datetime-local"
                  value={dueDateInput}
                  onChange={(e) => setDueDateInput(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                />
                <button
                  type="button"
                  onClick={handleSaveDueDate}
                  disabled={saving || !dueDateInput}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Save size={14} />
                  )}
                  Simpan
                </button>
              </div>
              {saveMessage && (
                <p
                  className={`mt-1.5 text-xs font-medium ${
                    saveMessage.includes("berhasil")
                      ? "text-emerald-600"
                      : "text-red-500"
                  }`}
                >
                  {saveMessage}
                </p>
              )}
            </div>

            {/* Siswa yang ditunjuk */}
            <div className="mb-5">
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                <Users size={14} />
                Siswa yang Ditunjuk ({assignedStudents.length})
              </h3>
              {assignedStudents.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-300 px-3 py-3 text-xs text-slate-400">
                  Belum ada siswa yang ditugaskan untuk tugas ini.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {assignedStudents.map((s) => (
                    <span
                      key={s.id}
                      className="rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700"
                    >
                      {s.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Daftar soal — read only */}
            <div>
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                <ListChecks size={14} />
                Soal ({questions.length})
              </h3>
              <div className="space-y-3">
                {questions.map((q, i) => (
                  <div
                    key={q.id}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-600 text-xs font-semibold text-white">
                        {i + 1}
                      </span>
                      <span className="text-xs font-medium text-slate-400">
                        {q.points} poin
                      </span>
                    </div>
                    <QuestionPreview
                      text={q.question_text}
                      imageUrl={q.image_url}
                      audioUrl={q.audio_url}
                      type={q.type}
                      options={q.options || []}
                      correctOptionId={q.correct_option_id}
                    />
                  </div>
                ))}
                {questions.length === 0 && (
                  <p className="rounded-lg border border-dashed border-slate-300 px-3 py-3 text-xs text-slate-400">
                    Tugas ini belum punya soal.
                  </p>
                )}
              </div>
            </div>
          </>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Tutup
          </button>
          {onEdit && !loading && !error && (
            <button
              onClick={() => onEdit(homeworkId)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-700"
              title="Buka di editor untuk merevisi soal — batalkan publikasi dulu di sana kalau perlu, lalu publikasikan ulang"
            >
              <PenLine size={16} />
              Edit / Revisi Soal
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Modal untuk membuat folder baru di Beranda */
function NewFolderModal({ onCreate, onClose }) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await onCreate(name.trim());
    } catch (err) {
      console.error("Gagal membuat folder:", err);
      setError(err.message || "Gagal membuat folder. Coba lagi.");
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
            <FolderPlus size={20} className="text-teal-600" />
            Folder Baru
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        <label className="mb-1 block text-xs font-medium text-slate-500">
          Nama Folder
        </label>
        <input
          autoFocus
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Contoh: Kelas 5 - Semester 1"
          disabled={submitting}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100 disabled:bg-slate-50"
        />
        {error && <p className="mt-2 text-xs font-medium text-red-500">{error}</p>}

        <div className="mt-5 flex gap-2">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 rounded-lg border border-slate-300 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || submitting}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-teal-600 py-2.5 text-sm font-medium text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            Buat Folder
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Modal konfirmasi generik untuk aksi hapus (folder maupun tugas).
 * `target` berisi { type: 'folder' | 'homework', id, label }.
 */
function ConfirmDeleteModal({ target, onConfirm, onCancel }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!target) return null;

  const isFolder = target.type === "folder";

  const handleConfirm = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await onConfirm(target);
    } catch (err) {
      console.error("Gagal menghapus:", err);
      setError(err.message || "Gagal menghapus. Coba lagi.");
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
            <Trash2 size={18} />
          </div>
          <h2 className="text-base font-semibold text-slate-800">
            {isFolder ? "Hapus folder ini?" : "Hapus tugas ini?"}
          </h2>
        </div>

        <p className="text-sm text-slate-500">
          {isFolder ? (
            <>
              Folder <span className="font-medium text-slate-700">"{target.label}"</span>{" "}
              akan dihapus. Tugas di dalamnya tidak ikut terhapus — hanya
              berpindah menjadi "Tanpa Folder".
            </>
          ) : (
            <>
              Tugas <span className="font-medium text-slate-700">"{target.label}"</span>{" "}
              beserta seluruh soal dan riwayat penugasannya ke siswa akan
              dihapus permanen. Tindakan ini tidak bisa dibatalkan.
            </>
          )}
        </p>

        {error && <p className="mt-2 text-xs font-medium text-red-500">{error}</p>}

        <div className="mt-5 flex gap-2">
          <button
            onClick={onCancel}
            disabled={submitting}
            className="flex-1 rounded-lg border border-slate-300 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Batal
          </button>
          <button
            onClick={handleConfirm}
            disabled={submitting}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-red-600 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            Hapus
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Modal untuk membuat tugas baru. Hanya meminta keterangan tugas (judul,
 * mata pelajaran, kelas, deskripsi) — tenggat waktu TIDAK diminta di sini,
 * baru diminta nanti saat tugas dibagikan ke siswa lewat ShareModal.
 */
function NewAssignmentModal({ folders, defaultFolderId, onCreate, onClose }) {
  const [form, setForm] = useState({
    title: "",
    subject: "",
    grade: "",
    description: "",
    folderId: defaultFolderId || "",
  });

  const update = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const canSubmit = form.title.trim().length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onCreate({ ...form, folderId: form.folderId || null });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
            <ClipboardList size={20} className="text-teal-600" />
            Tugas Baru
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>
        <p className="mb-4 text-sm text-slate-500">
          Isi keterangan tugas terlebih dahulu. Tenggat waktu akan diminta
          nanti saat Anda membagikan tugas ini ke siswa.
        </p>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">
              Judul Tugas
            </label>
            <input
              autoFocus
              type="text"
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="Contoh: Latihan IPA - Tata Surya"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <BookOpen size={13} />
                Mata Pelajaran
              </label>
              <select
                value={form.subject}
                onChange={(e) => update("subject", e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
              >
                <option value="">Pilih mata pelajaran</option>
                {SUBJECT_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <GraduationCap size={13} />
                Tingkat Kelas
              </label>
              <select
                value={form.grade}
                onChange={(e) => update("grade", e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
              >
                <option value="">Pilih kelas</option>
                {GRADE_GROUPS.map((group) => (
                  <optgroup key={group.label} label={group.label}>
                    {group.options.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>

          {folders.length > 0 && (
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <Folder size={13} />
                Folder (opsional)
              </label>
              <select
                value={form.folderId}
                onChange={(e) => update("folderId", e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
              >
                <option value="">Tanpa folder</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <FileText size={13} />
              Keterangan Tugas
            </label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Jelaskan singkat tentang tugas ini, misalnya materi yang dicakup atau instruksi khusus."
              className="w-full resize-none rounded-lg border border-slate-300 p-3 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
            />
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-slate-300 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-teal-600 py-2.5 text-sm font-medium text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus size={16} />
            Lanjut Susun Soal
          </button>
        </div>
      </div>
    </div>
  );
}

/** Kotak folder (dan "Semua Tugas" / "Tanpa Folder") pada grid Beranda */
function FolderBox({ icon, label, count, active, onClick, onDelete }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={`group relative flex cursor-pointer flex-col gap-2 rounded-xl border p-3 text-left transition ${
        active
          ? "border-teal-600 bg-teal-50 ring-1 ring-teal-600"
          : "border-slate-200 bg-white hover:border-teal-300 hover:bg-slate-50"
      }`}
    >
      {onDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          aria-label={`Hapus folder ${label}`}
          className="absolute right-1.5 top-1.5 rounded-md p-1 text-slate-300 opacity-0 transition hover:bg-red-50 hover:text-red-600 focus:opacity-100 group-hover:opacity-100"
        >
          <Trash2 size={14} />
        </button>
      )}
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-lg ${
          active ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-500"
        }`}
      >
        {icon}
      </div>
      <div className="min-w-0 pr-4">
        <p
          className={`truncate text-xs font-semibold ${
            active ? "text-teal-700" : "text-slate-700"
          }`}
          title={label}
        >
          {label}
        </p>
        <p className="text-[11px] text-slate-400">{count} tugas</p>
      </div>
    </div>
  );
}

/** Tampilan Beranda: top bar (Tambah Folder / Tambah Tugas) + daftar tugas per folder */
function Dashboard({
  folders,
  homeworkList,
  loading,
  onOpenHomework,
  onOpenNewFolder,
  onOpenNewAssignment,
  onDeleteFolder,
  onDeleteHomework,
  onViewPublished,
}) {
  const [activeFolderId, setActiveFolderId] = useState("all"); // "all" | "none" | folder id

  const filteredHomework = useMemo(() => {
    if (activeFolderId === "all") return homeworkList;
    if (activeFolderId === "none")
      return homeworkList.filter((h) => !h.folderId);
    return homeworkList.filter((h) => h.folderId === activeFolderId);
  }, [homeworkList, activeFolderId]);

  const countInFolder = (folderId) =>
    homeworkList.filter((h) => h.folderId === folderId).length;
  const countNoFolder = homeworkList.filter((h) => !h.folderId).length;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600 text-white">
              <ClipboardList size={18} />
            </div>
            <h1 className="text-base font-bold text-slate-800">Tugas Saya</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenNewFolder}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 sm:text-sm"
            >
              <FolderPlus size={16} />
              Tambah Folder
            </button>
            <button
              onClick={() => onOpenNewAssignment()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-teal-700 sm:text-sm"
            >
              <Plus size={16} />
              Tambah Tugas
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6">
        {/* Grid folder */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          <FolderBox
            icon={<ClipboardList size={18} />}
            label="Semua Tugas"
            count={homeworkList.length}
            active={activeFolderId === "all"}
            onClick={() => setActiveFolderId("all")}
          />
          <FolderBox
            icon={<FileText size={18} />}
            label="Tanpa Folder"
            count={countNoFolder}
            active={activeFolderId === "none"}
            onClick={() => setActiveFolderId("none")}
          />
          {folders.map((f) => (
            <FolderBox
              key={f.id}
              icon={<Folder size={18} />}
              label={f.name}
              count={countInFolder(f.id)}
              active={activeFolderId === f.id}
              onClick={() => setActiveFolderId(f.id)}
              onDelete={() => {
                if (activeFolderId === f.id) setActiveFolderId("all");
                onDeleteFolder(f.id, f.name);
              }}
            />
          ))}
          <button
            type="button"
            onClick={onOpenNewFolder}
            className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 p-3 text-slate-400 transition hover:border-teal-400 hover:bg-teal-50 hover:text-teal-600"
          >
            <FolderPlus size={18} />
            <span className="text-xs font-medium">Folder Baru</span>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400">
            <Loader2 size={18} className="animate-spin" />
            Memuat tugas…
          </div>
        ) : filteredHomework.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="text-sm text-slate-400">Belum ada tugas di sini.</p>
            <button
              onClick={() =>
                onOpenNewAssignment(
                  activeFolderId !== "all" && activeFolderId !== "none"
                    ? activeFolderId
                    : null
                )
              }
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-700 transition hover:bg-teal-100"
            >
              <Plus size={14} />
              Tambah Tugas
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {filteredHomework.map((hw) => (
              <div
                key={hw.id}
                role="button"
                tabIndex={0}
                onClick={() => onOpenHomework(hw.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onOpenHomework(hw.id);
                  }
                }}
                className="group relative flex cursor-pointer flex-col items-start rounded-xl border border-slate-200 bg-white p-4 pr-16 text-left shadow-sm transition hover:border-teal-300 hover:shadow-md"
              >
                {hw.status === "published" && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewPublished(hw.id);
                    }}
                    aria-label="Lihat soal & siswa yang ditunjuk"
                    title="Lihat soal & siswa yang ditunjuk"
                    className="absolute right-11 top-3 rounded-lg p-1.5 text-slate-300 opacity-0 transition hover:bg-teal-50 hover:text-teal-600 focus:opacity-100 group-hover:opacity-100"
                  >
                    <Eye size={16} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteHomework(hw.id, hw.title || "Tanpa judul");
                  }}
                  aria-label="Hapus tugas"
                  className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-300 opacity-0 transition hover:bg-red-50 hover:text-red-600 focus:opacity-100 group-hover:opacity-100"
                >
                  <Trash2 size={16} />
                </button>

                <div className="mb-2 flex w-full items-center justify-between">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      hw.status === "published"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {hw.status === "published" ? "Terpublikasi" : "Draf"}
                  </span>
                  {hw.dueDate && (
                    <span className="flex items-center gap-1 text-[11px] text-slate-400">
                      <Calendar size={11} />
                      {formatDueDateDisplay(hw.dueDate)}
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-semibold text-slate-800 group-hover:text-teal-700">
                  {hw.title || "Tanpa judul"}
                </h3>
                {hw.description && (
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                    {hw.description}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {hw.subject && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
                      {hw.subject}
                    </span>
                  )}
                  {hw.grade && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
                      {hw.grade}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Tampilan editor soal — sama seperti sebelumnya, tanpa field tenggat waktu di Detail Tugas */
/**
 * Panel Penilaian: menampilkan siswa yang ditugaskan (homework_assignments)
 * beserta status pengerjaannya dan jawaban yang dikirim.
 *
 * PENTING — mengikuti skema `homework_submissions` yang SUNGGUHAN dipakai
 * oleh StudentHomework.js (bukan asumsi awal saya):
 *   homework_submissions (id, homework_id, student_id, answers jsonb,
 *                          score numeric, max_score numeric, submitted_at)
 * `answers` adalah OBJEK, bukan array: { [question_id]: string[] } — setiap
 * key adalah homework_questions.id, valuenya array jawaban blank sejajar
 * urutan `blanks` pada soal tsb. Skor sudah dihitung otomatis oleh siswa
 * saat submit (lihat computeInteractiveScore di StudentHomework.js); guru
 * hanya bisa menimpa nilai akhir secara manual di sini kalau perlu.
 *
 * PENTING JUGA — tabel ini butuh policy SELECT & UPDATE untuk guru/admin.
 * Policy yang ada di StudentHomework.js ("siswa kelola submission sendiri")
 * cuma mengizinkan `auth.uid() = student_id`, jadi guru tidak bisa melihat
 * apapun sampai policy tambahan dibuat — lihat migrasi SQL terpisah.
 */
function GradingPanel({ homeworkId, questions }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]); // { studentId, name, assignedAt, submission }
  const [savingId, setSavingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [scoreDrafts, setScoreDrafts] = useState({}); // studentId -> string

  const load = useCallback(async () => {
    if (!homeworkId) return;
    setLoading(true);
    setError("");
    try {
      const { data: assignRows, error: assignErr } = await supabase
        .from("homework_assignments")
        .select("student_id, assigned_at")
        .eq("homework_id", homeworkId);
      if (assignErr) throw assignErr;

      const studentIds = [
        ...new Set((assignRows || []).map((r) => r.student_id)),
      ];
      let profilesById = new Map();
      if (studentIds.length > 0) {
        const { data: profilesData, error: profilesErr } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", studentIds);
        if (profilesErr) throw profilesErr;
        profilesById = new Map((profilesData || []).map((p) => [p.id, p]));
      }

      // Kolom mengikuti skema sungguhan di StudentHomework.js: score,
      // max_score, submitted_at — TIDAK ada graded_at.
      const { data: subRows, error: subErr } = await supabase
        .from("homework_submissions")
        .select("student_id, answers, score, max_score, submitted_at")
        .eq("homework_id", homeworkId);
      if (subErr) {
        // Kalau ini gagal dengan pesan permission/RLS, artinya policy
        // SELECT untuk guru/admin belum ditambahkan ke tabel ini.
        throw subErr;
      }
      const subByStudent = new Map(
        (subRows || []).map((r) => [r.student_id, r])
      );

      const merged = (assignRows || [])
        .map((r) => ({
          studentId: r.student_id,
          name:
            profilesById.get(r.student_id)?.full_name ||
            "Siswa tidak ditemukan",
          assignedAt: r.assigned_at,
          submission: subByStudent.get(r.student_id) || null,
        }))
        .sort((a, b) => a.name.localeCompare(b.name, "id"));

      setRows(merged);
      setScoreDrafts(
        Object.fromEntries(
          merged
            .filter((r) => r.submission)
            .map((r) => [r.studentId, r.submission.score ?? ""])
        )
      );
    } catch (err) {
      console.error("Gagal memuat data penilaian:", err);
      setError(err.message || "Gagal memuat data penilaian.");
    } finally {
      setLoading(false);
    }
  }, [homeworkId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSaveScore = async (studentId, submission) => {
    if (!submission) return;
    const value = scoreDrafts[studentId];
    setSavingId(studentId);
    try {
      // Hanya kolom `score` yang ditimpa guru — `max_score` &
      // `submitted_at` tetap milik data asli siswa, tidak disentuh.
      const { error } = await checkedUpdate(
        supabase
          .from("homework_submissions")
          .update({ score: value === "" ? null : Number(value) })
          .eq("homework_id", homeworkId)
          .eq("student_id", studentId)
      );
      if (error) throw error;
      await load();
    } catch (err) {
      console.error("Gagal menyimpan nilai:", err);
      setError(err.message || "Gagal menyimpan nilai.");
    } finally {
      setSavingId(null);
    }
  };

  if (!homeworkId) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-400">
        Simpan draf atau publikasikan tugas terlebih dahulu untuk melihat
        penilaian.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-400">
        <Loader2 size={16} className="animate-spin" />
        Memuat data penilaian…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
        Gagal memuat data penilaian: {error}
        <br />
        Kalau pesannya terkait permission/RLS, tambahkan policy SELECT untuk
        guru/admin di tabel <code>homework_submissions</code> (lihat migrasi
        SQL terpisah).
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-400">
        Belum ada siswa yang ditugaskan. Bagikan tugas ini terlebih dahulu
        lewat tombol "Bagikan ke Siswa".
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((r) => {
        const status = r.submission ? "Sudah mengerjakan" : "Belum mengerjakan";
        const statusColor = r.submission
          ? "bg-emerald-50 text-emerald-700"
          : "bg-slate-100 text-slate-500";

        return (
          <div
            key={r.studentId}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  {r.name}
                </p>
                <span
                  className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor}`}
                >
                  {status}
                  {r.submission &&
                    ` · Nilai: ${r.submission.score ?? 0}/${r.submission.max_score ?? 0}`}
                </span>
              </div>

              {r.submission && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setExpandedId(
                        expandedId === r.studentId ? null : r.studentId
                      )
                    }
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                  >
                    {expandedId === r.studentId
                      ? "Sembunyikan Jawaban"
                      : "Lihat Jawaban"}
                  </button>
                  <input
                    type="number"
                    min={0}
                    placeholder="Nilai"
                    value={scoreDrafts[r.studentId] ?? ""}
                    onChange={(e) =>
                      setScoreDrafts((prev) => ({
                        ...prev,
                        [r.studentId]: e.target.value,
                      }))
                    }
                    className="w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                  />
                  <button
                    onClick={() => handleSaveScore(r.studentId, r.submission)}
                    disabled={savingId === r.studentId}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingId === r.studentId ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Save size={14} />
                    )}
                    Simpan
                  </button>
                </div>
              )}
            </div>

            {expandedId === r.studentId && r.submission && (
              <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
                {questions.map((q, i) => {
                  // `answers` adalah objek { [question_id]: string[] },
                  // sesuai skema yang ditulis StudentHomework.js.
                  const given = r.submission.answers?.[q.id] || [];
                  return (
                    <div key={q.id} className="rounded-lg bg-slate-50 p-3">
                      <p className="mb-1 text-xs font-medium text-slate-500">
                        Soal {i + 1}
                      </p>
                      {(q.imageUrl || q.image_url) && (
                        <img
                          src={q.imageUrl || q.image_url}
                          alt="Gambar soal"
                          className="mb-2 max-h-32 rounded-lg border border-slate-200 object-contain"
                        />
                      )}
                      {(q.audioUrl || q.audio_url) && (
                        <audio
                          src={q.audioUrl || q.audio_url}
                          controls
                          className="mb-2 h-9 w-full max-w-[260px]"
                        />
                      )}
                      <p className="mb-2 text-sm text-slate-700">
                        {q.questionText || q.question_text}
                      </p>
                      {q.type === "pilihan_ganda" ? (
                        (() => {
                          const options = q.options || [];
                          const correctId = q.correctOptionId ?? q.correct_option_id;
                          const chosenId = given[0];
                          const chosenOpt = options.find((o) => o.id === chosenId);
                          const isCorrect = chosenId != null && chosenId === correctId;
                          const correctOpt = options.find((o) => o.id === correctId);
                          return (
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span
                                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                  isCorrect
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-red-50 text-red-600"
                                }`}
                                title={correctOpt ? `Kunci: ${correctOpt.text}` : undefined}
                              >
                                {chosenOpt ? chosenOpt.text : "Belum dijawab"}
                              </span>
                              {!isCorrect && correctOpt && (
                                <span className="text-xs text-slate-400">
                                  (Kunci: {correctOpt.text})
                                </span>
                              )}
                            </div>
                          );
                        })()
                      ) : q.type === "speaking" ? (
                        (() => {
                          const recordingUrl = given[0];
                          const referenceAnswer = q.referenceAnswer ?? q.reference_answer;
                          return recordingUrl ? (
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2">
                                <Mic size={14} className="shrink-0 text-teal-600" />
                                <audio
                                  src={recordingUrl}
                                  controls
                                  className="h-9 max-w-[280px]"
                                />
                              </div>
                              {referenceAnswer && (
                                <p className="text-xs text-slate-400">
                                  Acuan guru: {referenceAnswer}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
                              Belum ada rekaman
                            </span>
                          );
                        })()
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {(q.blanks || []).map((key, bi) => {
                            const val = given[bi] ?? "-";
                            const correct =
                              String(val).trim().toLowerCase() ===
                              String(key).trim().toLowerCase();
                            return (
                              <span
                                key={bi}
                                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                  correct
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-red-50 text-red-600"
                                }`}
                                title={`Kunci: ${key}`}
                              >
                                {val}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}


function HomeworkEditor({ initialHomework, onBack, onSaved }) {
  const [homework, setHomework] = useState(initialHomework);

  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [studentsError, setStudentsError] = useState("");
  const alreadyAssignedIdsRef = useRef(new Set());

  // Ambil daftar siswa nyata milik guru yang login begitu editor dibuka,
  // supaya sudah siap saat guru sampai ke langkah "Bagikan langsung ke
  // siswa" di ShareModal (tidak perlu menunggu publish dulu). Kalau tugas
  // ini sudah pernah dibagikan sebelumnya (homework.id ada), siswa yang
  // sudah ditugaskan otomatis tercentang supaya guru bisa lihat siapa saja
  // yang sudah menerima, dan supaya tidak insert baris ganda saat
  // "Bagikan" ditekan lagi (mis. setelah mengubah tenggat waktu).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingStudents(true);
      setStudentsError("");
      try {
        const [list, assignedIds] = await Promise.all([
          fetchTeacherStudents(),
          fetchAssignedStudentIds(initialHomework.id),
        ]);
        if (!cancelled) {
          alreadyAssignedIdsRef.current = assignedIds;
          setStudents(
            list.map((s) => ({ ...s, selected: assignedIds.has(s.id) }))
          );
        }
      } catch (err) {
        console.error("Gagal memuat daftar siswa:", err);
        if (!cancelled) {
          setStudentsError(err.message || "Gagal memuat daftar siswa.");
        }
      } finally {
        if (!cancelled) setLoadingStudents(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialHomework.id]);

  const [status, setStatus] = useState("draft"); // draft | saving | publishing | unpublishing | published
  const [shareInfo, setShareInfo] = useState(
    initialHomework.shareCode
      ? {
          code: initialHomework.shareCode,
          link: `${
            typeof window !== "undefined"
              ? window.location.origin
              : "https://app.sekolah.id"
          }/tugas/${initialHomework.shareCode}`,
        }
      : null
  );
  const [showShareModal, setShowShareModal] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const [dueDateInput, setDueDateInput] = useState(
    toDateTimeInputValue(initialHomework.dueDate)
  );
  const [assigning, setAssigning] = useState(false);
  const [assignMessage, setAssignMessage] = useState("");
  const [updatingDueDate, setUpdatingDueDate] = useState(false);
  const [dueDateMessage, setDueDateMessage] = useState("");

  // Tab aktif: "setup" (detail tugas), "soal" (lembar soal), atau
  // "penilaian" (siswa yang mengerjakan + input nilai).
  const [activeTab, setActiveTab] = useState("setup");

  const totalPoints = useMemo(
    () => homework.questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0),
    [homework.questions]
  );

  // Ringkasan jumlah soal per tipe — ditampilkan di tab "Lembar Soal" supaya
  // jelas isian, pilihan ganda, dan speaking memang bercampur dalam SATU
  // lembar kerja/homework yang sama (bukan lembar terpisah per tipe).
  const typeCounts = useMemo(() => {
    const counts = { isian: 0, pilihan_ganda: 0, speaking: 0 };
    homework.questions.forEach((q) => {
      const t = q.type || "isian";
      if (counts[t] !== undefined) counts[t] += 1;
    });
    return counts;
  }, [homework.questions]);

  const updateField = (field, value) => {
    setHomework((prev) => ({ ...prev, [field]: value }));
  };

  const addQuestion = () => {
    setHomework((prev) => ({
      ...prev,
      questions: [...prev.questions, createEmptyQuestion()],
    }));
  };

  const updateQuestion = useCallback((id, updated) => {
    setHomework((prev) => ({
      ...prev,
      questions: prev.questions.map((q) => (q.id === id ? updated : q)),
    }));
  }, []);

  const deleteQuestion = useCallback((id) => {
    setHomework((prev) => ({
      ...prev,
      questions: prev.questions.filter((q) => q.id !== id),
    }));
  }, []);

  const toggleStudent = (id) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === id ? { ...s, selected: !s.selected } : s))
    );
  };

  const validateHomework = () => {
    if (!homework.title.trim()) return "Judul tugas belum diisi.";
    if (homework.questions.length === 0) return "Tambahkan minimal satu soal.";
    const emptyQuestion = homework.questions.find((q) => !q.questionText.trim());
    if (emptyQuestion) return "Ada soal yang masih kosong.";

    const noBlank = homework.questions.find(
      (q) => q.type === "isian" && q.blanks.length === 0
    );
    if (noBlank) return "Setiap soal isian harus memiliki minimal satu bagian [blank].";

    const pgQuestions = homework.questions.filter((q) => q.type === "pilihan_ganda");
    const pgIncomplete = pgQuestions.find(
      (q) => q.options.filter((o) => o.text.trim()).length < 2
    );
    if (pgIncomplete) return "Setiap soal pilihan ganda harus memiliki minimal 2 opsi terisi.";
    const pgNoAnswer = pgQuestions.find((q) => !q.correctOptionId);
    if (pgNoAnswer) return "Setiap soal pilihan ganda harus punya jawaban benar yang ditandai.";

    return null;
  };

  /**
   * Menyimpan metadata tugas + soal-soal ke Supabase sebagai draf.
   * - upsert ke tabel `homework` (insert jika baru, update jika sudah punya id)
   * - hapus lalu insert ulang baris di `homework_questions`
   *
   * Catatan: `due_date` sengaja TIDAK disertakan di sini — tenggat waktu
   * baru ditulis lewat handleAssignToStudents saat tugas dibagikan.
   */
  const persistHomework = async (extraFields = {}) => {
    const homeworkPayload = {
      title: homework.title,
      subject: homework.subject || null,
      grade: homework.grade || null,
      description: homework.description || null,
      folder_id: homework.folderId || null,
      ...extraFields,
    };
    if (homework.id) homeworkPayload.id = homework.id;

    const { data: hwData, error: hwError } = await supabase
      .from("homework")
      .upsert(homeworkPayload)
      .select()
      .single();
    if (hwError) throw hwError;

    const homeworkId = hwData.id;

    const { error: deleteError } = await supabase
      .from("homework_questions")
      .delete()
      .eq("homework_id", homeworkId);
    if (deleteError) throw deleteError;

    if (homework.questions.length > 0) {
      const questionsPayload = homework.questions.map((q, index) => ({
        homework_id: homeworkId,
        question_text: q.questionText,
        image_url: q.imageUrl || null,
        audio_url: q.audioUrl || null,
        type: q.type || "isian",
        blanks: q.type === "isian" ? q.blanks : [],
        options: q.type === "pilihan_ganda" ? q.options : null,
        correct_option_id: q.type === "pilihan_ganda" ? q.correctOptionId : null,
        reference_answer: q.type === "speaking" ? q.referenceAnswer || null : null,
        points: q.points,
        order_index: index,
      }));
      const { error: qError } = await supabase
        .from("homework_questions")
        .insert(questionsPayload);
      if (qError) throw qError;
    }

    return hwData;
  };

  const handleSaveDraft = async () => {
    setStatus("saving");
    setSaveMessage("");
    try {
      // Pertahankan status yang sedang berjalan (draft/published) — dulu
      // fungsi ini selalu memaksa status kembali ke "draft" setiap kali
      // disimpan, sehingga tugas yang sudah terpublikasi diam-diam
      // "ter-unpublish" tanpa sepengetahuan guru. Sekarang melepas
      // publikasi hanya terjadi lewat tombol "Batalkan Publikasi" yang
      // eksplisit (lihat handleUnpublish).
      const hwData = await persistHomework({
        status: homework.status === "published" ? "published" : "draft",
      });
      setHomework((prev) => ({ ...prev, id: hwData.id }));
      setSaveMessage(
        homework.status === "published"
          ? "Perubahan berhasil disimpan."
          : "Draf berhasil disimpan."
      );
      onSaved?.();
    } catch (err) {
      console.error(err);
      setSaveMessage(`Gagal menyimpan: ${err.message || "Terjadi kesalahan"}`);
    } finally {
      setStatus(homework.status === "published" ? "published" : "draft");
      setTimeout(() => setSaveMessage(""), 3000);
    }
  };

  /**
   * Melepaskan publikasi tugas (status "published" -> "draft") TANPA
   * menyentuh share_code, tenggat waktu, maupun baris homework_assignments
   * yang sudah ada. Tujuannya supaya guru bisa merevisi soal dengan bebas,
   * lalu mempublikasikan ulang lewat handlePublish di bawah — yang secara
   * otomatis memakai ulang share_code lama, jadi link/kode yang sudah
   * dipegang siswa tetap berlaku dan mereka tidak perlu ditugaskan ulang.
   */
  const handleUnpublish = async () => {
    if (!homework.id) return;
    setStatus("unpublishing");
    setSaveMessage("");
    try {
      const { error } = await checkedUpdate(
        supabase
          .from("homework")
          .update({ status: "draft" })
          .eq("id", homework.id)
      );
      if (error) throw error;

      setHomework((prev) => ({ ...prev, status: "draft" }));
      setSaveMessage(
        "Publikasi dibatalkan. Silakan revisi soal, lalu publikasikan ulang — siswa yang sama akan tetap memakai kode/link yang sama."
      );
      onSaved?.();
    } catch (err) {
      console.error(err);
      setSaveMessage(
        `Gagal membatalkan publikasi: ${err.message || "Terjadi kesalahan"}`
      );
    } finally {
      setStatus("draft");
      setTimeout(() => setSaveMessage(""), 4000);
    }
  };

  /**
   * Mempublikasikan (atau MEMPUBLIKASIKAN ULANG) tugas: simpan status
   * "published" + share_code. Tenggat waktu BELUM ditulis di sini —
   * pengguna akan diminta mengisinya di ShareModal, tepat sebelum tugas
   * benar-benar dibagikan ke siswa.
   *
   * Kalau tugas ini sudah pernah punya share_code sebelumnya (mis. baru
   * saja "Batalkan Publikasi" lalu direvisi), share_code LAMA dipakai
   * ulang alih-alih membuat kode baru — supaya link/kode yang sudah
   * dipegang siswa tetap valid dan baris homework_assignments yang sudah
   * ada tidak perlu ditugaskan ulang dari nol.
   */
  const handlePublish = async () => {
    const validationError = validateHomework();
    if (validationError) {
      setSaveMessage(validationError);
      setTimeout(() => setSaveMessage(""), 3000);
      return;
    }

    setStatus("publishing");
    try {
      const shareCode = homework.shareCode || generateShareCode();
      const hwData = await persistHomework({
        status: "published",
        share_code: shareCode,
      });

      const link = `${
        typeof window !== "undefined" ? window.location.origin : "https://app.sekolah.id"
      }/tugas/${hwData.share_code}`;

      setHomework((prev) => ({
        ...prev,
        id: hwData.id,
        status: "published",
        shareCode: hwData.share_code,
      }));
      setShareInfo({ code: hwData.share_code, link });
      setShowShareModal(true);
      setStatus("published");
      onSaved?.();
    } catch (err) {
      console.error(err);
      setSaveMessage(`Gagal mempublikasikan tugas: ${err.message || "Terjadi kesalahan"}`);
      setStatus("draft");
    }
  };

  /**
   * Menyimpan tenggat waktu SAJA, tanpa menyentuh homework_assignments.
   * Dipakai lewat tombol "Simpan Tenggat Waktu" di ShareModal — supaya
   * guru bisa mengubah/menunda deadline tugas yang sudah dibagikan tanpa
   * harus memilih ulang siswa (sebelumnya tombol "Bagikan" mengharuskan
   * minimal satu siswa terpilih, jadi tidak bisa dipakai hanya untuk
   * mengubah tanggal).
   */
  const handleUpdateDueDate = async () => {
    if (!dueDateInput) {
      setDueDateMessage("Tenggat waktu tidak boleh kosong.");
      return;
    }
    if (!homework.id) {
      setDueDateMessage("Simpan/publikasikan tugas terlebih dahulu.");
      return;
    }

    setUpdatingDueDate(true);
    setDueDateMessage("");
    try {
      const { error } = await checkedUpdate(
        supabase
          .from("homework")
          .update({ due_date: dueDateInput })
          .eq("id", homework.id)
      );
      if (error) throw error;

      setHomework((prev) => ({ ...prev, dueDate: dueDateInput }));
      setDueDateMessage("Tenggat waktu berhasil diperbarui.");
      onSaved?.();
    } catch (err) {
      console.error(err);
      setDueDateMessage(
        `Gagal memperbarui tenggat waktu: ${err.message || "Terjadi kesalahan"}`
      );
    } finally {
      setUpdatingDueDate(false);
      setTimeout(() => setDueDateMessage(""), 3000);
    }
  };

  /**
   * Menuliskan tenggat waktu ke tugas yang sudah dipublikasikan, lalu
   * membuat baris `homework_assignments` untuk siswa yang BARU dipilih
   * (siswa yang sebelumnya sudah punya baris assignment dilewati, supaya
   * tidak dobel — lihat catatan `fetchAssignedStudentIds` di atas).
   *
   * `students` di sini sudah berisi siswa nyata (UUID dari profiles.id)
   * hasil `fetchTeacherStudents()`, jadi aman langsung diinsert ke
   * homework_assignments.student_id (kolom uuid).
   *
   * PENTING: homework_assignments.student_id TIDAK punya FK constraint resmi
   * ke profiles.id (lihat bagian 4.4 dokumentasi skema) — insert akan tetap
   * berhasil walau id-nya salah/sudah terhapus. Pastikan RLS policy INSERT
   * di tabel ini membatasi ke tugas milik guru yang login (guru_owns_tugas()
   * atau pola serupa), karena tidak ada FK yang menjaga integritasnya di
   * level database.
   */
  const handleAssignToStudents = async () => {
    if (!dueDateInput) {
      setAssignMessage("Tenggat waktu wajib diisi sebelum membagikan tugas.");
      return;
    }
    const selectedStudents = students.filter((s) => s.selected);
    if (selectedStudents.length === 0) {
      setAssignMessage("Pilih minimal satu siswa.");
      return;
    }

    const newStudents = selectedStudents.filter(
      (s) => !alreadyAssignedIdsRef.current.has(s.id)
    );

    setAssigning(true);
    setAssignMessage("");
    try {
      const { error: updateError } = await checkedUpdate(
        supabase
          .from("homework")
          .update({ due_date: dueDateInput })
          .eq("id", homework.id)
      );
      if (updateError) throw updateError;

      if (newStudents.length > 0) {
        const assignmentsPayload = newStudents.map((s) => ({
          homework_id: homework.id,
          student_id: s.id,
        }));
        const { error: assignError } = await supabase
          .from("homework_assignments")
          .insert(assignmentsPayload);
        if (assignError) throw assignError;

        newStudents.forEach((s) => alreadyAssignedIdsRef.current.add(s.id));
      }

      setHomework((prev) => ({ ...prev, dueDate: dueDateInput }));
      setAssignMessage(
        newStudents.length > 0
          ? `Tugas berhasil dibagikan ke ${newStudents.length} siswa baru.`
          : "Tenggat waktu diperbarui. Semua siswa terpilih sudah pernah ditugaskan sebelumnya."
      );
      onSaved?.();
    } catch (err) {
      console.error(err);
      setAssignMessage(`Gagal membagikan tugas: ${err.message || "Terjadi kesalahan"}`);
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
            aria-label="Kembali ke beranda"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-600 text-white">
            <ClipboardList size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              Buat Tugas Isi Titik-Titik
            </h1>
            <p className="text-sm text-slate-500">
              Susun soal fill-in-the-blank dan bagikan ke siswa Anda.
            </p>
          </div>
        </div>

        {/* Navigasi Tab */}
        <div className="mb-6 flex gap-2 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
          {[
            { key: "setup", label: "Detail Tugas", icon: PenLine },
            { key: "soal", label: "Lembar Soal", icon: ListChecks },
            { key: "penilaian", label: "Penilaian", icon: Users },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-teal-600 text-white shadow-sm"
                    : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                <Icon size={15} />
                {tab.label}
                {tab.key === "soal" && (
                  <span
                    className={`ml-1 rounded-full px-1.5 text-xs ${
                      active ? "bg-teal-500" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {homework.questions.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab: Detail Tugas */}
        {activeTab === "setup" && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <PenLine size={16} />
            Detail Tugas
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-500">
                Judul Tugas
              </label>
              <input
                type="text"
                value={homework.title}
                onChange={(e) => updateField("title", e.target.value)}
                placeholder="Contoh: Latihan IPA - Tata Surya"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
              />
            </div>

            <div>
              <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <BookOpen size={13} />
                Mata Pelajaran
              </label>
              <select
                value={homework.subject}
                onChange={(e) => updateField("subject", e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
              >
                <option value="">Pilih mata pelajaran</option>
                {SUBJECT_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <GraduationCap size={13} />
                Tingkat Kelas
              </label>
              <select
                value={homework.grade}
                onChange={(e) => updateField("grade", e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
              >
                <option value="">Pilih kelas</option>
                {GRADE_GROUPS.map((group) => (
                  <optgroup key={group.label} label={group.label}>
                    {group.options.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <FileText size={13} />
                Keterangan Tugas
              </label>
              <textarea
                rows={2}
                value={homework.description}
                onChange={(e) => updateField("description", e.target.value)}
                placeholder="Jelaskan singkat tentang tugas ini, misalnya materi yang dicakup atau instruksi khusus."
                className="w-full resize-none rounded-lg border border-slate-300 p-3 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
              />
            </div>

            <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
              <span>
                Total Poin:{" "}
                <span className="font-semibold text-slate-800">{totalPoints}</span>
              </span>
              {homework.dueDate ? (
                <span className="flex items-center gap-1 text-xs text-slate-400">
                  <Calendar size={13} />
                  Tenggat: {formatDueDateDisplay(homework.dueDate)}
                </span>
              ) : (
                <span className="text-xs text-slate-400">
                  Tenggat waktu akan diminta saat tugas dibagikan
                </span>
              )}
            </div>
          </div>
        </div>
        )}

        {/* Tab: Lembar Soal */}
        {activeTab === "soal" && (
        <div className="rounded-xl border border-slate-200 bg-slate-100/60 p-5">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <ListChecks size={16} />
              Daftar Soal ({homework.questions.length})
            </h2>
            <button
              onClick={addQuestion}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-teal-600 px-3 py-1.5 text-xs font-medium text-teal-700 transition hover:bg-teal-50"
            >
              <Plus size={14} />
              Tambah Soal
            </button>
          </div>
          <p className="mb-4 text-xs text-slate-400">
            Isian, pilihan ganda, dan speaking boleh dicampur bebas dalam satu
            lembar kerja ini — atur tipe tiap soal lewat tombol di kartu
            masing-masing.
            {homework.questions.length > 0 && (
              <>
                {" "}
                Saat ini: {typeCounts.isian} Isian · {typeCounts.pilihan_ganda}{" "}
                Pilihan Ganda · {typeCounts.speaking} Speaking.
              </>
            )}
          </p>

          <div className="space-y-4">
            {homework.questions.map((q, i) => (
              <QuestionEditor
                key={q.id}
                question={q}
                index={i}
                onChange={updateQuestion}
                onDelete={deleteQuestion}
              />
            ))}

            {homework.questions.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-400">
                Belum ada soal. Klik "Tambah Soal" untuk memulai.
              </div>
            )}
          </div>
        </div>
        )}

        {/* Tab: Penilaian */}
        {activeTab === "penilaian" && (
          <div className="rounded-xl border border-slate-200 bg-slate-100/60 p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Users size={16} />
              Siswa yang Mengerjakan
            </h2>
            <GradingPanel homeworkId={homework.id} questions={homework.questions} />
          </div>
        )}

        {/* Aksi bawah */}
        <div className="sticky bottom-4 mt-6 flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-lg sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-slate-400">
            {saveMessage ? (
              <span
                className={
                  saveMessage.includes("berhasil")
                    ? "font-medium text-emerald-600"
                    : "font-medium text-red-500"
                }
              >
                {saveMessage}
              </span>
            ) : (
              "Perubahan disimpan secara lokal sampai Anda menekan simpan."
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleSaveDraft}
              disabled={["saving", "publishing", "unpublishing"].includes(status)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === "saving" ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              Simpan Draf
            </button>

            {homework.status === "published" ? (
              <>
                <button
                  onClick={handleUnpublish}
                  disabled={["saving", "publishing", "unpublishing"].includes(status)}
                  title="Kembalikan tugas ke draf supaya soal bisa direvisi, lalu publikasikan ulang ke siswa yang sama"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {status === "unpublishing" ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <X size={16} />
                  )}
                  Batalkan Publikasi
                </button>
                <button
                  onClick={() => setShowShareModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-700"
                >
                  <Share2 size={16} />
                  Bagikan ke Siswa
                </button>
              </>
            ) : (
              <button
                onClick={handlePublish}
                disabled={["saving", "publishing", "unpublishing"].includes(status)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {status === "publishing" ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Share2 size={16} />
                )}
                {homework.shareCode ? "Publikasikan Ulang" : "Publish & Bagikan"}
              </button>
            )}
          </div>
        </div>
      </div>

      {showShareModal && shareInfo && (
        <ShareModal
          shareCode={shareInfo.code}
          shareLink={shareInfo.link}
          students={students}
          loadingStudents={loadingStudents}
          studentsError={studentsError}
          onToggleStudent={toggleStudent}
          onClose={() => setShowShareModal(false)}
          dueDate={dueDateInput}
          onDueDateChange={setDueDateInput}
          onUpdateDueDate={handleUpdateDueDate}
          updatingDueDate={updatingDueDate}
          dueDateMessage={dueDateMessage}
          onAssign={handleAssignToStudents}
          assigning={assigning}
          assignMessage={assignMessage}
        />
      )}
    </div>
  );
}

export default function TeacherHomework() {
  const [view, setView] = useState("dashboard"); // dashboard | editor
  const [folders, setFolders] = useState([]);
  const [homeworkList, setHomeworkList] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [activeHomework, setActiveHomework] = useState(null);

  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [showNewAssignmentModal, setShowNewAssignmentModal] = useState(false);
  const [pendingFolderId, setPendingFolderId] = useState(null);
  const [viewingHomeworkId, setViewingHomeworkId] = useState(null);

  const fetchHomeworkList = useCallback(async () => {
    setLoadingList(true);
    try {
      const { data, error } = await supabase
        .from("homework")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      setHomeworkList(
        (data || []).map((row) => ({
          id: row.id,
          title: row.title,
          subject: row.subject,
          grade: row.grade,
          description: row.description,
          dueDate: row.due_date,
          status: row.status,
          shareCode: row.share_code,
          folderId: row.folder_id,
        }))
      );
    } catch (err) {
      console.error("Gagal memuat daftar tugas:", err);
    } finally {
      setLoadingList(false);
    }
  }, []);

  const fetchFolders = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("homework_folders")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      setFolders((data || []).map((row) => ({ id: row.id, name: row.name })));
    } catch (err) {
      // Jika tabel homework_folders belum punya RLS policy, query ini akan
      // gagal (bukan error jaringan) — folder tetap kosong, fitur lain tidak
      // ikut terganggu.
      console.error("Gagal memuat daftar folder:", err);
    }
  }, []);

  useEffect(() => {
    fetchHomeworkList();
    fetchFolders();
  }, [fetchHomeworkList, fetchFolders]);

  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'folder'|'homework', id, label }

  const handleCreateFolder = async (name) => {
    const { data, error } = await supabase
      .from("homework_folders")
      .insert({ name })
      .select()
      .single();
    if (error) throw error;
    setFolders((prev) => [...prev, { id: data.id, name: data.name }]);
    setShowNewFolderModal(false);
  };

  const requestDeleteFolder = (id, name) => {
    setDeleteTarget({ type: "folder", id, label: name });
  };

  const requestDeleteHomework = (id, title) => {
    setDeleteTarget({ type: "homework", id, label: title });
  };

  const handleConfirmDelete = async (target) => {
    if (target.type === "folder") {
      const { error } = await supabase
        .from("homework_folders")
        .delete()
        .eq("id", target.id);
      if (error) throw error;
      setFolders((prev) => prev.filter((f) => f.id !== target.id));
      // FK homework.folder_id ON DELETE SET NULL sudah melepas ini di DB,
      // samakan juga di state lokal supaya tugas langsung pindah ke
      // "Tanpa Folder" tanpa perlu fetch ulang.
      setHomeworkList((prev) =>
        prev.map((h) =>
          h.folderId === target.id ? { ...h, folderId: null } : h
        )
      );
    } else {
      const { error } = await supabase
        .from("homework")
        .delete()
        .eq("id", target.id);
      if (error) throw error;
      // homework_questions & homework_assignments ikut terhapus otomatis
      // lewat FK ON DELETE CASCADE.
      setHomeworkList((prev) => prev.filter((h) => h.id !== target.id));
    }
    setDeleteTarget(null);
  };

  const handleOpenNewAssignment = (folderId = null) => {
    setPendingFolderId(folderId);
    setShowNewAssignmentModal(true);
  };

  const handleCreateAssignment = (form) => {
    setActiveHomework(createEmptyHomework(form));
    setShowNewAssignmentModal(false);
    setView("editor");
  };

  const handleOpenHomework = async (id) => {
    try {
      const { data: hwRow, error: hwErr } = await supabase
        .from("homework")
        .select("*")
        .eq("id", id)
        .single();
      if (hwErr) throw hwErr;

      const { data: qRows, error: qErr } = await supabase
        .from("homework_questions")
        .select("*")
        .eq("homework_id", id)
        .order("order_index", { ascending: true });
      if (qErr) throw qErr;

      setActiveHomework({
        id: hwRow.id,
        title: hwRow.title || "",
        subject: hwRow.subject || "",
        grade: hwRow.grade || "",
        description: hwRow.description || "",
        dueDate: hwRow.due_date || "",
        folderId: hwRow.folder_id || null,
        status: hwRow.status || "draft",
        shareCode: hwRow.share_code || null,
        questions:
          (qRows || []).map((q) => ({
            id: q.id,
            type: q.type || "isian",
            questionText: q.question_text,
            imageUrl: q.image_url || null,
            audioUrl: q.audio_url || null,
            blanks: q.blanks || [],
            options: q.options || [],
            correctOptionId: q.correct_option_id || null,
            referenceAnswer: q.reference_answer || "",
            points: q.points,
          })) || [],
      });
      setView("editor");
    } catch (err) {
      console.error("Gagal membuka tugas:", err);
    }
  };

  const handleBackToDashboard = () => {
    setActiveHomework(null);
    setView("dashboard");
    fetchHomeworkList();
  };

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