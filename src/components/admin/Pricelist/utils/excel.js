import * as XLSX from 'xlsx';
import { CSV_COLUMNS, SHEET_NAME } from '../constants';

// Bangun worksheet dari daftar row (object) sesuai urutan & label CSV_COLUMNS
export const rowsToWorksheet = (rows) => {
  const header = CSV_COLUMNS.map((c) => c.label);
  const body = rows.map((row) => CSV_COLUMNS.map((c) => {
    const val = row[c.key];
    return val === null || val === undefined ? '' : val;
  }));
  const ws = XLSX.utils.aoa_to_sheet([header, ...body]);
  ws['!cols'] = CSV_COLUMNS.map((c) => ({ wch: Math.max(14, c.label.length + 2) }));
  return ws;
};

export const downloadExcelFile = (filename, rows) => {
  const wb = XLSX.utils.book_new();
  const ws = rowsToWorksheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, SHEET_NAME);
  XLSX.writeFile(wb, filename);
};

// Baca file .xlsx/.xls yang diupload user, kembalikan array of arrays (baris 0 = header).
// cellDates:true agar kolom tanggal terbaca sebagai objek Date (bukan string berformat locale).
export const readExcelFile = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const wb = XLSX.read(data, { type: 'array', cellDates: true });
        const firstSheetName = wb.SheetNames[0];
        const ws = wb.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });
        resolve(rows.filter((r) => r.some((cell) => String(cell).trim() !== '')));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error || new Error('Gagal membaca file'));
    reader.readAsArrayBuffer(file);
  });

// Ubah nilai sel (bisa Date, number, atau string) menjadi teks format YYYY-MM-DD
export const cellToIsoDate = (cellValue) => {
  if (cellValue instanceof Date && !Number.isNaN(cellValue.getTime())) {
    const y = cellValue.getFullYear();
    const m = String(cellValue.getMonth() + 1).padStart(2, '0');
    const d = String(cellValue.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(cellValue == null ? '' : cellValue).trim();
};

// Ubah nilai sel apapun jadi string biasa (untuk kolom non-tanggal)
export const cellToString = (cellValue) => (cellValue == null ? '' : String(cellValue).trim());
