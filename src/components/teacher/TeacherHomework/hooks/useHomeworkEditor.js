import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../../../supabaseClient";
import { checkedUpdate } from "../../../../utils/supabaseUpdateGuard";
import { fetchAssignedStudentIds, fetchTeacherStudents } from "../api/students";
import { createEmptyQuestion } from "../utils/factories";
import { generateShareCode } from "../utils/id";
import { toDateTimeInputValue } from "../utils/date";

/**
 * Mengelola seluruh state & logika editor tugas: detail tugas, daftar soal,
 * simpan draf, publish/unpublish, tenggat waktu, dan pembagian tugas ke
 * siswa nyata (lewat ShareModal).
 */
export function useHomeworkEditor(initialHomework, onSaved) {
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
   * tidak dobel — lihat catatan `fetchAssignedStudentIds`).
   *
   * `students` di sini sudah berisi siswa nyata (UUID dari profiles.id)
   * hasil `fetchTeacherStudents()`, jadi aman langsung diinsert ke
   * homework_assignments.student_id (kolom uuid).
   *
   * PENTING: homework_assignments.student_id TIDAK punya FK constraint resmi
   * ke profiles.id — insert akan tetap berhasil walau id-nya salah/sudah
   * terhapus. Pastikan RLS policy INSERT di tabel ini membatasi ke tugas
   * milik guru yang login (guru_owns_tugas() atau pola serupa), karena
   * tidak ada FK yang menjaga integritasnya di level database.
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

  return {
    homework,
    students,
    loadingStudents,
    studentsError,
    status,
    shareInfo,
    showShareModal,
    setShowShareModal,
    saveMessage,
    dueDateInput,
    setDueDateInput,
    assigning,
    assignMessage,
    updatingDueDate,
    dueDateMessage,
    activeTab,
    setActiveTab,
    totalPoints,
    typeCounts,
    updateField,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    toggleStudent,
    handleSaveDraft,
    handleUnpublish,
    handlePublish,
    handleUpdateDueDate,
    handleAssignToStudents,
  };
}
