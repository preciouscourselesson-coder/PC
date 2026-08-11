import { useRef, useState } from "react";
import { supabase } from "../../../../supabaseClient";
import { createEmptyOption } from "../utils/factories";
import { extractBlanks } from "../utils/questionText";

/**
 * Mengelola seluruh state & handler untuk satu kartu soal di QuestionEditor:
 * ubah teks/poin/tipe, opsi pilihan ganda, catatan speaking, upload gambar
 * & audio ke Supabase Storage, dan pembuatan blank [kata] dari teks terpilih.
 */
export function useQuestionEditor(question, onChange) {
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
   * URL-nya ke field `imageUrl` pada soal.
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
   * pola path yang sama seperti gambar.
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

  return {
    textareaRef,
    imageInputRef,
    audioInputRef,
    uploadingImage,
    imageError,
    uploadingAudio,
    audioError,
    handleTextChange,
    handlePointsChange,
    handleTypeChange,
    handleOptionTextChange,
    handleAddOption,
    handleRemoveOption,
    handleSetCorrectOption,
    handleReferenceAnswerChange,
    handleImageChange,
    handleRemoveImage,
    handleAudioChange,
    handleRemoveAudio,
    handleMakeBlank,
  };
}
