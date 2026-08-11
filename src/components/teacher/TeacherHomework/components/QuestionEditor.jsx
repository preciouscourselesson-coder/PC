import { Check, Image as ImageIcon, Loader2, Mic, Music, Plus, Trash2, Type, X } from "lucide-react";
import { useQuestionEditor } from "../hooks/useQuestionEditor";

export function QuestionEditor({ question, index, onChange, onDelete }) {
  const {
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
  } = useQuestionEditor(question, onChange);

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
    </div>
  );
}
