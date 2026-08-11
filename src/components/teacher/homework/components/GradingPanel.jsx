import { Loader2, Mic, Save } from "lucide-react";
import { useGradingPanel } from "../hooks/useGradingPanel";

/**
 * Panel Penilaian: menampilkan siswa yang ditugaskan (homework_assignments)
 * beserta status pengerjaannya dan jawaban yang dikirim.
 */
export function GradingPanel({ homeworkId, questions }) {
  const {
    loading,
    error,
    rows,
    savingId,
    expandedId,
    setExpandedId,
    scoreDrafts,
    setScoreDrafts,
    handleSaveScore,
  } = useGradingPanel(homeworkId);

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
