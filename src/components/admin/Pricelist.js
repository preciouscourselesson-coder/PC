import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../../supabaseClient';

// Palet terang (tabel & kartu putih)
const C = {
  gold: '#b4964b',
  goldDark: '#96793a',
  green: '#2d6a4f',
  greenBg: 'rgba(45,106,79,0.10)',
  amber: '#a3760f',
  amberBg: 'rgba(180,150,75,0.14)',
  red: '#b0413e',
  redBg: 'rgba(176,65,62,0.10)',
  blue: '#3f7ea6',
  blueBg: 'rgba(63,126,166,0.12)',
  dark: '#171411',
  gray: '#726d66',
  grayBg: 'rgba(114,109,102,0.12)',
  grayLight: '#a8a29a',
  cream: '#f7f6f0',
  white: '#ffffff',
  border: '#e6e2d8',
};

// Palet gelap & elegan untuk kartu form input & detail (konsisten dengan halaman guru)
const D = {
  bg: '#12141c',
  bgSoft: '#181b26',
  field: '#1c2030',
  fieldBorder: '#2c3145',
  fieldBorderFocus: '#c9a24b',
  gold: '#d4ac52',
  goldSoft: 'rgba(212,172,82,0.14)',
  text: '#f2efe6',
  textMuted: '#9a9fb0',
  textFaint: '#5f6577',
  red: '#e0574f',
  green: '#7fbf9e',
  blue: '#4f8fdb',
  danger: '#e0574f',
};

// ------------------------------------------------------------------
// Opsi dropdown -- disamakan dengan sheet "PRICE_LIST" & "INPUT DATA
// PRICE LIST" pada Pricelist_Precious_Course.xlsx yang diberikan user.
// ------------------------------------------------------------------
const KELAS_OPTIONS = ['SMA', 'SMP'];
const PROGRAM_OPTIONS = [
  'Math Focus',
  'English Focus',
  'Math & English Combo',
  'Complete Science',
  'SNBT Program',
  'Intensive',
];
const PERTEMUAN_OPTIONS = [
  '1x per minggu (4 pertemuan satu bulan)',
  '2x per minggu (8 pertemuan satu bulan)',
  '4x dalam satu minggu',
];
const DURASI_OPTIONS = ['60 Menit', '90 Menit'];
const PENGAJAR_OPTIONS = ['Profesional', 'Mahasiswa'];
const STATUS_OPTIONS = ['Aktif', 'Draft', 'Nonaktif'];

const STATUS_META = {
  Aktif: { bg: C.greenBg, fg: C.green, dot: C.green },
  Draft: { bg: C.amberBg, fg: C.amber, dot: C.amber },
  Nonaktif: { bg: C.grayBg, fg: C.gray, dot: C.gray },
};

const FIELD_LABELS = {
  kelas: 'Kelas',
  program: 'Program',
  jumlah_pertemuan: 'Jumlah Pertemuan',
  durasi: 'Durasi',
  pengajar: 'Pengajar',
  harga_privat: 'Harga Privat',
  harga_2siswa: 'Harga 2 Siswa',
  harga_3siswa: 'Harga 3 Siswa',
  harga_4siswa: 'Harga 4 Siswa',
  status: 'Status',
  tanggal_berlaku: 'Tanggal Berlaku',
};
const HARGA_FIELDS = new Set(['harga_privat', 'harga_2siswa', 'harga_3siswa', 'harga_4siswa']);

const PRICELIST_TABLE = 'pricelist';
const RIWAYAT_TABLE = 'pricelist_riwayat';
const PAGE_SIZE = 8;

// ------------------------------------------------------------------
// Kolom untuk template import & export CSV. Urutan & label kolom ini
// yang akan muncul di file .csv, key merujuk ke nama kolom tabel DB.
// ------------------------------------------------------------------
const CSV_COLUMNS = [
  { key: 'kelas', label: 'Kelas' },
  { key: 'program', label: 'Program' },
  { key: 'jumlah_pertemuan', label: 'Jumlah Pertemuan' },
  { key: 'durasi', label: 'Durasi' },
  { key: 'pengajar', label: 'Pengajar' },
  { key: 'harga_privat', label: 'Harga Privat' },
  { key: 'harga_2siswa', label: 'Harga 2 Siswa' },
  { key: 'harga_3siswa', label: 'Harga 3 Siswa' },
  { key: 'harga_4siswa', label: 'Harga 4 Siswa' },
  { key: 'status', label: 'Status' },
  { key: 'tanggal_berlaku', label: 'Tanggal Berlaku (YYYY-MM-DD)' },
];

const CSV_TEMPLATE_EXAMPLE = {
  kelas: 'SMA',
  program: 'Math Focus',
  jumlah_pertemuan: '1x per minggu (4 pertemuan satu bulan)',
  durasi: '60 Menit',
  pengajar: 'Profesional',
  harga_privat: '500000',
  harga_2siswa: '450000',
  harga_3siswa: '400000',
  harga_4siswa: '350000',
  status: 'Draft',
  tanggal_berlaku: '2026-08-01',
};

const SHEET_NAME = 'Pricelist';

// Bangun worksheet dari daftar row (object) sesuai urutan & label CSV_COLUMNS
const rowsToWorksheet = (rows) => {
  const header = CSV_COLUMNS.map((c) => c.label);
  const body = rows.map((row) => CSV_COLUMNS.map((c) => {
    const val = row[c.key];
    return val === null || val === undefined ? '' : val;
  }));
  const ws = XLSX.utils.aoa_to_sheet([header, ...body]);
  ws['!cols'] = CSV_COLUMNS.map((c) => ({ wch: Math.max(14, c.label.length + 2) }));
  return ws;
};

const downloadExcelFile = (filename, rows) => {
  const wb = XLSX.utils.book_new();
  const ws = rowsToWorksheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, SHEET_NAME);
  XLSX.writeFile(wb, filename);
};

// Baca file .xlsx/.xls yang diupload user, kembalikan array of arrays (baris 0 = header).
// cellDates:true agar kolom tanggal terbaca sebagai objek Date (bukan string berformat locale).
const readExcelFile = (file) =>
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
const cellToIsoDate = (cellValue) => {
  if (cellValue instanceof Date && !Number.isNaN(cellValue.getTime())) {
    const y = cellValue.getFullYear();
    const m = String(cellValue.getMonth() + 1).padStart(2, '0');
    const d = String(cellValue.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(cellValue == null ? '' : cellValue).trim();
};

// Ubah nilai sel apapun jadi string biasa (untuk kolom non-tanggal)
const cellToString = (cellValue) => (cellValue == null ? '' : String(cellValue).trim());

const emptyForm = {
  kelas: KELAS_OPTIONS[0],
  program: PROGRAM_OPTIONS[0],
  jumlahPertemuan: PERTEMUAN_OPTIONS[0],
  durasi: DURASI_OPTIONS[0],
  pengajar: PENGAJAR_OPTIONS[0],
  hargaPrivat: '',
  harga2: '',
  harga3: '',
  harga4: '',
  status: 'Draft',
  tanggalBerlaku: '',
};

const formatRupiah = (value) => {
  const num = Number(value) || 0;
  return 'Rp' + num.toLocaleString('id-ID');
};

const BULAN_SINGKAT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

const formatTanggalDisplay = (isoDate) => {
  if (!isoDate) return '-';
  const [y, m, d] = isoDate.split('-');
  const bulan = BULAN_SINGKAT[parseInt(m, 10) - 1] || m;
  return `${d} ${bulan} ${y}`;
};

const formatTanggalWaktu = (isoTimestamp) => {
  if (!isoTimestamp) return '-';
  const d = new Date(isoTimestamp);
  const tgl = String(d.getDate()).padStart(2, '0');
  const bulan = BULAN_SINGKAT[d.getMonth()];
  const tahun = d.getFullYear();
  return `${tgl} ${bulan} ${tahun}`;
};

const buildDiffText = (oldRow, newRow) => {
  const lines = [];
  Object.keys(FIELD_LABELS).forEach((key) => {
    const oldVal = oldRow ? oldRow[key] : undefined;
    const newVal = newRow[key];
    const oldNorm = oldVal === null || oldVal === undefined ? '' : String(oldVal);
    const newNorm = newVal === null || newVal === undefined ? '' : String(newVal);
    if (oldNorm === newNorm) return;
    const label = FIELD_LABELS[key];
    if (HARGA_FIELDS.has(key)) {
      lines.push(`${label}: ${formatRupiah(oldVal || 0)} \u2192 ${formatRupiah(newVal || 0)}`);
    } else if (key === 'tanggal_berlaku') {
      lines.push(`${label}: ${formatTanggalDisplay(oldVal)} \u2192 ${formatTanggalDisplay(newVal)}`);
    } else {
      lines.push(`${label}: ${oldNorm || '-'} \u2192 ${newNorm || '-'}`);
    }
  });
  return lines;
};

const Pricelist = () => {
  const [adminId, setAdminId] = useState(null);
  const [adminNama, setAdminNama] = useState('Admin');

  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [itemsError, setItemsError] = useState('');

  const [selectedId, setSelectedId] = useState(null);
  const [riwayat, setRiwayat] = useState([]);
  const [loadingRiwayat, setLoadingRiwayat] = useState(false);

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [justSaved, setJustSaved] = useState(false);
  const formRef = useRef(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [search, setSearch] = useState('');
  const [filterKelas, setFilterKelas] = useState('Semua');
  const [filterStatus, setFilterStatus] = useState('Semua');
  const [page, setPage] = useState(1);

  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState(null); // { success, errors: [] }
  const [exporting, setExporting] = useState(false);
  const importInputRef = useRef(null);

  // Ambil admin yang sedang login (untuk created_by/updated_by & label di riwayat perubahan)
  useEffect(() => {
    const loadAdmin = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id || null;
      setAdminId(uid);
      if (uid) {
        const { data } = await supabase.from('profiles').select('full_name').eq('id', uid).maybeSingle();
        setAdminNama(data?.full_name || 'Admin');
      }
    };
    loadAdmin();
  }, []);

  // Ambil seluruh data pricelist -- jumlah data kecil, filter/paginasi dilakukan di client
  const loadItems = useCallback(async () => {
    setLoadingItems(true);
    setItemsError('');
    const { data, error } = await supabase
      .from(PRICELIST_TABLE)
      .select('*')
      .order('kelas', { ascending: true })
      .order('program', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      setItemsError('Gagal memuat pricelist: ' + error.message);
    } else {
      setItems(data || []);
    }
    setLoadingItems(false);
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const loadRiwayat = useCallback(async (pricelistId) => {
    setLoadingRiwayat(true);
    const { data, error } = await supabase
      .from(RIWAYAT_TABLE)
      .select('*')
      .eq('pricelist_id', pricelistId)
      .order('created_at', { ascending: false });
    if (!error) setRiwayat(data || []);
    setLoadingRiwayat(false);
  }, []);

  useEffect(() => {
    if (selectedId) loadRiwayat(selectedId);
    else setRiwayat([]);
  }, [selectedId, loadRiwayat]);

  const selectedItem = items.find((i) => i.id === selectedId) || null;

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setFormErrors({});
    setSaveError('');
  };

  const handleView = (item) => {
    setSelectedId(item.id);
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setForm({
      kelas: item.kelas,
      program: item.program,
      jumlahPertemuan: item.jumlah_pertemuan,
      durasi: item.durasi,
      pengajar: item.pengajar,
      hargaPrivat: item.harga_privat != null ? String(item.harga_privat) : '',
      harga2: item.harga_2siswa != null ? String(item.harga_2siswa) : '',
      harga3: item.harga_3siswa != null ? String(item.harga_3siswa) : '',
      harga4: item.harga_4siswa != null ? String(item.harga_4siswa) : '',
      status: item.status,
      tanggalBerlaku: item.tanggal_berlaku || '',
    });
    setFormErrors({});
    setSaveError('');
    formRef.current && formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleDuplikasi = (item) => {
    setEditingId(null);
    setForm({
      kelas: item.kelas,
      program: item.program,
      jumlahPertemuan: item.jumlah_pertemuan,
      durasi: item.durasi,
      pengajar: item.pengajar,
      hargaPrivat: item.harga_privat != null ? String(item.harga_privat) : '',
      harga2: item.harga_2siswa != null ? String(item.harga_2siswa) : '',
      harga3: item.harga_3siswa != null ? String(item.harga_3siswa) : '',
      harga4: item.harga_4siswa != null ? String(item.harga_4siswa) : '',
      status: 'Draft',
      tanggalBerlaku: '',
    });
    setFormErrors({});
    setSaveError('');
    formRef.current && formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const validate = () => {
    const e = {};
    if (!form.kelas) e.kelas = 'Pilih jenjang';
    if (!form.program) e.program = 'Pilih program';
    if (!form.jumlahPertemuan) e.jumlahPertemuan = 'Pilih jumlah pertemuan';
    if (!form.durasi) e.durasi = 'Pilih durasi';
    if (!form.pengajar) e.pengajar = 'Pilih pengajar';
    if (form.hargaPrivat === '' || Number(form.hargaPrivat) <= 0) e.hargaPrivat = 'Isi harga privat';
    if (!form.tanggalBerlaku) e.tanggalBerlaku = 'Isi tanggal berlaku';
    return e;
  };

  const handleSubmit = async () => {
    const newErrors = validate();
    setFormErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSaving(true);
    setSaveError('');
    const wasEditingId = editingId;
    try {
      const payload = {
        kelas: form.kelas,
        program: form.program,
        jumlah_pertemuan: form.jumlahPertemuan,
        durasi: form.durasi,
        pengajar: form.pengajar,
        harga_privat: Number(form.hargaPrivat) || 0,
        harga_2siswa: form.harga2 === '' ? null : Number(form.harga2),
        harga_3siswa: form.harga3 === '' ? null : Number(form.harga3),
        harga_4siswa: form.harga4 === '' ? null : Number(form.harga4),
        status: form.status,
        tanggal_berlaku: form.tanggalBerlaku,
      };

      if (wasEditingId) {
        const oldRow = items.find((i) => i.id === wasEditingId);
        const { error: updateError } = await supabase
          .from(PRICELIST_TABLE)
          .update({ ...payload, updated_by: adminId })
          .eq('id', wasEditingId);
        if (updateError) throw updateError;

        const diffLines = buildDiffText(oldRow, payload);
        const perubahan = diffLines.length > 0 ? diffLines.join('; ') : 'Data disimpan ulang tanpa perubahan nilai';
        await supabase.from(RIWAYAT_TABLE).insert({
          pricelist_id: wasEditingId,
          admin_id: adminId,
          admin_nama: adminNama,
          perubahan,
        });
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from(PRICELIST_TABLE)
          .insert({ ...payload, created_by: adminId, updated_by: adminId })
          .select('id')
          .single();
        if (insertError) throw insertError;

        await supabase.from(RIWAYAT_TABLE).insert({
          pricelist_id: inserted.id,
          admin_id: adminId,
          admin_nama: adminNama,
          perubahan: 'Pricelist dibuat',
        });
      }

      resetForm();
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2200);
      await loadItems();
      if (wasEditingId && selectedId === wasEditingId) await loadRiwayat(wasEditingId);
    } catch (err) {
      setSaveError('Gagal menyimpan: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const id = deleteTarget.id;
    const { error } = await supabase.from(PRICELIST_TABLE).delete().eq('id', id);
    setDeleting(false);
    if (error) {
      window.alert('Gagal menghapus: ' + error.message);
      return;
    }
    setDeleteTarget(null);
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (selectedId === id) setSelectedId(null);
    if (editingId === id) resetForm();
  };

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

  const validateImportRow = (rowObj, rowNumber) => {
    const errs = [];
    if (!KELAS_OPTIONS.includes(rowObj.kelas)) errs.push(`Kelas tidak valid (harus salah satu dari: ${KELAS_OPTIONS.join(', ')})`);
    if (!rowObj.program) errs.push('Program kosong');
    if (!rowObj.jumlah_pertemuan) errs.push('Jumlah Pertemuan kosong');
    if (!DURASI_OPTIONS.includes(rowObj.durasi)) errs.push(`Durasi tidak valid (harus salah satu dari: ${DURASI_OPTIONS.join(', ')})`);
    if (!PENGAJAR_OPTIONS.includes(rowObj.pengajar)) errs.push(`Pengajar tidak valid (harus salah satu dari: ${PENGAJAR_OPTIONS.join(', ')})`);
    if (rowObj.harga_privat === '' || Number.isNaN(Number(rowObj.harga_privat)) || Number(rowObj.harga_privat) <= 0) errs.push('Harga Privat harus angka > 0');
    if (!rowObj.status) rowObj.status = 'Draft';
    else if (!STATUS_OPTIONS.includes(rowObj.status)) errs.push(`Status tidak valid (harus salah satu dari: ${STATUS_OPTIONS.join(', ')})`);
    if (!rowObj.tanggal_berlaku || !/^\d{4}-\d{2}-\d{2}$/.test(rowObj.tanggal_berlaku)) errs.push('Tanggal Berlaku harus format YYYY-MM-DD');
    return errs.length > 0 ? `Baris ${rowNumber}: ${errs.join('; ')}` : null;
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

  const filteredItems = items.filter((it) => {
    if (filterKelas !== 'Semua' && it.kelas !== filterKelas) return false;
    if (filterStatus !== 'Semua' && it.status !== filterStatus) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      if (!it.program.toLowerCase().includes(q) && !it.kelas.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filteredItems.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const rangeStart = filteredItems.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(safePage * PAGE_SIZE, filteredItems.length);

  useEffect(() => {
    setPage(1);
  }, [search, filterKelas, filterStatus]);

  const inputStyle = (hasError) => ({
    width: '100%',
    padding: '9px 12px',
    borderRadius: '10px',
    border: `1.5px solid ${hasError ? C.red : C.border}`,
    fontSize: '0.85rem',
    color: C.dark,
    fontFamily: 'inherit',
    background: C.white,
    outline: 'none',
    boxSizing: 'border-box',
  });

  const labelStyle = {
    display: 'block',
    fontSize: '0.78rem',
    fontWeight: 600,
    color: C.gray,
    marginBottom: '6px',
  };

  const darkInputStyle = (hasError) => ({
    width: '100%',
    padding: '10px 12px',
    borderRadius: '9px',
    border: `1.5px solid ${hasError ? D.danger : D.fieldBorder}`,
    fontSize: '0.88rem',
    color: D.text,
    fontFamily: 'inherit',
    background: D.field,
    outline: 'none',
    boxSizing: 'border-box',
  });

  const darkLabelStyle = {
    display: 'block',
    fontSize: '0.76rem',
    fontWeight: 600,
    color: D.textMuted,
    marginBottom: '6px',
  };

  const iconBtnStyle = (bg, fg) => ({
    width: '26px',
    height: '26px',
    borderRadius: '50%',
    border: 'none',
    background: bg,
    color: fg,
    fontSize: '0.75rem',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  });

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', fontFamily: 'inherit' }}>
      {/* Kartu Tabel */}
      <div style={{ background: C.white, borderRadius: '16px', border: `1.5px solid ${C.border}`, padding: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Toolbar import / export */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: C.dark, margin: 0 }}>Daftar Pricelist</h2>
            <p style={{ fontSize: '0.8rem', color: C.gray, margin: '2px 0 0' }}>Kelola paket &amp; harga bimbingan belajar</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={handleDownloadTemplate}
              style={{ background: C.white, border: `1.5px solid ${C.border}`, color: C.dark, padding: '8px 14px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
            >
              &#8681; Unduh Template
            </button>
            <button
              onClick={() => importInputRef.current && importInputRef.current.click()}
              disabled={importing}
              style={{ background: C.white, border: `1.5px solid ${C.gold}`, color: C.goldDark, padding: '8px 14px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 700, cursor: importing ? 'default' : 'pointer', opacity: importing ? 0.6 : 1 }}
            >
              {importing ? 'Mengimpor...' : '\u2191 Import Excel'}
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              onChange={handleImportFile}
              style={{ display: 'none' }}
            />
            <button
              onClick={handleExport}
              disabled={exporting || filteredItems.length === 0}
              style={{ background: C.gold, border: 'none', color: C.white, padding: '8px 14px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 700, cursor: (exporting || filteredItems.length === 0) ? 'default' : 'pointer', opacity: (exporting || filteredItems.length === 0) ? 0.6 : 1 }}
            >
              &#8595; Export Excel
            </button>
          </div>
        </div>

        {importSummary && (
          <div style={{
            marginBottom: '1.1rem', padding: '0.85rem 1rem', borderRadius: '10px',
            background: importSummary.errors.length > 0 ? C.amberBg : C.greenBg,
            border: `1px solid ${importSummary.errors.length > 0 ? C.amber : C.green}`,
          }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: importSummary.errors.length > 0 ? C.amber : C.green }}>
              {importSummary.success} data berhasil diimpor{importSummary.errors.length > 0 ? `, ${importSummary.errors.length} baris gagal` : ''}.
            </div>
            {importSummary.errors.length > 0 && (
              <ul style={{ margin: '6px 0 0', paddingLeft: '1.1rem', fontSize: '0.76rem', color: C.dark }}>
                {importSummary.errors.slice(0, 10).map((msg, i) => (
                  <li key={i}>{msg}</li>
                ))}
                {importSummary.errors.length > 10 && <li>...dan {importSummary.errors.length - 10} error lainnya.</li>}
              </ul>
            )}
          </div>
        )}

        {/* Filter & search */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div>
            <label style={{ ...labelStyle, fontSize: '0.72rem' }}>Cari</label>
            <input
              type="text"
              placeholder="Cari kelas atau program..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ ...inputStyle(false), fontSize: '0.85rem' }}
            />
          </div>
          <div>
            <label style={{ ...labelStyle, fontSize: '0.72rem' }}>Kelas</label>
            <select value={filterKelas} onChange={(e) => setFilterKelas(e.target.value)} style={{ ...inputStyle(false), cursor: 'pointer', fontSize: '0.85rem' }}>
              <option>Semua</option>
              {KELAS_OPTIONS.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ ...labelStyle, fontSize: '0.72rem' }}>Status</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ ...inputStyle(false), cursor: 'pointer', fontSize: '0.85rem' }}>
              <option>Semua</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {itemsError && <div style={{ color: C.red, fontSize: '0.85rem', marginBottom: '1rem' }}>{itemsError}</div>}

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: C.cream }}>
                <th rowSpan={2} style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}`, borderRadius: '8px 0 0 0' }}>No.</th>
                <th rowSpan={2} style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Kelas</th>
                <th rowSpan={2} style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Program</th>
                <th rowSpan={2} style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}`, minWidth: '150px' }}>Pertemuan</th>
                <th rowSpan={2} style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Durasi</th>
                <th rowSpan={2} style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Pengajar</th>
                <th colSpan={4} style={{ padding: '8px 10px', textAlign: 'center', borderBottom: `1px solid ${C.border}` }}>Harga (Rupiah)</th>
                <th rowSpan={2} style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Status</th>
                <th rowSpan={2} style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Tgl Berlaku</th>
                <th rowSpan={2} style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}`, borderRadius: '0 8px 0 0' }}>Aksi</th>
              </tr>
              <tr style={{ background: C.cream }}>
                <th style={{ padding: '6px 10px', textAlign: 'right', borderBottom: `1px solid ${C.border}`, fontWeight: 600, color: C.gray }}>Privat</th>
                <th style={{ padding: '6px 10px', textAlign: 'right', borderBottom: `1px solid ${C.border}`, fontWeight: 600, color: C.gray }}>2 Siswa</th>
                <th style={{ padding: '6px 10px', textAlign: 'right', borderBottom: `1px solid ${C.border}`, fontWeight: 600, color: C.gray }}>3 Siswa</th>
                <th style={{ padding: '6px 10px', textAlign: 'right', borderBottom: `1px solid ${C.border}`, fontWeight: 600, color: C.gray }}>4 Siswa</th>
              </tr>
            </thead>
            <tbody>
              {loadingItems && (
                <tr>
                  <td colSpan={12} style={{ padding: '2rem', textAlign: 'center', color: C.grayLight }}>Memuat pricelist...</td>
                </tr>
              )}
              {!loadingItems && pageItems.map((item, idx) => {
                const st = STATUS_META[item.status] || STATUS_META.Nonaktif;
                return (
                  <tr key={item.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: '10px', color: C.gray }}>{rangeStart + idx}</td>
                    <td style={{ padding: '10px', fontWeight: 500 }}>{item.kelas}</td>
                    <td style={{ padding: '10px', fontWeight: 600 }}>{item.program}</td>
                    <td style={{ padding: '10px', color: C.gray }}>{item.jumlah_pertemuan}</td>
                    <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>{item.durasi}</td>
                    <td style={{ padding: '10px' }}>{item.pengajar}</td>
                    <td style={{ padding: '10px', textAlign: 'right', whiteSpace: 'nowrap' }}>{formatRupiah(item.harga_privat)}</td>
                    <td style={{ padding: '10px', textAlign: 'right', whiteSpace: 'nowrap' }}>{item.harga_2siswa != null ? formatRupiah(item.harga_2siswa) : '-'}</td>
                    <td style={{ padding: '10px', textAlign: 'right', whiteSpace: 'nowrap' }}>{item.harga_3siswa != null ? formatRupiah(item.harga_3siswa) : '-'}</td>
                    <td style={{ padding: '10px', textAlign: 'right', whiteSpace: 'nowrap' }}>{item.harga_4siswa != null ? formatRupiah(item.harga_4siswa) : '-'}</td>
                    <td style={{ padding: '10px' }}>
                      <span style={{ background: st.bg, color: st.fg, padding: '4px 12px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {item.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>{formatTanggalDisplay(item.tanggal_berlaku)}</td>
                    <td style={{ padding: '10px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button title="Lihat detail" onClick={() => handleView(item)} style={iconBtnStyle(C.blueBg, C.blue)}>&#128065;</button>
                        <button title="Edit" onClick={() => handleEdit(item)} style={iconBtnStyle(C.amberBg, C.amber)}>&#9998;</button>
                        <button title="Hapus" onClick={() => setDeleteTarget(item)} style={iconBtnStyle(C.redBg, C.red)}>&#128465;</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loadingItems && pageItems.length === 0 && (
                <tr>
                  <td colSpan={12} style={{ padding: '2rem', textAlign: 'center', color: C.grayLight }}>
                    Belum ada pricelist yang cocok. Tambahkan lewat form di bawah.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1.1rem' }}>
          <span style={{ fontSize: '0.8rem', color: C.gray }}>
            Menampilkan {rangeStart}-{rangeEnd} dari {filteredItems.length} data
          </span>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              style={{ ...iconBtnStyle(C.cream, C.dark), width: '28px', height: '28px', borderRadius: '8px', cursor: safePage === 1 ? 'default' : 'pointer', opacity: safePage === 1 ? 0.5 : 1 }}
            >
              &#8249;
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  background: p === safePage ? C.gold : C.cream,
                  color: p === safePage ? C.white : C.dark,
                }}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              style={{ ...iconBtnStyle(C.cream, C.dark), width: '28px', height: '28px', borderRadius: '8px', cursor: safePage === totalPages ? 'default' : 'pointer', opacity: safePage === totalPages ? 0.5 : 1 }}
            >
              &#8250;
            </button>
          </div>
        </div>
      </div>

      {/* Form Tambah/Edit + Detail, berdampingan */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
        {/* Form Tambah / Edit Pricelist */}
        <div ref={formRef} style={{ background: D.bg, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 12px 32px rgba(0,0,0,0.28)' }}>
          <div style={{ padding: '1.1rem 1.5rem', background: D.bgSoft, borderBottom: `1px solid ${D.gold}` }}>
            <span style={{ color: D.gold, fontWeight: 800, fontSize: '0.98rem', letterSpacing: '0.02em' }}>
              {editingId ? 'EDIT PRICELIST' : 'TAMBAH PRICELIST'}
            </span>
          </div>

          <div style={{ padding: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={darkLabelStyle}>Jenjang</label>
                <select value={form.kelas} onChange={(e) => setField('kelas', e.target.value)} style={{ ...darkInputStyle(formErrors.kelas), cursor: 'pointer' }}>
                  {KELAS_OPTIONS.map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
              <div>
                <label style={darkLabelStyle}>Program</label>
                <select value={form.program} onChange={(e) => setField('program', e.target.value)} style={{ ...darkInputStyle(formErrors.program), cursor: 'pointer' }}>
                  {PROGRAM_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginTop: '1rem' }}>
              <label style={darkLabelStyle}>Jumlah Pertemuan</label>
              <select value={form.jumlahPertemuan} onChange={(e) => setField('jumlahPertemuan', e.target.value)} style={{ ...darkInputStyle(formErrors.jumlahPertemuan), cursor: 'pointer' }}>
                {PERTEMUAN_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
              <div>
                <label style={darkLabelStyle}>Durasi</label>
                <select value={form.durasi} onChange={(e) => setField('durasi', e.target.value)} style={{ ...darkInputStyle(formErrors.durasi), cursor: 'pointer' }}>
                  {DURASI_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label style={darkLabelStyle}>Pengajar</label>
                <select value={form.pengajar} onChange={(e) => setField('pengajar', e.target.value)} style={{ ...darkInputStyle(formErrors.pengajar), cursor: 'pointer' }}>
                  {PENGAJAR_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginTop: '1.1rem' }}>
              <label style={darkLabelStyle}>Harga (Rupiah)</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: D.textFaint, marginBottom: '4px' }}>Privat</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: D.textMuted, fontSize: '0.85rem' }}>Rp</span>
                    <input type="number" min="0" step="1000" value={form.hargaPrivat} onChange={(e) => setField('hargaPrivat', e.target.value)} style={darkInputStyle(formErrors.hargaPrivat)} />
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: D.textFaint, marginBottom: '4px' }}>2 Siswa</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: D.textMuted, fontSize: '0.85rem' }}>Rp</span>
                    <input type="number" min="0" step="1000" value={form.harga2} onChange={(e) => setField('harga2', e.target.value)} style={darkInputStyle(false)} />
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: D.textFaint, marginBottom: '4px' }}>3 Siswa</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: D.textMuted, fontSize: '0.85rem' }}>Rp</span>
                    <input type="number" min="0" step="1000" value={form.harga3} onChange={(e) => setField('harga3', e.target.value)} style={darkInputStyle(false)} />
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: D.textFaint, marginBottom: '4px' }}>4 Siswa</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: D.textMuted, fontSize: '0.85rem' }}>Rp</span>
                    <input type="number" min="0" step="1000" value={form.harga4} onChange={(e) => setField('harga4', e.target.value)} style={darkInputStyle(false)} />
                  </div>
                </div>
              </div>
              {formErrors.hargaPrivat && <div style={{ color: D.danger, fontSize: '0.75rem', marginTop: '4px' }}>{formErrors.hargaPrivat}</div>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginTop: '1.1rem' }}>
              <div>
                <label style={darkLabelStyle}>Status</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '2px' }}>
                  {STATUS_OPTIONS.map((s) => (
                    <label key={s} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: D.text, fontSize: '0.85rem', cursor: 'pointer' }}>
                      <input type="radio" name="status" checked={form.status === s} onChange={() => setField('status', s)} style={{ accentColor: STATUS_META[s].dot }} />
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: STATUS_META[s].dot, display: 'inline-block' }} />
                      {s}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label style={darkLabelStyle}>Tanggal Berlaku</label>
                <input type="date" value={form.tanggalBerlaku} onChange={(e) => setField('tanggalBerlaku', e.target.value)} style={darkInputStyle(formErrors.tanggalBerlaku)} />
                {formErrors.tanggalBerlaku && <div style={{ color: D.danger, fontSize: '0.75rem', marginTop: '4px' }}>{formErrors.tanggalBerlaku}</div>}
                <div style={{ fontSize: '0.7rem', color: D.textFaint, marginTop: '6px' }}>
                  Harga akan berlaku mulai tanggal ini untuk pemesanan baru.
                </div>
              </div>
            </div>

            {saveError && <div style={{ color: D.danger, fontSize: '0.82rem', marginTop: '1rem' }}>{saveError}</div>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem', marginTop: '1.5rem' }}>
              {justSaved && <span style={{ color: D.green, fontSize: '0.85rem', fontWeight: 600 }}>&#10003; Pricelist tersimpan</span>}
              <button
                onClick={resetForm}
                disabled={saving}
                style={{ background: 'none', border: `1.5px solid ${D.fieldBorder}`, padding: '10px 20px', borderRadius: '10px', cursor: 'pointer', color: D.textMuted, fontWeight: 500 }}
              >
                Batal
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                style={{ background: D.gold, border: 'none', padding: '10px 26px', borderRadius: '10px', cursor: saving ? 'default' : 'pointer', color: '#241d0d', fontWeight: 700, opacity: saving ? 0.7 : 1 }}
              >
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>

        {/* Detail Pricelist */}
        <div style={{ background: D.bg, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 12px 32px rgba(0,0,0,0.28)' }}>
          <div style={{ padding: '1.1rem 1.5rem', background: D.bgSoft, borderBottom: `1px solid ${D.gold}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: D.gold, fontWeight: 800, fontSize: '0.98rem', letterSpacing: '0.02em' }}>DETAIL PRICELIST</span>
            {selectedItem && (
              <button
                onClick={() => handleDuplikasi(selectedItem)}
                style={{ background: D.goldSoft, border: `1px solid ${D.gold}`, color: D.gold, padding: '6px 14px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
              >
                &#10697; Duplikasi
              </button>
            )}
          </div>

          <div style={{ padding: '1.5rem' }}>
            {!selectedItem ? (
              <div style={{ color: D.textFaint, fontSize: '0.85rem', textAlign: 'center', padding: '2rem 0' }}>
                Klik ikon &#128065; pada salah satu baris tabel untuk melihat detail pricelist di sini.
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <span style={{ color: D.text, fontSize: '1.1rem', fontWeight: 800 }}>{selectedItem.program}</span>
                  <span style={{
                    background: STATUS_META[selectedItem.status]?.bg, color: STATUS_META[selectedItem.status]?.fg,
                    padding: '3px 12px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700,
                  }}>
                    {selectedItem.status}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginTop: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                    <div style={{ color: D.textMuted }}>&#127979; Jenjang <span style={{ float: 'right', color: D.text }}>{selectedItem.kelas}</span></div>
                    <div style={{ color: D.textMuted }}>&#128218; Program <span style={{ float: 'right', color: D.text }}>{selectedItem.program}</span></div>
                    <div style={{ color: D.textMuted }}>&#128197; Pertemuan <span style={{ float: 'right', color: D.text, textAlign: 'right' }}>{selectedItem.jumlah_pertemuan}</span></div>
                    <div style={{ color: D.textMuted }}>&#9201; Durasi <span style={{ float: 'right', color: D.text }}>{selectedItem.durasi}</span></div>
                    <div style={{ color: D.textMuted }}>&#128100; Pengajar <span style={{ float: 'right', color: D.text }}>{selectedItem.pengajar}</span></div>
                    <div style={{ color: D.textMuted }}>&#128198; Tgl Berlaku <span style={{ float: 'right', color: D.text }}>{formatTanggalDisplay(selectedItem.tanggal_berlaku)}</span></div>
                  </div>

                  <div>
                    <div style={{ color: D.gold, fontSize: '0.8rem', fontWeight: 700, marginBottom: '8px' }}>Harga (Rupiah)</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: D.textMuted }}>Privat</span><span style={{ color: D.gold, fontWeight: 700 }}>{formatRupiah(selectedItem.harga_privat)}</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: D.textMuted }}>2 Siswa</span><span style={{ color: D.gold, fontWeight: 700 }}>{selectedItem.harga_2siswa != null ? formatRupiah(selectedItem.harga_2siswa) : '-'}</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: D.textMuted }}>3 Siswa</span><span style={{ color: D.gold, fontWeight: 700 }}>{selectedItem.harga_3siswa != null ? formatRupiah(selectedItem.harga_3siswa) : '-'}</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: D.textMuted }}>4 Siswa</span><span style={{ color: D.gold, fontWeight: 700 }}>{selectedItem.harga_4siswa != null ? formatRupiah(selectedItem.harga_4siswa) : '-'}</span></div>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '1.5rem' }}>
                  <div style={{ color: D.gold, fontSize: '0.8rem', fontWeight: 700, marginBottom: '8px' }}>Riwayat Perubahan</div>
                  {loadingRiwayat ? (
                    <div style={{ color: D.textFaint, fontSize: '0.8rem' }}>Memuat riwayat...</div>
                  ) : riwayat.length === 0 ? (
                    <div style={{ color: D.textFaint, fontSize: '0.8rem' }}>Belum ada riwayat perubahan.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '220px', overflowY: 'auto' }}>
                      {riwayat.map((r) => (
                        <div key={r.id} style={{ borderLeft: `2px solid ${D.gold}`, paddingLeft: '10px' }}>
                          <div style={{ fontSize: '0.75rem', color: D.textMuted }}>
                            {formatTanggalWaktu(r.created_at)} &middot; <span style={{ color: D.text }}>{r.admin_nama || 'Admin'}</span>
                          </div>
                          <div style={{ fontSize: '0.8rem', color: D.text, marginTop: '2px' }}>{r.perubahan}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: `1px solid ${D.fieldBorder}`, display: 'flex', gap: '14px', flexWrap: 'wrap', fontSize: '0.72rem', color: D.textFaint }}>
                  <span>Keterangan Status:</span>
                  {STATUS_OPTIONS.map((s) => (
                    <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: STATUS_META[s].dot, display: 'inline-block' }} />
                      {s}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal konfirmasi hapus */}
      {deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,12,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
          <div style={{ background: D.bg, borderRadius: '14px', padding: '1.5rem', maxWidth: '380px', width: '100%', boxShadow: '0 20px 50px rgba(0,0,0,0.4)' }}>
            <div style={{ color: D.text, fontSize: '1rem', fontWeight: 700, marginBottom: '8px' }}>Hapus pricelist ini?</div>
            <div style={{ color: D.textMuted, fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              <strong style={{ color: D.text }}>{deleteTarget.program}</strong> ({deleteTarget.kelas}) akan dihapus permanen beserta riwayat perubahannya. Tindakan ini tidak bisa dibatalkan.
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                style={{ background: 'none', border: `1.5px solid ${D.fieldBorder}`, padding: '9px 18px', borderRadius: '10px', cursor: 'pointer', color: D.textMuted, fontWeight: 500 }}
              >
                Batal
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                style={{ background: D.danger, border: 'none', padding: '9px 18px', borderRadius: '10px', cursor: deleting ? 'default' : 'pointer', color: '#fff', fontWeight: 700, opacity: deleting ? 0.7 : 1 }}
              >
                {deleting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pricelist;