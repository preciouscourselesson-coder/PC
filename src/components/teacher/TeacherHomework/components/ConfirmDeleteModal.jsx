import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";

/**
 * Modal konfirmasi generik untuk aksi hapus (folder maupun tugas).
 * `target` berisi { type: 'folder' | 'homework', id, label }.
 */
export function ConfirmDeleteModal({ target, onConfirm, onCancel }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!target) return null;

  const isFolder = target.type === "folder";

  const handleConfirm = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await onConfirm(target);
    } catch (err) {
      console.error("Gagal menghapus:", err);
      setError(err.message || "Gagal menghapus. Coba lagi.");
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
            <Trash2 size={18} />
          </div>
          <h2 className="text-base font-semibold text-slate-800">
            {isFolder ? "Hapus folder ini?" : "Hapus tugas ini?"}
          </h2>
        </div>

        <p className="text-sm text-slate-500">
          {isFolder ? (
            <>
              Folder <span className="font-medium text-slate-700">"{target.label}"</span>{" "}
              akan dihapus. Tugas di dalamnya tidak ikut terhapus — hanya
              berpindah menjadi "Tanpa Folder".
            </>
          ) : (
            <>
              Tugas <span className="font-medium text-slate-700">"{target.label}"</span>{" "}
              beserta seluruh soal dan riwayat penugasannya ke siswa akan
              dihapus permanen. Tindakan ini tidak bisa dibatalkan.
            </>
          )}
        </p>

        {error && <p className="mt-2 text-xs font-medium text-red-500">{error}</p>}

        <div className="mt-5 flex gap-2">
          <button
            onClick={onCancel}
            disabled={submitting}
            className="flex-1 rounded-lg border border-slate-300 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Batal
          </button>
          <button
            onClick={handleConfirm}
            disabled={submitting}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-red-600 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            Hapus
          </button>
        </div>
      </div>
    </div>
  );
}
