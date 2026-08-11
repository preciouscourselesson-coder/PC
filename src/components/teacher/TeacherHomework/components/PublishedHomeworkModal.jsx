import { Calendar, Eye, ListChecks, Loader2, PenLine, Save, Users, X } from "lucide-react";
import { usePublishedHomework } from "../hooks/usePublishedHomework";
import { QuestionPreview } from "./QuestionPreview";

/**
 * Modal read-only untuk melihat soal yang sudah dipublikasikan beserta
 * siswa yang ditunjuk (assigned), sekaligus mengubah tenggat waktu langsung
 * dari sini — tanpa perlu membuka editor soal lengkap. Dibuka dari kartu
 * tugas di Beranda lewat tombol mata (👁) yang hanya muncul untuk tugas
 * berstatus "published".
 */
export function PublishedHomeworkModal({ homeworkId, onClose, onSaved, onEdit }) {
  const {
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
  } = usePublishedHomework(homeworkId, onSaved);

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
