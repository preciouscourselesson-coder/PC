import { useMemo, useState } from "react";
import { Calendar, ClipboardList, Eye, FileText, Folder, FolderPlus, Loader2, Plus, Trash2 } from "lucide-react";
import { formatDueDateDisplay } from "../utils/date";
import { FolderBox } from "./FolderBox";

/** Tampilan Beranda: top bar (Tambah Folder / Tambah Tugas) + daftar tugas per folder */
export function Dashboard({
  folders,
  homeworkList,
  loading,
  onOpenHomework,
  onOpenNewFolder,
  onOpenNewAssignment,
  onDeleteFolder,
  onDeleteHomework,
  onViewPublished,
}) {
  const [activeFolderId, setActiveFolderId] = useState("all"); // "all" | "none" | folder id

  const filteredHomework = useMemo(() => {
    if (activeFolderId === "all") return homeworkList;
    if (activeFolderId === "none")
      return homeworkList.filter((h) => !h.folderId);
    return homeworkList.filter((h) => h.folderId === activeFolderId);
  }, [homeworkList, activeFolderId]);

  const countInFolder = (folderId) =>
    homeworkList.filter((h) => h.folderId === folderId).length;
  const countNoFolder = homeworkList.filter((h) => !h.folderId).length;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600 text-white">
              <ClipboardList size={18} />
            </div>
            <h1 className="text-base font-bold text-slate-800">Tugas Saya</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenNewFolder}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 sm:text-sm"
            >
              <FolderPlus size={16} />
              Tambah Folder
            </button>
            <button
              onClick={() => onOpenNewAssignment()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-teal-700 sm:text-sm"
            >
              <Plus size={16} />
              Tambah Tugas
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6">
        {/* Grid folder */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          <FolderBox
            icon={<ClipboardList size={18} />}
            label="Semua Tugas"
            count={homeworkList.length}
            active={activeFolderId === "all"}
            onClick={() => setActiveFolderId("all")}
          />
          <FolderBox
            icon={<FileText size={18} />}
            label="Tanpa Folder"
            count={countNoFolder}
            active={activeFolderId === "none"}
            onClick={() => setActiveFolderId("none")}
          />
          {folders.map((f) => (
            <FolderBox
              key={f.id}
              icon={<Folder size={18} />}
              label={f.name}
              count={countInFolder(f.id)}
              active={activeFolderId === f.id}
              onClick={() => setActiveFolderId(f.id)}
              onDelete={() => {
                if (activeFolderId === f.id) setActiveFolderId("all");
                onDeleteFolder(f.id, f.name);
              }}
            />
          ))}
          <button
            type="button"
            onClick={onOpenNewFolder}
            className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 p-3 text-slate-400 transition hover:border-teal-400 hover:bg-teal-50 hover:text-teal-600"
          >
            <FolderPlus size={18} />
            <span className="text-xs font-medium">Folder Baru</span>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400">
            <Loader2 size={18} className="animate-spin" />
            Memuat tugas…
          </div>
        ) : filteredHomework.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="text-sm text-slate-400">Belum ada tugas di sini.</p>
            <button
              onClick={() =>
                onOpenNewAssignment(
                  activeFolderId !== "all" && activeFolderId !== "none"
                    ? activeFolderId
                    : null
                )
              }
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-700 transition hover:bg-teal-100"
            >
              <Plus size={14} />
              Tambah Tugas
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {filteredHomework.map((hw) => (
              <div
                key={hw.id}
                role="button"
                tabIndex={0}
                onClick={() => onOpenHomework(hw.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onOpenHomework(hw.id);
                  }
                }}
                className="group relative flex cursor-pointer flex-col items-start rounded-xl border border-slate-200 bg-white p-4 pr-16 text-left shadow-sm transition hover:border-teal-300 hover:shadow-md"
              >
                {hw.status === "published" && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewPublished(hw.id);
                    }}
                    aria-label="Lihat soal & siswa yang ditunjuk"
                    title="Lihat soal & siswa yang ditunjuk"
                    className="absolute right-11 top-3 rounded-lg p-1.5 text-slate-300 opacity-0 transition hover:bg-teal-50 hover:text-teal-600 focus:opacity-100 group-hover:opacity-100"
                  >
                    <Eye size={16} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteHomework(hw.id, hw.title || "Tanpa judul");
                  }}
                  aria-label="Hapus tugas"
                  className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-300 opacity-0 transition hover:bg-red-50 hover:text-red-600 focus:opacity-100 group-hover:opacity-100"
                >
                  <Trash2 size={16} />
                </button>

                <div className="mb-2 flex w-full items-center justify-between">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      hw.status === "published"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {hw.status === "published" ? "Terpublikasi" : "Draf"}
                  </span>
                  {hw.dueDate && (
                    <span className="flex items-center gap-1 text-[11px] text-slate-400">
                      <Calendar size={11} />
                      {formatDueDateDisplay(hw.dueDate)}
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-semibold text-slate-800 group-hover:text-teal-700">
                  {hw.title || "Tanpa judul"}
                </h3>
                {hw.description && (
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                    {hw.description}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {hw.subject && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
                      {hw.subject}
                    </span>
                  )}
                  {hw.grade && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
                      {hw.grade}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
