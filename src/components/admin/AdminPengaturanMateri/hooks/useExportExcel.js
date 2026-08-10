import * as XLSX from 'xlsx';
import { STATUS_DB_TO_LABEL } from '../theme';
import { formatTanggal, formatTanggalSingkat } from '../utils/formatters';

// Export data ke file .xlsx, mengikuti tab sumber yang sedang aktif
// (materi guru / sesi pembelajaran / bank soal siswa).
export const useExportExcel = ({
  activeSource,
  rows,
  sesiRows, sesiEnriched,
  bankRows, bankEnriched,
  showError, showSuccess,
}) => {
  const handleDownloadAll = () => {
    if (activeSource === 'materi') {
      if (rows.length === 0) { showError('Tidak ada materi untuk didownload.'); return; }
      const exportData = rows.map((r, i) => ({
        No: i + 1,
        'Judul Materi': r.nama,
        Deskripsi: r.deskripsi || '',
        Mapel: r.mapel || '-',
        'Bab / Topik': r.bab || '-',
        Kelas: r.kelas || '-',
        Teacher: r.diupload_oleh || '-',
        'Tanggal Publish': formatTanggal(r.tanggal),
        Status: STATUS_DB_TO_LABEL[r.status] || r.status,
      }));
      const ws = XLSX.utils.json_to_sheet(exportData);
      ws['!cols'] = [{ wch: 5 }, { wch: 28 }, { wch: 30 }, { wch: 16 }, { wch: 22 }, { wch: 8 }, { wch: 20 }, { wch: 18 }, { wch: 12 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Materi Guru');
      XLSX.writeFile(wb, `materi_guru_${new Date().toISOString().slice(0, 19)}.xlsx`);
      showSuccess(`${rows.length} materi berhasil didownload.`);
    } else if (activeSource === 'sesi') {
      if (sesiRows.length === 0) { showError('Tidak ada data sesi untuk didownload.'); return; }
      const exportData = sesiEnriched.map((r, i) => ({
        No: i + 1,
        Siswa: r.siswaNama,
        Guru: r.guruNama,
        Tanggal: formatTanggalSingkat(r.tanggal),
        'Judul Materi': r.judul_materi,
        Catatan: r.catatan || '',
        'Jumlah Bukti': (r.bukti_urls || []).length,
        Status: r.status,
      }));
      const ws = XLSX.utils.json_to_sheet(exportData);
      ws['!cols'] = [{ wch: 5 }, { wch: 22 }, { wch: 22 }, { wch: 14 }, { wch: 28 }, { wch: 30 }, { wch: 12 }, { wch: 12 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sesi Pembelajaran');
      XLSX.writeFile(wb, `sesi_pembelajaran_${new Date().toISOString().slice(0, 19)}.xlsx`);
      showSuccess(`${sesiRows.length} sesi berhasil didownload.`);
    } else {
      if (bankRows.length === 0) { showError('Tidak ada data bank soal untuk didownload.'); return; }
      const exportData = bankEnriched.map((r, i) => ({
        No: i + 1,
        Siswa: r.siswaNama,
        Jenis: r.jenis,
        Bab: r.bab || '-',
        'Sub Bab': r.sub_bab || '-',
        Judul: r.judul,
        Deskripsi: r.deskripsi || '',
        'Nama File': r.file_name || '-',
        Tanggal: formatTanggalSingkat(r.created_at),
      }));
      const ws = XLSX.utils.json_to_sheet(exportData);
      ws['!cols'] = [{ wch: 5 }, { wch: 22 }, { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 26 }, { wch: 30 }, { wch: 24 }, { wch: 14 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Bank Soal Siswa');
      XLSX.writeFile(wb, `bank_soal_siswa_${new Date().toISOString().slice(0, 19)}.xlsx`);
      showSuccess(`${bankRows.length} data berhasil didownload.`);
    }
  };

  return { handleDownloadAll };
};

export default useExportExcel;
