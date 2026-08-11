/**
 * Mengubah nilai due_date dari Supabase (bisa berupa "YYYY-MM-DD" lama,
 * "YYYY-MM-DD HH:mm:ss", atau string ISO dengan timezone) menjadi format
 * yang dibutuhkan <input type="datetime-local">, yaitu "YYYY-MM-DDTHH:mm".
 * Data lama yang cuma tanggal (belum punya jam) diasumsikan jam 23:59
 * supaya tidak tampil kosong di form.
 */
export function toDateTimeInputValue(value) {
  if (!value) return "";
  const normalized = String(value).replace(" ", "T");
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return `${normalized}T23:59`;
  }
  return normalized.slice(0, 16);
}

/**
 * Memformat due_date untuk ditampilkan ke guru, mis. "4 Agustus 2026, 23.59".
 */
export function formatDueDateDisplay(value) {
  if (!value) return "";
  const normalized =
    String(value).length === 10 ? `${value}T23:59` : String(value).replace(" ", "T");
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return value;
  const tanggal = d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const jam = d.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${tanggal}, ${jam}`;
}
