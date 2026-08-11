import { Calendar, Eye } from "lucide-react";
import { formatDueDateDisplay } from "../utils/date";
import { QuestionPreview } from "./QuestionPreview";

/**
 * Lembar Preview — menampilkan seluruh tugas (judul, keterangan, dan semua
 * soal berurutan) persis seperti yang akan dilihat siswa saat mengerjakan.
 * Sengaja dipisah dari "Lembar Soal" (tempat guru mengetik/mengedit soal)
 * supaya guru bisa mengecek tampilan akhir tanpa terganggu kontrol
 * editing di tiap kartu soal.
 */
export function PreviewSheet({ homework }) {
  const { title, subject, grade, description, dueDate, questions } = homework;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
        <Eye size={16} />
        Preview — Tampilan untuk Siswa
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
        <h2 className="text-lg font-bold text-slate-800">
          {title || "Tanpa judul"}
        </h2>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {subject && (
            <span className="rounded-full bg-white px-2 py-0.5 text-[11px] text-slate-500 ring-1 ring-slate-200">
              {subject}
            </span>
          )}
          {grade && (
            <span className="rounded-full bg-white px-2 py-0.5 text-[11px] text-slate-500 ring-1 ring-slate-200">
              {grade}
            </span>
          )}
          {dueDate && (
            <span className="flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] text-slate-500 ring-1 ring-slate-200">
              <Calendar size={11} />
              Tenggat: {formatDueDateDisplay(dueDate)}
            </span>
          )}
        </div>
        {description && (
          <p className="mt-3 text-sm text-slate-600">{description}</p>
        )}
      </div>

      <div className="mt-4 space-y-3">
        {questions.map((q, i) => (
          <div key={q.id} className="rounded-xl border border-slate-200 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-600 text-xs font-semibold text-white">
                {i + 1}
              </span>
              <span className="text-xs font-medium text-slate-400">
                {q.points} poin
              </span>
            </div>
            <QuestionPreview
              text={q.questionText}
              imageUrl={q.imageUrl}
              audioUrl={q.audioUrl}
              type={q.type}
              options={q.options}
              correctOptionId={q.correctOptionId}
            />
          </div>
        ))}

        {questions.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-400">
            Belum ada soal untuk ditampilkan. Tambahkan soal dulu di "Lembar
            Soal".
          </div>
        )}
      </div>
    </div>
  );
}
