import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import * as XLSX from 'xlsx';

const C = {
  gold: '#b4964b',
  dark: '#171411',
  gray: '#444242',
  cream: '#f7f6f0',
  white: '#ffffff',
  border: '#e0ddd6',
  goldBg: 'rgba(180,150,75,0.10)',
  danger: '#e74c3c',
  dangerBg: '#fff0f0',
  success: '#2e9e5b',
  successBg: '#eefaf2',
  warn: '#b7791f',
  warnBg: '#fdf6ec',
  blue: '#2f6fed',
  blueBg: 'rgba(47,111,237,0.10)',
};

// Status di database materi_file tetap 'Dipublish' | 'Draft' | 'Diarsipkan'.
// Di tampilan admin, 'Dipublish' ditampilkan dengan label 'Aktif'.
const STATUS_DB_TO_LABEL = {
  Dipublish: 'Aktif',
  Draft: 'Draft',
  Diarsipkan: 'Diarsipkan',
};
const STATUS_COLOR = {
  Dipublish: { color: C.success, bg: C.successBg },
  Draft: { color: C.warn, bg: C.warnBg },
  Diarsipkan: { color: C.gold, bg: C.goldBg },
};
const MATERI_TABS = [
  { key: '', label: 'Semua' },
  { key: 'Dipublish', label: 'Aktif' },
  { key: 'Diarsipkan', label: 'Diarsipkan' },
];

const SESI_STATUS_COLOR = {
  Menunggu: { color: C.warn, bg: C.warnBg },
  Disetujui: { color: C.success, bg: C.successBg },
  Ditolak: { color: C.danger, bg: C.dangerBg },
};
const SESI_TABS = [
  { key: '', label: 'Semua' },
  { key: 'Menunggu', label: 'Menunggu' },
  { key: 'Disetujui', label: 'Disetujui' },
  { key: 'Ditolak', label: 'Ditolak' },
];

const JENIS_COLOR = {
  Ulangan: { color: C.blue, bg: C.blueBg },
  Penugasan: { color: C.warn, bg: C.warnBg },
};
const BANK_TABS = [
  { key: '', label: 'Semua' },
  { key: 'Ulangan', label: 'Ulangan (PH)' },
  { key: 'Penugasan', label: 'Tugas' },
];

const SOURCE_TABS = [
  { key: 'materi', label: '📘 Materi Guru' },
  { key: 'sesi', label: '📝 Sesi Pembelajaran' },
  { key: 'bank', label: '🗂️ Bank Soal Siswa' },
];

const PAGE_SIZE = 20;

const formatTanggal = (iso) => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  const bulan = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${String(d.getDate()).padStart(2, '0')} ${bulan[d.getMonth()]} ${d.getFullYear()} ${hh}:${mm}`;
};

const formatTanggalSingkat = (iso) => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  const bulan = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${String(d.getDate()).padStart(2, '0')} ${bulan[d.getMonth()]} ${d.getFullYear()}`;
};

const IconBtn = ({ title, color, bg, onClick, children, disabled }) => (
  <button
    title={title}
    onClick={onClick}
    disabled={disabled}
    style={{
      width: '30px', height: '30px', borderRadius: '8px', border: 'none',
      background: bg, color, display: 'flex', alignItems: 'center',
      justifyContent: 'center', cursor: disabled ? 'not-allowed' : 'pointer',
      fontSize: '0.9rem', flexShrink: 0, opacity: disabled ? 0.6 : 1,
    }}
  >
    {children}
  </button>
);

const selectStyle = {
  padding: '9px 12px', borderRadius: '10px', border: `1.5px solid ${C.border}`,
  fontSize: '0.85rem', color: C.dark, background: C.white, fontFamily: 'inherit', cursor: 'pointer',
};

const pagerBtnStyle = (disabled) => ({
  padding: '7px 14px', borderRadius: '8px', border: `1.5px solid ${C.border}`,
  background: C.white, color: C.gray, cursor: disabled ? 'not-allowed' : 'pointer',
  fontFamily: 'inherit', opacity: disabled ? 0.5 : 1,
});

const Pagination = ({ page, totalPages, total, onPrev, onNext, itemLabel }) => {
  if (total === 0) return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', fontSize: '0.85rem', color: C.gray }}>
      <span>Menampilkan {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} dari {total} {itemLabel}</span>
      <div style={{ display: 'flex', gap: '6px' }}>
        <button onClick={onPrev} disabled={page === 1} style={pagerBtnStyle(page === 1)}>‹ Sebelumnya</button>
        <span style={{ padding: '7px 10px' }}>Hal {page} / {totalPages}</span>
        <button onClick={onNext} disabled={page === totalPages} style={pagerBtnStyle(page === totalPages)}>Selanjutnya ›</button>
      </div>
    </div>
  );
};

const SourceTabBar = ({ active, onChange }) => (
  <div style={{ display: 'flex', gap: '6px', marginBottom: '1.3rem', flexWrap: 'wrap' }}>
    {SOURCE_TABS.map(t => (
      <button
        key={t.key}
        onClick={() => onChange(t.key)}
        style={{
          padding: '9px 16px', borderRadius: '10px', border: `1.5px solid ${active === t.key ? C.gold : C.border}`,
          background: active === t.key ? C.goldBg : C.white, color: active === t.key ? C.gold : C.gray,
          fontWeight: active === t.key ? 'bold' : 'normal', fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        {t.label}
      </button>
    ))}
  </div>
);

const StatusTabBar = ({ tabs, active, counts, onChange }) => (
  <div style={{ display: 'flex', gap: '4px', marginBottom: '1.1rem', borderBottom: `1.5px solid ${C.border}` }}>
    {tabs.map(tab => (
      <button
        key={tab.key}
        onClick={() => onChange(tab.key)}
        style={{
          padding: '10px 6px', border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit',
          fontSize: '0.9rem', fontWeight: active === tab.key ? 'bold' : 'normal',
          color: active === tab.key ? C.gold : C.gray,
          borderBottom: active === tab.key ? `2.5px solid ${C.gold}` : '2.5px solid transparent',
          marginRight: '18px', marginBottom: '-1.5px',
        }}
      >
        {tab.label} ({counts[tab.key] ?? 0})
      </button>
    ))}
  </div>
);

const AdminPengaturanMateri = () => {
  const [activeSource, setActiveSource] = useState('materi'); // 'materi' | 'sesi' | 'bank'
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [profilesMap, setProfilesMap] = useState({}); // id (profiles) -> full_name
  const [deleteItem, setDeleteItem] = useState(null); // { source, item }

  // ── Materi Guru (materi_file) ───────────────────────────────────────────
  const [rows, setRows] = useState([]);
  const [materiError, setMateriError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [mapelFilter, setMapelFilter] = useState('');
  const [guruFilter, setGuruFilter] = useState('');
  const [kelasFilter, setKelasFilter] = useState('');
  const [page, setPage] = useState(1);
  const [editItem, setEditItem] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [babList, setBabList] = useState([]); // materi_bab: { id, nama, mapel_id, materi_mapel: { nama } }

  // ── Sesi Pembelajaran (sesi_pembelajaran) ───────────────────────────────
  const [sesiRows, setSesiRows] = useState([]);
  const [sesiError, setSesiError] = useState('');
  const [sesiBusyId, setSesiBusyId] = useState(null);
  const [sesiSearch, setSesiSearch] = useState('');
  const [sesiStatusFilter, setSesiStatusFilter] = useState('');
  const [sesiSiswaFilter, setSesiSiswaFilter] = useState('');
  const [sesiPage, setSesiPage] = useState(1);

  // ── Bank Soal Siswa (bank_soal_siswa) ───────────────────────────────────
  const [bankRows, setBankRows] = useState([]);
  const [bankError, setBankError] = useState('');
  const [bankBusyId, setBankBusyId] = useState(null);
  const [bankSearch, setBankSearch] = useState('');
  const [bankJenisFilter, setBankJenisFilter] = useState('');
  const [bankSiswaFilter, setBankSiswaFilter] = useState('');
  const [bankPage, setBankPage] = useState(1);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const fetchAllSources = useCallback(async () => {
    setLoading(true);
    const [materiRes, babRes, sesiRes, bankRes, profilesRes] = await Promise.allSettled([
      // Catatan perbaikan (Temuan Kritis #2): tabel 'bab_ajar' tidak pernah ada
      // di database (nama sebenarnya 'materi_bab'), dan 'sub_bab_ajar' juga tidak
      // ada tabelnya sama sekali. Setelah dicek skema aslinya, 'materi_file' sudah
      // punya kolom teks langsung (denormalized) mapel/bab/sub_bab, jadi tidak
      // perlu join ke 'materi_bab' untuk keperluan tampilan — cukup select kolom
      // flat-nya. Kolom FK yang benar untuk relasi bab adalah 'bab_id' (integer),
      // bukan 'bab_id_new', dan tidak ada kolom 'sub_bab_id' di skema.
      supabase
        .from('materi_file')
        .select('id, nama, tipe, tanggal, url, kelas, status, deskripsi, diupload_oleh, user_id, bab_id, mapel, bab, sub_bab')
        .order('tanggal', { ascending: false }),
      // 'materi_bab' dipakai khusus untuk dropdown pilih bab di modal Edit
      // (butuh id untuk disimpan sebagai materi_file.bab_id). Nama mapel didapat
      // lewat join ke materi_mapel karena materi_bab hanya punya mapel_id (FK),
      // bukan kolom teks 'mapel'.
      supabase.from('materi_bab').select('id, nama, mapel_id, materi_mapel ( nama )').order('nama'),
      supabase
        .from('sesi_pembelajaran')
        .select('id, tanggal, judul_materi, catatan, bukti_urls, status, siswa_id, guru_id')
        .order('tanggal', { ascending: false }),
      supabase
        .from('bank_soal_siswa')
        .select('id, jenis, bab, sub_bab, judul, deskripsi, file_name, file_url, created_at, siswa_id')
        .order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, full_name'),
    ]);

    if (materiRes.status === 'fulfilled' && !materiRes.value.error) {
      setRows(materiRes.value.data || []);
      setMateriError('');
    } else {
      console.error(materiRes.status === 'fulfilled' ? materiRes.value.error : materiRes.reason);
      setMateriError('Gagal memuat data materi guru. Coba muat ulang halaman.');
    }

    if (babRes.status === 'fulfilled' && !babRes.value.error) {
      setBabList(babRes.value.data || []);
    } else {
      console.error(babRes.status === 'fulfilled' ? babRes.value.error : babRes.reason);
    }

    if (sesiRes.status === 'fulfilled' && !sesiRes.value.error) {
      setSesiRows(sesiRes.value.data || []);
      setSesiError('');
    } else {
      console.error(sesiRes.status === 'fulfilled' ? sesiRes.value.error : sesiRes.reason);
      setSesiError('Gagal memuat data sesi pembelajaran. Coba muat ulang halaman.');
    }

    if (bankRes.status === 'fulfilled' && !bankRes.value.error) {
      setBankRows(bankRes.value.data || []);
      setBankError('');
    } else {
      console.error(bankRes.status === 'fulfilled' ? bankRes.value.error : bankRes.reason);
      setBankError('Gagal memuat data bank soal siswa. Coba muat ulang halaman.');
    }

    if (profilesRes.status === 'fulfilled' && !profilesRes.value.error) {
      const map = {};
      (profilesRes.value.data || []).forEach(p => { map[p.id] = p.full_name; });
      setProfilesMap(map);
    } else {
      console.error(profilesRes.status === 'fulfilled' ? profilesRes.value.error : profilesRes.reason);
    }

    setLoading(false);
  }, []);

  useEffect(() => { fetchAllSources(); }, [fetchAllSources]);

  // ════════════════════════════════════════════════════════════════════════
  // MATERI GURU — derived data & handlers
  // ════════════════════════════════════════════════════════════════════════
  const guruOptions = useMemo(() => {
    const map = new Map();
    rows.forEach(r => {
      if (r.user_id && !map.has(r.user_id)) map.set(r.user_id, r.diupload_oleh || '(Tanpa nama)');
    });
    return Array.from(map, ([user_id, nama]) => ({ user_id, nama })).sort((a, b) => a.nama.localeCompare(b.nama));
  }, [rows]);

  const kelasOptions = useMemo(() => {
    const set = new Set();
    rows.forEach(r => { if (r.kelas) set.add(r.kelas); });
    return Array.from(set).sort();
  }, [rows]);

  const mapelOptions = useMemo(() => {
    const set = new Set();
    // materi_file sudah punya kolom 'mapel' langsung, jadi ambil dari data
    // materi itu sendiri (bukan dari babList) — konsisten dengan kelasOptions.
    rows.forEach(r => { if (r.mapel) set.add(r.mapel); });
    return Array.from(set).sort();
  }, [rows]);

  const materiCounts = useMemo(() => ({
    '': rows.length,
    Dipublish: rows.filter(r => r.status === 'Dipublish').length,
    Diarsipkan: rows.filter(r => r.status === 'Diarsipkan').length,
  }), [rows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(r => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (mapelFilter && r.mapel !== mapelFilter) return false;
      if (guruFilter && r.user_id !== guruFilter) return false;
      if (kelasFilter && r.kelas !== kelasFilter) return false;
      if (q) {
        const hay = [
          r.nama, r.diupload_oleh, r.bab, r.mapel, r.sub_bab,
        ].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, statusFilter, mapelFilter, guruFilter, kelasFilter]);

  const materiTotalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const materiPageRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search, statusFilter, mapelFilter, guruFilter, kelasFilter]);

  const handleArchiveToggle = async (item) => {
    const nextStatus = item.status === 'Diarsipkan' ? 'Dipublish' : 'Diarsipkan';
    setBusyId(item.id);
    const { error } = await supabase.from('materi_file').update({ status: nextStatus }).eq('id', item.id);
    setBusyId(null);
    if (error) { setToast({ type: 'error', message: 'Gagal mengubah status: ' + error.message }); return; }
    setRows(prev => prev.map(r => r.id === item.id ? { ...r, status: nextStatus } : r));
    setToast({ type: 'success', message: `"${item.nama}" ${nextStatus === 'Diarsipkan' ? 'diarsipkan' : 'diaktifkan kembali'}.` });
  };

  const handleSaveEdit = async () => {
    if (!editItem) return;
    setSavingEdit(true);
    const { error } = await supabase
      .from('materi_file')
      .update({
        nama: editItem.nama,
        deskripsi: editItem.deskripsi,
        kelas: editItem.kelas,
        bab_id: editItem.bab_id || null,
        // 'mapel' dan 'bab' didenormalisasi di materi_file (bukan hasil join),
        // jadi ikut disinkronkan manual berdasarkan bab yang dipilih supaya
        // tampilan tabel/export tetap akurat tanpa perlu join ke materi_bab.
        mapel: editSelectedBab?.materi_mapel?.nama || null,
        bab: editSelectedBab?.nama || null,
        status: editItem.status,
      })
      .eq('id', editItem.id);
    setSavingEdit(false);
    if (error) { setToast({ type: 'error', message: 'Gagal menyimpan perubahan: ' + error.message }); return; }
    setToast({ type: 'success', message: 'Materi berhasil diperbarui.' });
    setEditItem(null);
    fetchAllSources();
  };

  const editSelectedBab = editItem
    ? babList.find(b => b.id === editItem.bab_id)
    : null;

  const editMapelNama = editItem
    ? (editSelectedBab?.materi_mapel?.nama || '')
    : '';
  const editBabOptions = editMapelNama ? babList.filter(b => b.materi_mapel?.nama === editMapelNama) : babList;

  // ════════════════════════════════════════════════════════════════════════
  // SESI PEMBELAJARAN — derived data & handlers
  // ════════════════════════════════════════════════════════════════════════
  const sesiEnriched = useMemo(() => sesiRows.map(r => ({
    ...r,
    siswaNama: profilesMap[r.siswa_id] || '(Tidak diketahui)',
    guruNama: profilesMap[r.guru_id] || '(Tidak diketahui)',
  })), [sesiRows, profilesMap]);

  const sesiSiswaOptions = useMemo(() => {
    const set = new Set();
    sesiEnriched.forEach(r => { if (r.siswaNama) set.add(r.siswaNama); });
    return Array.from(set).sort();
  }, [sesiEnriched]);

  const sesiCounts = useMemo(() => ({
    '': sesiRows.length,
    Menunggu: sesiRows.filter(r => r.status === 'Menunggu').length,
    Disetujui: sesiRows.filter(r => r.status === 'Disetujui').length,
    Ditolak: sesiRows.filter(r => r.status === 'Ditolak').length,
  }), [sesiRows]);

  const sesiFilteredRows = useMemo(() => {
    const q = sesiSearch.trim().toLowerCase();
    return sesiEnriched.filter(r => {
      if (sesiStatusFilter && r.status !== sesiStatusFilter) return false;
      if (sesiSiswaFilter && r.siswaNama !== sesiSiswaFilter) return false;
      if (q) {
        const hay = [r.judul_materi, r.catatan, r.siswaNama, r.guruNama].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [sesiEnriched, sesiSearch, sesiStatusFilter, sesiSiswaFilter]);

  const sesiTotalPages = Math.max(1, Math.ceil(sesiFilteredRows.length / PAGE_SIZE));
  const sesiPageRows = sesiFilteredRows.slice((sesiPage - 1) * PAGE_SIZE, sesiPage * PAGE_SIZE);

  useEffect(() => { setSesiPage(1); }, [sesiSearch, sesiStatusFilter, sesiSiswaFilter]);

  const handleSesiStatusChange = async (item, newStatus) => {
    setSesiBusyId(item.id);
    const { error } = await supabase.from('sesi_pembelajaran').update({ status: newStatus }).eq('id', item.id);
    setSesiBusyId(null);
    if (error) { setToast({ type: 'error', message: 'Gagal mengubah status: ' + error.message }); return; }
    setSesiRows(prev => prev.map(r => r.id === item.id ? { ...r, status: newStatus } : r));
    setToast({ type: 'success', message: `Sesi "${item.judul_materi}" ditandai ${newStatus}.` });
  };

  // ════════════════════════════════════════════════════════════════════════
  // BANK SOAL SISWA — derived data & handlers
  // ════════════════════════════════════════════════════════════════════════
  const bankEnriched = useMemo(() => bankRows.map(r => ({
    ...r,
    siswaNama: profilesMap[r.siswa_id] || '(Tidak diketahui)',
  })), [bankRows, profilesMap]);

  const bankSiswaOptions = useMemo(() => {
    const set = new Set();
    bankEnriched.forEach(r => { if (r.siswaNama) set.add(r.siswaNama); });
    return Array.from(set).sort();
  }, [bankEnriched]);

  const bankCounts = useMemo(() => ({
    '': bankRows.length,
    Ulangan: bankRows.filter(r => r.jenis === 'Ulangan').length,
    Penugasan: bankRows.filter(r => r.jenis === 'Penugasan').length,
  }), [bankRows]);

  const bankFilteredRows = useMemo(() => {
    const q = bankSearch.trim().toLowerCase();
    return bankEnriched.filter(r => {
      if (bankJenisFilter && r.jenis !== bankJenisFilter) return false;
      if (bankSiswaFilter && r.siswaNama !== bankSiswaFilter) return false;
      if (q) {
        const hay = [r.judul, r.bab, r.sub_bab, r.deskripsi, r.siswaNama].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [bankEnriched, bankSearch, bankJenisFilter, bankSiswaFilter]);

  const bankTotalPages = Math.max(1, Math.ceil(bankFilteredRows.length / PAGE_SIZE));
  const bankPageRows = bankFilteredRows.slice((bankPage - 1) * PAGE_SIZE, bankPage * PAGE_SIZE);

  useEffect(() => { setBankPage(1); }, [bankSearch, bankJenisFilter, bankSiswaFilter]);

  // ════════════════════════════════════════════════════════════════════════
  // HAPUS (generik untuk ketiga sumber)
  // ════════════════════════════════════════════════════════════════════════
  const handleDeleteConfirmed = async () => {
    if (!deleteItem) return;
    const { source, item } = deleteItem;

    if (source === 'materi') {
      setBusyId(item.id);
      const { error } = await supabase.from('materi_file').delete().eq('id', item.id);
      setBusyId(null);
      if (error) { setToast({ type: 'error', message: 'Gagal menghapus: ' + error.message }); setDeleteItem(null); return; }
      setRows(prev => prev.filter(r => r.id !== item.id));
      setToast({ type: 'success', message: `"${item.nama}" telah dihapus.` });
    } else if (source === 'sesi') {
      setSesiBusyId(item.id);
      try {
        const marker = '/materi/';
        for (const url of (item.bukti_urls || [])) {
          const idx = url.indexOf(marker);
          if (idx !== -1) {
            const path = decodeURIComponent(url.slice(idx + marker.length));
            await supabase.storage.from('materi').remove([path]);
          }
        }
      } catch (e) {
        console.warn('Gagal hapus file bukti di storage:', e.message);
      }
      const { error } = await supabase.from('sesi_pembelajaran').delete().eq('id', item.id);
      setSesiBusyId(null);
      if (error) { setToast({ type: 'error', message: 'Gagal menghapus: ' + error.message }); setDeleteItem(null); return; }
      setSesiRows(prev => prev.filter(r => r.id !== item.id));
      setToast({ type: 'success', message: `Sesi "${item.judul_materi}" telah dihapus.` });
    } else if (source === 'bank') {
      setBankBusyId(item.id);
      try {
        const marker = '/bank-soal/';
        const idx = (item.file_url || '').indexOf(marker);
        if (idx !== -1) {
          const path = decodeURIComponent(item.file_url.slice(idx + marker.length));
          await supabase.storage.from('bank-soal').remove([path]);
        }
      } catch (e) {
        console.warn('Gagal hapus file di storage:', e.message);
      }
      const { error } = await supabase.from('bank_soal_siswa').delete().eq('id', item.id);
      setBankBusyId(null);
      if (error) { setToast({ type: 'error', message: 'Gagal menghapus: ' + error.message }); setDeleteItem(null); return; }
      setBankRows(prev => prev.filter(r => r.id !== item.id));
      setToast({ type: 'success', message: `"${item.judul}" telah dihapus.` });
    }
    setDeleteItem(null);
  };

  const deleteItemLabel = deleteItem
    ? (deleteItem.source === 'materi' ? deleteItem.item.nama
      : deleteItem.source === 'sesi' ? deleteItem.item.judul_materi
        : deleteItem.item.judul)
    : '';

  // ════════════════════════════════════════════════════════════════════════
  // RESET & DOWNLOAD (mengikuti tab sumber yang aktif)
  // ════════════════════════════════════════════════════════════════════════
  const handleReset = () => {
    if (activeSource === 'materi') {
      setSearch(''); setStatusFilter(''); setMapelFilter(''); setGuruFilter(''); setKelasFilter(''); setPage(1);
    } else if (activeSource === 'sesi') {
      setSesiSearch(''); setSesiStatusFilter(''); setSesiSiswaFilter(''); setSesiPage(1);
    } else {
      setBankSearch(''); setBankJenisFilter(''); setBankSiswaFilter(''); setBankPage(1);
    }
  };

  const handleDownloadAll = () => {
    if (activeSource === 'materi') {
      if (rows.length === 0) { setToast({ type: 'error', message: 'Tidak ada materi untuk didownload.' }); return; }
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
      setToast({ type: 'success', message: `${rows.length} materi berhasil didownload.` });
    } else if (activeSource === 'sesi') {
      if (sesiRows.length === 0) { setToast({ type: 'error', message: 'Tidak ada data sesi untuk didownload.' }); return; }
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
      setToast({ type: 'success', message: `${sesiRows.length} sesi berhasil didownload.` });
    } else {
      if (bankRows.length === 0) { setToast({ type: 'error', message: 'Tidak ada data bank soal untuk didownload.' }); return; }
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
      setToast({ type: 'success', message: `${bankRows.length} data berhasil didownload.` });
    }
  };

  const headerSubtitle = activeSource === 'materi'
    ? 'Kelola seluruh materi yang diunggah oleh semua guru.'
    : activeSource === 'sesi'
      ? 'Tinjau & setujui bukti sesi pembelajaran yang diunggah guru per siswa.'
      : 'Kelola bank soal (ulangan/PH & tugas) yang diunggah siswa.';

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '1.2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.7rem', fontWeight: 'bold', color: C.dark, margin: '0 0 6px' }}>Pengaturan Materi</h1>
          <p style={{ color: C.gray, fontSize: '0.92rem', margin: 0 }}>{headerSubtitle}</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleReset}
            style={{ padding: '9px 16px', borderRadius: '10px', border: `1.5px solid ${C.border}`, background: C.white, color: C.gray, fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            ⟲ Reset
          </button>
          <button
            onClick={handleDownloadAll}
            style={{ padding: '9px 16px', borderRadius: '10px', border: 'none', background: C.gold, color: C.white, fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            ⬇ Simpan
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          background: toast.type === 'success' ? C.successBg : C.dangerBg,
          border: `1.5px solid ${toast.type === 'success' ? C.success : C.danger}`,
          color: toast.type === 'success' ? C.success : C.danger,
          borderRadius: '12px', padding: '10px 16px', fontSize: '0.88rem', marginBottom: '1.1rem',
        }}>
          {toast.type === 'success' ? '✓ ' : '⚠️ '}{toast.message}
        </div>
      )}

      {/* Tab sumber data */}
      <SourceTabBar active={activeSource} onChange={setActiveSource} />

      {/* ══════════════════════════ MATERI GURU ══════════════════════════ */}
      {activeSource === 'materi' && (
        <>
          <div style={{ position: 'relative', marginBottom: '0.9rem' }}>
            <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: C.gray }}>🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari judul materi, guru, mapel, bab..."
              style={{ width: '100%', padding: '11px 14px 11px 38px', borderRadius: '10px', border: `1.5px solid ${C.border}`, fontSize: '0.9rem', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '1.1rem' }}>
            <select value={mapelFilter} onChange={e => setMapelFilter(e.target.value)} style={selectStyle}>
              <option value="">Semua Mapel</option>
              {mapelOptions.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select value={guruFilter} onChange={e => setGuruFilter(e.target.value)} style={selectStyle}>
              <option value="">Semua Guru</option>
              {guruOptions.map(g => <option key={g.user_id} value={g.user_id}>{g.nama}</option>)}
            </select>
            <select value={kelasFilter} onChange={e => setKelasFilter(e.target.value)} style={selectStyle}>
              <option value="">Semua Kelas</option>
              {kelasOptions.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={selectStyle}>
              <option value="">Semua Status</option>
              <option value="Dipublish">Aktif</option>
              <option value="Draft">Draft</option>
              <option value="Diarsipkan">Diarsipkan</option>
            </select>
          </div>

          <StatusTabBar tabs={MATERI_TABS} active={statusFilter} counts={materiCounts} onChange={setStatusFilter} />

          {materiError && (
            <div style={{ background: C.dangerBg, border: `1.5px solid ${C.danger}`, color: C.danger, borderRadius: '12px', padding: '10px 16px', fontSize: '0.88rem', marginBottom: '1.1rem' }}>
              ⚠️ {materiError}
            </div>
          )}

          <div style={{ background: C.white, border: `1.5px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ background: C.cream, textAlign: 'left' }}>
                    {['No', 'Judul Materi', 'Mapel', 'Bab / Topik', 'Kelas', 'Teacher', 'Tanggal Publish', 'Status', 'Aksi'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', color: C.gray, fontWeight: 'bold', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.03em', borderBottom: `1.5px solid ${C.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr><td colSpan={9} style={{ padding: '32px', textAlign: 'center', color: C.gray }}>Memuat data materi...</td></tr>
                  )}
                  {!loading && materiPageRows.length === 0 && (
                    <tr><td colSpan={9} style={{ padding: '32px', textAlign: 'center', color: C.gray }}>Tidak ada materi yang cocok dengan filter ini.</td></tr>
                  )}
                  {!loading && materiPageRows.map((item, idx) => {
                    const badge = STATUS_COLOR[item.status] || { color: C.gray, bg: C.cream };
                    const isBusy = busyId === item.id;
                    return (
                      <tr key={item.id} style={{ borderTop: `1px solid ${C.border}` }}>
                        <td style={{ padding: '12px 16px', color: C.gray }}>{(page - 1) * PAGE_SIZE + idx + 1}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 'bold', color: C.dark }}>{item.nama}</div>
                          {item.deskripsi && <div style={{ color: C.gray, fontSize: '0.78rem', marginTop: '2px' }}>{item.deskripsi}</div>}
                        </td>
                        <td style={{ padding: '12px 16px', color: C.dark }}>{item.mapel || '-'}</td>
                        <td style={{ padding: '12px 16px', color: C.dark }}>{item.bab || '-'}</td>
                        <td style={{ padding: '12px 16px', color: C.dark }}>{item.kelas || '-'}</td>
                        <td style={{ padding: '12px 16px', color: C.dark }}>{item.diupload_oleh || '-'}</td>
                        <td style={{ padding: '12px 16px', color: C.gray, whiteSpace: 'nowrap' }}>{formatTanggal(item.tanggal)}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ padding: '4px 12px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 'bold', background: badge.bg, color: badge.color }}>
                            {STATUS_DB_TO_LABEL[item.status] || item.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <IconBtn title={item.status === 'Diarsipkan' ? 'Aktifkan kembali' : 'Arsipkan'} color="#b45309" bg="rgba(180,83,9,0.10)" disabled={isBusy} onClick={() => handleArchiveToggle(item)}>
                              {item.status === 'Diarsipkan' ? '📤' : '📦'}
                            </IconBtn>
                            <IconBtn title="Edit" color={C.blue} bg={C.blueBg} disabled={isBusy} onClick={() => setEditItem({ ...item })}>✏️</IconBtn>
                            <IconBtn title="Hapus" color={C.danger} bg={C.dangerBg} disabled={isBusy} onClick={() => setDeleteItem({ source: 'materi', item })}>🗑️</IconBtn>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {!loading && (
            <Pagination page={page} totalPages={materiTotalPages} total={filteredRows.length} itemLabel="materi"
              onPrev={() => setPage(p => Math.max(1, p - 1))} onNext={() => setPage(p => Math.min(materiTotalPages, p + 1))} />
          )}
        </>
      )}

      {/* ══════════════════════════ SESI PEMBELAJARAN ══════════════════════════ */}
      {activeSource === 'sesi' && (
        <>
          <div style={{ position: 'relative', marginBottom: '0.9rem' }}>
            <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: C.gray }}>🔍</span>
            <input
              value={sesiSearch}
              onChange={e => setSesiSearch(e.target.value)}
              placeholder="Cari judul materi, catatan, siswa, atau guru..."
              style={{ width: '100%', padding: '11px 14px 11px 38px', borderRadius: '10px', border: `1.5px solid ${C.border}`, fontSize: '0.9rem', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '1.1rem' }}>
            <select value={sesiSiswaFilter} onChange={e => setSesiSiswaFilter(e.target.value)} style={selectStyle}>
              <option value="">Semua Siswa</option>
              {sesiSiswaOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <StatusTabBar tabs={SESI_TABS} active={sesiStatusFilter} counts={sesiCounts} onChange={setSesiStatusFilter} />

          {sesiError && (
            <div style={{ background: C.dangerBg, border: `1.5px solid ${C.danger}`, color: C.danger, borderRadius: '12px', padding: '10px 16px', fontSize: '0.88rem', marginBottom: '1.1rem' }}>
              ⚠️ {sesiError}
            </div>
          )}

          <div style={{ background: C.white, border: `1.5px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1000px', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ background: C.cream, textAlign: 'left' }}>
                    {['No', 'Siswa', 'Guru', 'Tanggal', 'Judul Materi', 'Catatan', 'Bukti', 'Status', 'Aksi'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', color: C.gray, fontWeight: 'bold', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.03em', borderBottom: `1.5px solid ${C.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr><td colSpan={9} style={{ padding: '32px', textAlign: 'center', color: C.gray }}>Memuat data sesi pembelajaran...</td></tr>
                  )}
                  {!loading && sesiPageRows.length === 0 && (
                    <tr><td colSpan={9} style={{ padding: '32px', textAlign: 'center', color: C.gray }}>Tidak ada sesi yang cocok dengan filter ini.</td></tr>
                  )}
                  {!loading && sesiPageRows.map((item, idx) => {
                    const badge = SESI_STATUS_COLOR[item.status] || { color: C.gray, bg: C.cream };
                    const isBusy = sesiBusyId === item.id;
                    return (
                      <tr key={item.id} style={{ borderTop: `1px solid ${C.border}` }}>
                        <td style={{ padding: '12px 16px', color: C.gray }}>{(sesiPage - 1) * PAGE_SIZE + idx + 1}</td>
                        <td style={{ padding: '12px 16px', color: C.dark, fontWeight: 'bold' }}>{item.siswaNama}</td>
                        <td style={{ padding: '12px 16px', color: C.dark }}>{item.guruNama}</td>
                        <td style={{ padding: '12px 16px', color: C.gray, whiteSpace: 'nowrap' }}>{formatTanggalSingkat(item.tanggal)}</td>
                        <td style={{ padding: '12px 16px', color: C.dark }}>{item.judul_materi}</td>
                        <td style={{ padding: '12px 16px', color: C.gray, maxWidth: '220px' }}>{item.catatan || '-'}</td>
                        <td style={{ padding: '12px 16px' }}>
                          {item.bukti_urls && item.bukti_urls.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              {item.bukti_urls.map((url, i) => (
                                <a key={i} href={url} target="_blank" rel="noreferrer" style={{ color: C.blue, fontSize: '0.78rem', textDecoration: 'none' }}>📎 File {i + 1}</a>
                              ))}
                            </div>
                          ) : <span style={{ color: C.gray }}>-</span>}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ padding: '4px 12px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 'bold', background: badge.bg, color: badge.color }}>
                            {item.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <IconBtn title="Setujui" color={C.success} bg={C.successBg} disabled={isBusy || item.status === 'Disetujui'} onClick={() => handleSesiStatusChange(item, 'Disetujui')}>✓</IconBtn>
                            <IconBtn title="Tolak" color={C.danger} bg={C.dangerBg} disabled={isBusy || item.status === 'Ditolak'} onClick={() => handleSesiStatusChange(item, 'Ditolak')}>✕</IconBtn>
                            <IconBtn title="Hapus" color={C.danger} bg={C.dangerBg} disabled={isBusy} onClick={() => setDeleteItem({ source: 'sesi', item })}>🗑️</IconBtn>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {!loading && (
            <Pagination page={sesiPage} totalPages={sesiTotalPages} total={sesiFilteredRows.length} itemLabel="sesi"
              onPrev={() => setSesiPage(p => Math.max(1, p - 1))} onNext={() => setSesiPage(p => Math.min(sesiTotalPages, p + 1))} />
          )}
        </>
      )}

      {/* ══════════════════════════ BANK SOAL SISWA ══════════════════════════ */}
      {activeSource === 'bank' && (
        <>
          <div style={{ position: 'relative', marginBottom: '0.9rem' }}>
            <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: C.gray }}>🔍</span>
            <input
              value={bankSearch}
              onChange={e => setBankSearch(e.target.value)}
              placeholder="Cari judul, bab, sub bab, atau siswa..."
              style={{ width: '100%', padding: '11px 14px 11px 38px', borderRadius: '10px', border: `1.5px solid ${C.border}`, fontSize: '0.9rem', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '1.1rem' }}>
            <select value={bankSiswaFilter} onChange={e => setBankSiswaFilter(e.target.value)} style={selectStyle}>
              <option value="">Semua Siswa</option>
              {bankSiswaOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <StatusTabBar tabs={BANK_TABS} active={bankJenisFilter} counts={bankCounts} onChange={setBankJenisFilter} />

          {bankError && (
            <div style={{ background: C.dangerBg, border: `1.5px solid ${C.danger}`, color: C.danger, borderRadius: '12px', padding: '10px 16px', fontSize: '0.88rem', marginBottom: '1.1rem' }}>
              ⚠️ {bankError}
            </div>
          )}

          <div style={{ background: C.white, border: `1.5px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '950px', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ background: C.cream, textAlign: 'left' }}>
                    {['No', 'Siswa', 'Jenis', 'Bab / Sub Bab', 'Judul', 'File', 'Tanggal', 'Aksi'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', color: C.gray, fontWeight: 'bold', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.03em', borderBottom: `1.5px solid ${C.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr><td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: C.gray }}>Memuat data bank soal siswa...</td></tr>
                  )}
                  {!loading && bankPageRows.length === 0 && (
                    <tr><td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: C.gray }}>Tidak ada data yang cocok dengan filter ini.</td></tr>
                  )}
                  {!loading && bankPageRows.map((item, idx) => {
                    const badge = JENIS_COLOR[item.jenis] || { color: C.gray, bg: C.cream };
                    const isBusy = bankBusyId === item.id;
                    return (
                      <tr key={item.id} style={{ borderTop: `1px solid ${C.border}` }}>
                        <td style={{ padding: '12px 16px', color: C.gray }}>{(bankPage - 1) * PAGE_SIZE + idx + 1}</td>
                        <td style={{ padding: '12px 16px', color: C.dark, fontWeight: 'bold' }}>{item.siswaNama}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ padding: '4px 12px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 'bold', background: badge.bg, color: badge.color }}>
                            {item.jenis === 'Ulangan' ? 'Ulangan (PH)' : item.jenis}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', color: C.dark }}>{item.bab}{item.sub_bab ? ` / ${item.sub_bab}` : ''}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 'bold', color: C.dark }}>{item.judul}</div>
                          {item.deskripsi && <div style={{ color: C.gray, fontSize: '0.78rem', marginTop: '2px' }}>{item.deskripsi}</div>}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {item.file_url
                            ? <a href={item.file_url} target="_blank" rel="noreferrer" style={{ color: C.blue, fontSize: '0.82rem', textDecoration: 'none' }}>📎 {item.file_name || 'Lihat file'}</a>
                            : <span style={{ color: C.gray }}>-</span>}
                        </td>
                        <td style={{ padding: '12px 16px', color: C.gray, whiteSpace: 'nowrap' }}>{formatTanggalSingkat(item.created_at)}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <IconBtn title="Hapus" color={C.danger} bg={C.dangerBg} disabled={isBusy} onClick={() => setDeleteItem({ source: 'bank', item })}>🗑️</IconBtn>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {!loading && (
            <Pagination page={bankPage} totalPages={bankTotalPages} total={bankFilteredRows.length} itemLabel="data"
              onPrev={() => setBankPage(p => Math.max(1, p - 1))} onNext={() => setBankPage(p => Math.min(bankTotalPages, p + 1))} />
          )}
        </>
      )}

      {/* Modal Edit (khusus Materi Guru) */}
      {editItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(23,20,17,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '1rem' }}>
          <div style={{ background: C.white, borderRadius: '16px', padding: '1.6rem', width: '380px', maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ fontWeight: 'bold', fontSize: '1.05rem', color: C.dark, marginBottom: '12px' }}>Edit Materi</div>

            <label style={{ fontSize: '0.8rem', color: C.gray }}>Judul Materi</label>
            <input
              value={editItem.nama || ''}
              onChange={e => setEditItem({ ...editItem, nama: e.target.value })}
              style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: `1.5px solid ${C.border}`, marginTop: '4px', marginBottom: '10px', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />

            <label style={{ fontSize: '0.8rem', color: C.gray }}>Deskripsi</label>
            <textarea
              value={editItem.deskripsi || ''}
              onChange={e => setEditItem({ ...editItem, deskripsi: e.target.value })}
              rows={2}
              style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: `1.5px solid ${C.border}`, marginTop: '4px', marginBottom: '10px', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' }}
            />

            <label style={{ fontSize: '0.8rem', color: C.gray }}>Kelas</label>
            <input
              value={editItem.kelas || ''}
              onChange={e => setEditItem({ ...editItem, kelas: e.target.value })}
              style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: `1.5px solid ${C.border}`, marginTop: '4px', marginBottom: '10px', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />

            <label style={{ fontSize: '0.8rem', color: C.gray }}>Bab / Topik</label>
            <select
              value={editItem.bab_id || ''}
              onChange={e => setEditItem({ ...editItem, bab_id: e.target.value ? Number(e.target.value) : '' })}
              style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: `1.5px solid ${C.border}`, marginTop: '4px', marginBottom: '10px', fontFamily: 'inherit' }}
            >
              <option value="">Pilih bab...</option>
              {editBabOptions.map(b => <option key={b.id} value={b.id}>{b.materi_mapel?.nama || '-'} — {b.nama}</option>)}
            </select>

            <label style={{ fontSize: '0.8rem', color: C.gray }}>Status</label>
            <select
              value={editItem.status}
              onChange={e => setEditItem({ ...editItem, status: e.target.value })}
              style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: `1.5px solid ${C.border}`, marginTop: '4px', marginBottom: '16px', fontFamily: 'inherit' }}
            >
              <option value="Dipublish">Aktif</option>
              <option value="Draft">Draft</option>
              <option value="Diarsipkan">Diarsipkan</option>
            </select>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setEditItem(null)} style={{ padding: '9px 16px', borderRadius: '9px', border: `1.5px solid ${C.border}`, background: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Batal</button>
              <button onClick={handleSaveEdit} disabled={savingEdit} style={{ padding: '9px 16px', borderRadius: '9px', border: 'none', background: C.gold, color: C.white, fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit' }}>
                {savingEdit ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus (generik untuk 3 sumber) */}
      {deleteItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(23,20,17,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '1rem' }}>
          <div style={{ background: C.white, borderRadius: '16px', padding: '1.6rem', width: '340px', maxWidth: '100%' }}>
            <div style={{ fontWeight: 'bold', fontSize: '1.05rem', color: C.dark, marginBottom: '8px' }}>Hapus Data?</div>
            <div style={{ color: C.gray, fontSize: '0.88rem', marginBottom: '18px' }}>
              "{deleteItemLabel}" akan dihapus permanen dari seluruh sistem dan tidak bisa dikembalikan.
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteItem(null)} style={{ padding: '9px 16px', borderRadius: '9px', border: `1.5px solid ${C.border}`, background: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Batal</button>
              <button onClick={handleDeleteConfirmed} style={{ padding: '9px 16px', borderRadius: '9px', border: 'none', background: C.danger, color: C.white, fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit' }}>Hapus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPengaturanMateri;