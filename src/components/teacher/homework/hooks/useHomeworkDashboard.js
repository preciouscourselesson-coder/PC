import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../../../supabaseClient";
import { createEmptyHomework } from "../utils/factories";

/**
 * Mengelola seluruh state & aksi level Beranda: daftar tugas, daftar folder,
 * navigasi dashboard <-> editor, serta modal-modal terkait (folder baru,
 * tugas baru, konfirmasi hapus, lihat tugas terpublikasi).
 *
 * PENTING — folder dibaca/ditulis langsung ke tabel `homework_folders`
 * (bukan state lokal semata). Tabel ini sudah RLS aktif tapi butuh policy
 * agar query select/insert/delete dari client berhasil.
 *
 * PENTING JUGA — isolasi data antar guru. Policy RLS tabel `homework` saat
 * ini adalah "guru pemilik (teacher_id) full akses" DITAMBAH "siapapun
 * boleh SELECT jika status = 'published'". Policy kedua itu memang perlu
 * (supaya siswa bisa buka tugas lewat share_code), TAPI efek sampingnya:
 * kalau query di sini tidak difilter, Beranda seorang guru akan ikut
 * menampilkan tugas published milik guru LAIN juga. Karena itu
 * `fetchHomeworkList` & `fetchFolders` di bawah SENGAJA menambahkan
 * `.eq("teacher_id", user.id)` secara eksplisit di sisi client, bukan
 * mengandalkan RLS saja.
 */
export function useHomeworkDashboard() {
  const [view, setView] = useState("dashboard"); // dashboard | editor
  const [folders, setFolders] = useState([]);
  const [homeworkList, setHomeworkList] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [activeHomework, setActiveHomework] = useState(null);

  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [showNewAssignmentModal, setShowNewAssignmentModal] = useState(false);
  const [pendingFolderId, setPendingFolderId] = useState(null);
  const [viewingHomeworkId, setViewingHomeworkId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'folder'|'homework', id, label }

  /**
   * Mengambil id guru yang sedang login. Dipakai untuk membatasi
   * `fetchHomeworkList`/`fetchFolders` hanya ke data milik guru ini —
   * lihat catatan isolasi data di atas.
   */
  const getCurrentTeacherId = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Sesi tidak ditemukan. Silakan login ulang.");
    return user.id;
  };

  const fetchHomeworkList = useCallback(async () => {
    setLoadingList(true);
    try {
      const teacherId = await getCurrentTeacherId();
      const { data, error } = await supabase
        .from("homework")
        .select("*")
        .eq("teacher_id", teacherId)
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
      const teacherId = await getCurrentTeacherId();
      const { data, error } = await supabase
        .from("homework_folders")
        .select("*")
        .eq("teacher_id", teacherId)
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
      // Filter teacher_id juga di sini (bukan cuma di fetchHomeworkList) —
      // jaga-jaga supaya guru tidak bisa membuka/mengedit tugas guru lain
      // lewat id, meskipun RLS "siapapun boleh SELECT jika published"
      // sebenarnya masih akan mengizinkan SELECT-nya.
      const teacherId = await getCurrentTeacherId();
      const { data: hwRow, error: hwErr } = await supabase
        .from("homework")
        .select("*")
        .eq("id", id)
        .eq("teacher_id", teacherId)
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

  return {
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
  };
}
