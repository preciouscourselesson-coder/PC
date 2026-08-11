import { useEffect, useState } from "react";
import { supabase } from "../../../../supabaseClient";
import { checkedUpdate } from "../../../../utils/supabaseUpdateGuard";
import { toDateTimeInputValue } from "../utils/date";

/**
 * Mengambil detail tugas yang sudah dipublikasikan (metadata, daftar soal
 * read-only, dan siswa yang ditunjuk), serta menyediakan aksi mengubah
 * tenggat waktu langsung tanpa membuka editor lengkap.
 *
 * Fetch dilakukan mandiri (tidak lewat props homeworkList) supaya selalu
 * dapat data terbaru, termasuk daftar siswa yang di-assign.
 *
 * Catatan: homework_assignments.student_id TIDAK punya FK resmi ke
 * profiles.id, jadi embed nested select lewat PostgREST tidak bisa
 * diandalkan — data siswa diambil lewat dua query terpisah, sama seperti
 * pola di `fetchTeacherStudents()`.
 */
export function usePublishedHomework(homeworkId, onSaved) {
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

  return {
    loading,
    error,
    homework,
    questions,
    assignedStudents,
    dueDateInput,
    setDueDateInput,
    saving,
    saveMessage,
    handleSaveDueDate,
  };
}
