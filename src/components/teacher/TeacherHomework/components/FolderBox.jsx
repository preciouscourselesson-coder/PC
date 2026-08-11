import { Trash2 } from "lucide-react";

/** Kotak folder (dan "Semua Tugas" / "Tanpa Folder") pada grid Beranda */
export function FolderBox({ icon, label, count, active, onClick, onDelete }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={`group relative flex cursor-pointer flex-col gap-2 rounded-xl border p-3 text-left transition ${
        active
          ? "border-teal-600 bg-teal-50 ring-1 ring-teal-600"
          : "border-slate-200 bg-white hover:border-teal-300 hover:bg-slate-50"
      }`}
    >
      {onDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          aria-label={`Hapus folder ${label}`}
          className="absolute right-1.5 top-1.5 rounded-md p-1 text-slate-300 opacity-0 transition hover:bg-red-50 hover:text-red-600 focus:opacity-100 group-hover:opacity-100"
        >
          <Trash2 size={14} />
        </button>
      )}
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-lg ${
          active ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-500"
        }`}
      >
        {icon}
      </div>
      <div className="min-w-0 pr-4">
        <p
          className={`truncate text-xs font-semibold ${
            active ? "text-teal-700" : "text-slate-700"
          }`}
          title={label}
        >
          {label}
        </p>
        <p className="text-[11px] text-slate-400">{count} tugas</p>
      </div>
    </div>
  );
}
