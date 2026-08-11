import { useState } from "react";
import { BookOpen, ClipboardList, FileText, Folder, GraduationCap, Plus, X } from "lucide-react";
import { SUBJECT_OPTIONS, GRADE_GROUPS } from "../constants";

/**
 * Modal untuk membuat tugas baru. Hanya meminta keterangan tugas (judul,
 * mata pelajaran, kelas, deskripsi) — tenggat waktu TIDAK diminta di sini,
 * baru diminta nanti saat tugas dibagikan ke siswa lewat ShareModal.
 */
export function NewAssignmentModal({ folders, defaultFolderId, onCreate, onClose }) {
  const [form, setForm] = useState({
    title: "",
    subject: "",
    grade: "",
    description: "",
    folderId: defaultFolderId || "",
  });

  const update = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const canSubmit = form.title.trim().length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onCreate({ ...form, folderId: form.folderId || null });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
            <ClipboardList size={20} className="text-teal-600" />
            Tugas Baru
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>
        <p className="mb-4 text-sm text-slate-500">
          Isi keterangan tugas terlebih dahulu. Tenggat waktu akan diminta
          nanti saat Anda membagikan tugas ini ke siswa.
        </p>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">
              Judul Tugas
            </label>
            <input
              autoFocus
              type="text"
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="Contoh: Latihan IPA - Tata Surya"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <BookOpen size={13} />
                Mata Pelajaran
              </label>
              <select
                value={form.subject}
                onChange={(e) => update("subject", e.target.value)}
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
                value={form.grade}
                onChange={(e) => update("grade", e.target.value)}
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
          </div>

          {folders.length > 0 && (
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <Folder size={13} />
                Folder (opsional)
              </label>
              <select
                value={form.folderId}
                onChange={(e) => update("folderId", e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
              >
                <option value="">Tanpa folder</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <FileText size={13} />
              Keterangan Tugas
            </label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Jelaskan singkat tentang tugas ini, misalnya materi yang dicakup atau instruksi khusus."
              className="w-full resize-none rounded-lg border border-slate-300 p-3 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
            />
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-slate-300 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-teal-600 py-2.5 text-sm font-medium text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus size={16} />
            Lanjut Susun Soal
          </button>
        </div>
      </div>
    </div>
  );
}
