import { Check, Mic } from "lucide-react";

/** Merender preview soal: gambar/audio (jika ada) + teks biasa + kotak blank untuk setiap [kata], atau daftar opsi untuk soal pilihan ganda */
export function QuestionPreview({
  text,
  imageUrl,
  audioUrl,
  type = "isian",
  options = [],
  correctOptionId = null,
}) {
  const parts = text.split(/(\[.+?\])/g).filter((p) => p !== "");
  const isPilihanGanda = type === "pilihan_ganda";
  const isSpeaking = type === "speaking";

  if (!text.trim() && !imageUrl && !audioUrl) {
    return (
      <p className="text-sm italic text-slate-400">
        Preview akan muncul di sini setelah Anda mengetik soal…
      </p>
    );
  }

  const optionLetters = ["A", "B", "C", "D", "E", "F"];

  return (
    <div>
      {imageUrl && (
        <img
          src={imageUrl}
          alt="Gambar soal"
          className="mb-2 max-h-64 w-full rounded-lg border border-slate-200 object-contain"
        />
      )}
      {audioUrl && (
        <audio
          src={audioUrl}
          controls
          className="mb-2 w-full"
        />
      )}
      {text.trim() && !isPilihanGanda && !isSpeaking && (
        <p className="text-base leading-8 text-slate-700">
          {parts.map((part, i) => {
            const match = part.match(/^\[(.+?)\]$/);
            if (match) {
              return (
                <span
                  key={i}
                  className="mx-1 inline-block min-w-[64px] rounded-md border-b-2 border-dashed border-teal-500 bg-teal-50 px-3 py-0.5 text-center align-middle text-teal-700"
                  title={`Jawaban: ${match[1]}`}
                >
                  &nbsp;
                </span>
              );
            }
            return <span key={i}>{part}</span>;
          })}
        </p>
      )}
      {text.trim() && (isPilihanGanda || isSpeaking) && (
        <p className="mb-2 text-base leading-7 text-slate-700">{text}</p>
      )}
      {isSpeaking && (
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-teal-300 bg-teal-50 px-3 py-3 text-sm text-teal-700">
          <Mic size={18} className="shrink-0" />
          Siswa akan merekam jawaban suara di sini
        </div>
      )}
      {isPilihanGanda && (
        <div className="space-y-1.5">
          {options.map((opt, i) => {
            const isCorrect = opt.id === correctOptionId;
            return (
              <div
                key={opt.id || i}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                  isCorrect
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-white text-slate-700"
                }`}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    isCorrect
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {optionLetters[i] || i + 1}
                </span>
                <span className="flex-1">{opt.text || "(opsi kosong)"}</span>
                {isCorrect && <Check size={15} className="shrink-0 text-emerald-600" />}
              </div>
            );
          })}
          {options.length === 0 && (
            <p className="text-sm italic text-slate-400">
              Belum ada opsi jawaban…
            </p>
          )}
        </div>
      )}
    </div>
  );
}
