import { useState, useRef } from 'react';
import { supabase } from '../../../../supabaseClient';
import { PRICELIST_TABLE, RIWAYAT_TABLE, CSV_COLUMNS, CSV_TEMPLATE_EXAMPLE } from '../constants';
import { downloadExcelFile, readExcelFile, cellToIsoDate, cellToString } from '../utils/excel';
import { validateImportRow } from '../utils/validation';

// Kelola download template, export Excel (mengikuti filter aktif), dan
// import massal dari file Excel ke tabel pricelist.
//
// Params:
// - adminId, adminNama: identitas admin yang login
// - filteredItems: daftar item yang sedang tampil (hasil filter/pencarian aktif) untuk export
// - loadItems: reload daftar item setelah import berhasil
export const useImportExport = ({ adminId, adminNama, filteredItems, loadItems }) => {
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState(null); // { success, errors: [] }
  const [exporting, setExporting] = useState(false);
  const importInputRef = useRef(null);

  // Unduh template Excel kosong (berisi contoh 1 baris) untuk diisi lalu diimpor kembali
  const handleDownloadTemplate = () => {
    downloadExcelFile('template-pricelist.xlsx', [CSV_TEMPLATE_EXAMPLE]);
  };

  // Ekspor data pricelist yang sedang tampil (sesuai filter/pencarian aktif) ke Excel
  const handleExport = () => {
    setExporting(true);
    try {
      const rows = filteredItems.map((it) => ({
        kelas: it.kelas,
        program: it.program,
        jumlah_pertemuan: it.jumlah_pertemuan,
        durasi: it.durasi,
        pengajar: it.pengajar,
        harga_privat: it.harga_privat,
        harga_2siswa: it.harga_2siswa,
        harga_3siswa: it.harga_3siswa,
        harga_4siswa: it.harga_4siswa,
        status: it.status,
        tanggal_berlaku: it.tanggal_berlaku,
      }));
      const tanggal = new Date().toISOString().slice(0, 10);
      downloadExcelFile(`pricelist-export-${tanggal}.xlsx`, rows);
    } finally {
      setExporting(false);
    }
  };

  // Import massal dari file Excel (.xlsx/.xls, hasil template atau ekspor sebelumnya) ke tabel pricelist
  const handleImportFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setImporting(true);
    setImportSummary(null);
    try {
      const table = await readExcelFile(file);
      if (table.length < 2) {
        setImportSummary({ success: 0, errors: ['File kosong atau tidak berisi data setelah baris header.'] });
        return;
      }
      const header = table[0].map((h) => cellToString(h));
      const dataRows = table.slice(1);

      const errors = [];
      const validPayloads = [];

      dataRows.forEach((cells, idx) => {
        const rowNumber = idx + 2; // +2 karena baris 1 = header
        const rowObj = {};
        CSV_COLUMNS.forEach((col) => {
          const colIdx = header.findIndex((h) => h.toLowerCase().startsWith(col.label.split(' (')[0].toLowerCase()));
          const rawCell = colIdx >= 0 ? cells[colIdx] : '';
          rowObj[col.key] = col.key === 'tanggal_berlaku' ? cellToIsoDate(rawCell) : cellToString(rawCell);
        });

        const errMsg = validateImportRow(rowObj, rowNumber);
        if (errMsg) {
          errors.push(errMsg);
          return;
        }

        validPayloads.push({
          kelas: rowObj.kelas,
          program: rowObj.program,
          jumlah_pertemuan: rowObj.jumlah_pertemuan,
          durasi: rowObj.durasi,
          pengajar: rowObj.pengajar,
          harga_privat: Number(rowObj.harga_privat) || 0,
          harga_2siswa: rowObj.harga_2siswa === '' ? null : Number(rowObj.harga_2siswa),
          harga_3siswa: rowObj.harga_3siswa === '' ? null : Number(rowObj.harga_3siswa),
          harga_4siswa: rowObj.harga_4siswa === '' ? null : Number(rowObj.harga_4siswa),
          status: rowObj.status,
          tanggal_berlaku: rowObj.tanggal_berlaku,
          created_by: adminId,
          updated_by: adminId,
        });
      });

      let successCount = 0;
      if (validPayloads.length > 0) {
        const { data: inserted, error: insertError } = await supabase
          .from(PRICELIST_TABLE)
          .insert(validPayloads)
          .select('id');
        if (insertError) {
          errors.push('Gagal menyimpan ke database: ' + insertError.message);
        } else {
          successCount = inserted ? inserted.length : validPayloads.length;
          if (inserted && inserted.length > 0) {
            await supabase.from(RIWAYAT_TABLE).insert(
              inserted.map((row) => ({
                pricelist_id: row.id,
                admin_id: adminId,
                admin_nama: adminNama,
                perubahan: 'Pricelist dibuat lewat import CSV',
              }))
            );
          }
        }
      }

      setImportSummary({ success: successCount, errors });
      if (successCount > 0) await loadItems();
    } catch (err) {
      setImportSummary({ success: 0, errors: ['Gagal membaca file: ' + err.message] });
    } finally {
      setImporting(false);
      if (importInputRef.current) importInputRef.current.value = '';
    }
  };

  return {
    importing, importSummary, exporting, importInputRef,
    handleDownloadTemplate, handleExport, handleImportFile,
  };
};
