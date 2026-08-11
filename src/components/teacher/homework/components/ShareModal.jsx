import { Calendar, Check, Copy, Loader2, Save, Share2, Users, X } from "lucide-react";
import { useCopyToClipboard } from "../hooks/useCopyToClipboard";

/**
 * Modal share tugas. Tenggat waktu pengerjaan diminta di sini — bukan saat
 * tugas dibuat — karena tenggat baru relevan ketika tugas benar-benar
 * dibagikan ke siswa.
 */
export function ShareModal({
  shareCode,
  shareLink,
  students,
  loadingStudents,
  studentsError,
  onToggleStudent,
  onClose,
  dueDate,
  onDueDateChange,
  onUpdateDueDate,
  updatingDueDate,
  dueDateMessage,
  onAssign,
  assigning,
  assignMessage,
}) {
  const { copiedField, handleCopy } = useCopyToClipboard();
  const selectedCount = students.filter((s) => s.selected).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">
            Tugas Berhasil Dipublikasikan 🎉
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        <p className="mb-4 text-sm text-slate-500">
          Bagikan link atau kode berikut kepada siswa Anda untuk mengerjakan
          tugas ini.
        </p>

        {/* Link unik */}
        <div className="mb-3">
          <label className="mb-1 block text-xs font-medium text-slate-500">
            Link Tugas
          </label>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={shareLink}
              className="flex-1 truncate rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600"
            />
            <button
              onClick={() => handleCopy(shareLink, "link")}
              className="flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-teal-700"
            >
              {copiedField === "link" ? <Check size={16} /> : <Copy size={16} />}
              {copiedField === "link" ? "Tersalin" : "Salin"}
            </button>
          </div>
        </div>

        {/* Kode tugas */}
        <div className="mb-5">
          <label className="mb-1 block text-xs font-medium text-slate-500">
            Kode Tugas
          </label>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={shareCode}
              className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-center text-lg font-bold tracking-widest text-slate-700"
            />
            <button
              onClick={() => handleCopy(shareCode, "code")}
              className="flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-teal-700"
            >
              {copiedField === "code" ? <Check size={16} /> : <Copy size={16} />}
              {copiedField === "code" ? "Tersalin" : "Salin"}
            </button>
          </div>
        </div>

        {/* Tenggat waktu — bisa diubah kapan saja, terpisah dari langkah
            "Bagikan ke siswa" di bawah (klik "Simpan" tidak menyentuh
            daftar siswa yang sudah ditugaskan). */}
        <div className="mb-5">
          <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <Calendar size={13} />
            Tenggat Waktu Pengerjaan (Tanggal & Jam)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => onDueDateChange(e.target.value)}
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
            />
            <button
              type="button"
              onClick={onUpdateDueDate}
              disabled={updatingDueDate || !dueDate}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-teal-600 px-3 py-2 text-sm font-medium text-teal-700 transition hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {updatingDueDate ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Save size={14} />
              )}
              Simpan
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Wajib diisi sebelum membagikan tugas ke siswa terpilih di bawah.
            Sudah dibagikan sebelumnya? Ubah tanggal lalu klik "Simpan" — tidak
            perlu memilih ulang siswa.
          </p>
          {dueDateMessage && (
            <p
              className={`mt-1 text-xs font-medium ${
                dueDateMessage.includes("berhasil")
                  ? "text-emerald-600"
                  : "text-red-500"
              }`}
            >
              {dueDateMessage}
            </p>
          )}
        </div>

        {/* Bagikan ke kelas */}
        <div>
          <label className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <Users size={14} />
            Bagikan langsung ke siswa
          </label>
          <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
            {loadingStudents ? (
              <div className="flex items-center justify-center gap-2 py-4 text-xs text-slate-400">
                <Loader2 size={14} className="animate-spin" />
                Memuat daftar siswa…
              </div>
            ) : studentsError ? (
              <p className="px-2 py-3 text-xs text-red-500">{studentsError}</p>
            ) : students.length === 0 ? (
              <p className="px-2 py-3 text-xs text-slate-400">
                Belum ada siswa di jadwal Anda. Tambahkan siswa lewat halaman
                Jadwal terlebih dahulu.
              </p>
            ) : (
              students.map((s) => (
                <label
                  key={s.id}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={s.selected}
                    onChange={() => onToggleStudent(s.id)}
                    className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  {s.name}
                </label>
              ))
            )}
          </div>
        </div>

        {assignMessage && (
          <p
            className={`mt-3 text-xs font-medium ${
              assignMessage.includes("berhasil")
                ? "text-emerald-600"
                : "text-red-500"
            }`}
          >
            {assignMessage}
          </p>
        )}

        <div className="mt-5 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-slate-300 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Tutup
          </button>
          <button
            onClick={onAssign}
            disabled={assigning || selectedCount === 0}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-teal-600 py-2.5 text-sm font-medium text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {assigning ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Share2 size={16} />
            )}
            Bagikan{selectedCount > 0 ? ` ke ${selectedCount} Siswa` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
