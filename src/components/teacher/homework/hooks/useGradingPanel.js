import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../../../supabaseClient";
import { checkedUpdate } from "../../../../utils/supabaseUpdateGuard";

/**
 * Mengambil siswa yang ditugaskan (homework_assignments) beserta status
 * pengerjaan & jawabannya (homework_submissions), dan menyediakan aksi
 * menyimpan nilai akhir secara manual.
 *
 * PENTING — mengikuti skema `homework_submissions` yang SUNGGUHAN dipakai
 * oleh StudentHomework.js:
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
 * apapun sampai policy tambahan dibuat.
 */
export function useGradingPanel(homeworkId) {
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

  return {
    loading,
    error,
    rows,
    savingId,
    expandedId,
    setExpandedId,
    scoreDrafts,
    setScoreDrafts,
    handleSaveScore,
  };
}
