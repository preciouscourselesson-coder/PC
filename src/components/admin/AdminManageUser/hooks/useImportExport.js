// Hook untuk fitur Excel: download template, ekspor data user, dan impor user massal.
import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { ROLE_LABEL, STATUS_LABEL, GENDER_LABEL } from '../constants';
import { parseRoleFromSheet, parseGenderFromSheet, parseKelasFromSheet } from '../utils/excelParsers';
import { createUserViaEdgeFunction } from '../utils/api';

export default function useImportExport({ users, setToast, fetchUsers }) {
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  const handleDownloadTemplate = () => {
    const templateData = [
      { Nama: 'Contoh Nama', Email: 'contoh@email.com', Role: 'Guru', Gender: 'L', Kelas: '', Password: 'password123' },
      { Nama: '', Email: '', Role: 'Siswa', Gender: 'P', Kelas: 'X', Password: '' },
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    ws['!cols'] = [{ wch: 25 }, { wch: 30 }, { wch: 12 }, { wch: 10 }, { wch: 8 }, { wch: 18 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template User');
    XLSX.writeFile(wb, 'template_import_user.xlsx');
    setToast({ type: 'success', message: 'Template berhasil didownload.' });
  };

  const handleExport = () => {
    if (users.length === 0) {
      setToast({ type: 'error', message: 'Tidak ada data untuk diekspor.' });
      return;
    }
    const exportData = users.map(u => ({
      Nama: u.full_name || '',
      Email: u.email,
      Role: ROLE_LABEL[u.role] || u.role,
      Gender: GENDER_LABEL[u.gender] || '-',
      Kelas: u.role === 'student' ? (u.kelas || '-') : '-',
      Mapel: u.role === 'teacher' ? (u.mapel || []).join(', ') : '-',
      'Kode Referral': u.referral_code || '-',
      Status: STATUS_LABEL[u.status] || u.status,
      Terdaftar: u.created_at ? new Date(u.created_at).toLocaleDateString('id-ID') : '',
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pengguna');
    XLSX.writeFile(wb, `pengguna_${new Date().toISOString().slice(0, 19)}.xlsx`);
    setToast({ type: 'success', message: `Ekspor ${users.length} user berhasil.` });
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet);
        if (!rows.length) throw new Error('File kosong.');

        const usersToImport = [];
        const skipped = [];
        for (const row of rows) {
          const name = row.Nama || row.nama || '';
          const email = row.Email || row.email || '';
          const password = (row.Password || row.password || '').toString();
          const role = parseRoleFromSheet(row.Role || row.role);
          const gender = parseGenderFromSheet(row.Gender || row.gender);
          const kelas = role === 'student' ? parseKelasFromSheet(row.Kelas || row.kelas) : null;

          if (!name || !email || !password || !role) {
            if (name || email) skipped.push(email || name);
            continue;
          }
          if (password.length < 6) {
            skipped.push(email);
            continue;
          }
          usersToImport.push({ full_name: name, email, password, role, gender, kelas });
        }

        if (!usersToImport.length) throw new Error('Tidak ada baris valid untuk diimpor.');

        let success = 0, fail = 0;
        for (const u of usersToImport) {
          try {
            await createUserViaEdgeFunction({ ...u, status: 'approved' });
            success++;
          } catch (err) {
            fail++;
          }
        }

        const skippedNote = skipped.length ? ` (${skipped.length} baris dilewati karena data tidak lengkap)` : '';
        setToast({
          type: fail === 0 ? 'success' : 'error',
          message: `Import selesai: ${success} berhasil, ${fail} gagal.${skippedNote}`,
        });
        fetchUsers();
      } catch (err) {
        setToast({ type: 'error', message: err.message });
      } finally {
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.onerror = () => {
      setImporting(false);
      setToast({ type: 'error', message: 'Gagal membaca file.' });
    };
    reader.readAsArrayBuffer(file);
  };

  return { importing, setImporting, fileInputRef, handleDownloadTemplate, handleExport, handleImport };
}
