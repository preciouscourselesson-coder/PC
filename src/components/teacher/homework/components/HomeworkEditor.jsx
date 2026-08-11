import {
  ArrowLeft,
  BookOpen,
  Calendar,
  ClipboardList,
  Eye,
  FileText,
  GraduationCap,
  ListChecks,
  Loader2,
  PenLine,
  Plus,
  Save,
  Share2,
  Users,
  X,
} from "lucide-react";
import { GRADE_GROUPS, SUBJECT_OPTIONS } from "../constants";
import { useHomeworkEditor } from "../hooks/useHomeworkEditor";
import { formatDueDateDisplay } from "../utils/date";
import { GradingPanel } from "./GradingPanel";
import { PreviewSheet } from "./PreviewSheet";
import { QuestionEditor } from "./QuestionEditor";
import { ShareModal } from "./ShareModal";

/** Tampilan editor soal: detail tugas, lembar soal, dan penilaian dalam satu tugas (tanpa field tenggat waktu di Detail Tugas) */
export function HomeworkEditor({ initialHomework, onBack, onSaved }) {
  const {
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
  } = useHomeworkEditor(initialHomework, onSaved);

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
            { key: "preview", label: "Preview", icon: Eye },
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

        {/* Tab: Preview — lembar terpisah dari Lembar Soal, menampilkan
            tugas persis seperti yang dilihat siswa */}
        {activeTab === "preview" && <PreviewSheet homework={homework} />}

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
