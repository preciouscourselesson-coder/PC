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

// Status di database tetap 'Dipublish' | 'Draft' | 'Diarsipkan'.
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
const TABS = [
  { key: '', label: 'Semua' },
  { key: 'Dipublish', label: 'Aktif' },
  { key: 'Diarsipkan', label: 'Diarsipkan' },
];

const PAGE_SIZE = 20;

const formatTanggal = (iso) => {
  if (!iso) return '-';
  const d = new Date(iso);
  const bulan = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${String(d.getDate()).padStart(2, '0')} ${bulan[d.getMonth()]} ${d.getFullYear()} ${hh}:${mm}`;
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

const AdminPengaturanMateri = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [toast, setToast] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // '' | 'Dipublish' | 'Draft' | 'Diarsipkan'
  const [mapelFilter, setMapelFilter] = useState('');   // materi_mapel.id
  const [guruFilter, setGuruFilter] = useState('');     // user_id
  const [kelasFilter, setKelasFilter] = useState('');   // teks bebas
  const [page, setPage] = useState(1);

  const [editItem, setEditItem] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const [mapelList, setMapelList] = useState([]);
  const [babList, setBabList] = useState([]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [{ data, error }, { data: mapelData }, { data: babData }] = await Promise.all([
        supabase
          .from('materi_file')
          .select('id, nama, tipe, tanggal, url, kelas, status, deskripsi, diupload_oleh, user_id, bab_id, materi_bab ( id, nama, mapel_id, materi_mapel ( id, nama ) )')
          .order('tanggal', { ascending: false }),
        supabase.from('materi_mapel').select('id, nama').order('nama'),
        supabase.from('materi_bab').select('id, nama, mapel_id').order('nama'),
      ]);
      if (error) throw error;
      setRows(data || []);
      setMapelList(mapelData || []);
      setBabList(babData || []);
    } catch (err) {
      console.error(err);
      setErrorMsg('Gagal memuat data materi. Coba muat ulang halaman.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Opsi filter Guru & Kelas dikumpulkan dari data yang benar-benar ada,
  // supaya selalu sinkron dengan isi tabel (tanpa perlu tabel referensi tambahan).
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

  // Counter tab (Semua/Aktif/Diarsipkan) dihitung dari seluruh data, tidak terpengaruh filter lain
  const counts = useMemo(() => ({
    '': rows.length,
    Dipublish: rows.filter(r => r.status === 'Dipublish').length,
    Diarsipkan: rows.filter(r => r.status === 'Diarsipkan').length,
  }), [rows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(r => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (mapelFilter && r.materi_bab?.mapel_id !== mapelFilter) return false;
      if (guruFilter && r.user_id !== guruFilter) return false;
      if (kelasFilter && r.kelas !== kelasFilter) return false;
      if (q) {
        const hay = [
          r.nama, r.diupload_oleh, r.materi_bab?.nama, r.materi_bab?.materi_mapel?.nama,
        ].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, statusFilter, mapelFilter, guruFilter, kelasFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pageRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search, statusFilter, mapelFilter, guruFilter, kelasFilter]);

  const handleReset = () => {
    setSearch('');
    setStatusFilter('');
    setMapelFilter('');
    setGuruFilter('');
    setKelasFilter('');
    setPage(1);
  };

  const handleDownloadAll = () => {
    if (rows.length === 0) {
      setToast({ type: 'error', message: 'Tidak ada materi untuk didownload.' });
      return;
    }
    const exportData = rows.map((r, i) => ({
      No: i + 1,
      'Judul Materi': r.nama,
      Deskripsi: r.deskripsi || '',
      Mapel: r.materi_bab?.materi_mapel?.nama || '-',
      'Bab / Topik': r.materi_bab?.nama || '-',
      Kelas: r.kelas || '-',
      Teacher: r.diupload_oleh || '-',
      'Tanggal Publish': formatTanggal(r.tanggal),
      Status: STATUS_DB_TO_LABEL[r.status] || r.status,
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    ws['!cols'] = [{ wch: 5 }, { wch: 28 }, { wch: 30 }, { wch: 16 }, { wch: 22 }, { wch: 8 }, { wch: 20 }, { wch: 18 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Semua Materi');
    XLSX.writeFile(wb, `semua_materi_${new Date().toISOString().slice(0, 19)}.xlsx`);
    setToast({ type: 'success', message: `${rows.length} materi berhasil didownload.` });
  };

  const handleArchiveToggle = async (item) => {
    const nextStatus = item.status === 'Diarsipkan' ? 'Dipublish' : 'Diarsipkan';
    setBusyId(item.id);
    const { error } = await supabase.from('materi_file').update({ status: nextStatus }).eq('id', item.id);
    setBusyId(null);
    if (error) { setToast({ type: 'error', message: 'Gagal mengubah status: ' + error.message }); return; }
    setRows(prev => prev.map(r => r.id === item.id ? { ...r, status: nextStatus } : r));
    setToast({ type: 'success', message: `"${item.nama}" ${nextStatus === 'Diarsipkan' ? 'diarsipkan' : 'diaktifkan kembali'}.` });
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    setBusyId(deleteItem.id);
    const { error } = await supabase.from('materi_file').delete().eq('id', deleteItem.id);
    setBusyId(null);
    if (error) { setToast({ type: 'error', message: 'Gagal menghapus: ' + error.message }); setDeleteItem(null); return; }
    setRows(prev => prev.filter(r => r.id !== deleteItem.id));
    setToast({ type: 'success', message: `"${deleteItem.nama}" telah dihapus.` });
    setDeleteItem(null);
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
        bab_id: editItem.bab_id,
        status: editItem.status,
      })
      .eq('id', editItem.id);
    setSavingEdit(false);
    if (error) { setToast({ type: 'error', message: 'Gagal menyimpan perubahan: ' + error.message }); return; }
    setToast({ type: 'success', message: 'Materi berhasil diperbarui.' });
    setEditItem(null);
    fetchAll();
  };

  const editMapelId = editItem
    ? (babList.find(b => b.id === editItem.bab_id)?.mapel_id || '')
    : '';
  const editBabOptions = editMapelId ? babList.filter(b => b.mapel_id === editMapelId) : babList;

  const selectStyle = {
    padding: '9px 12px', borderRadius: '10px', border: `1.5px solid ${C.border}`,
    fontSize: '0.85rem', color: C.dark, background: C.white, fontFamily: 'inherit', cursor: 'pointer',
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.7rem', fontWeight: 'bold', color: C.dark, margin: '0 0 6px' }}>Pengaturan Materi</h1>
          <p style={{ color: C.gray, fontSize: '0.92rem', margin: 0 }}>Kelola seluruh materi yang diunggah oleh semua guru.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleReset}
            style={{
              padding: '9px 16px', borderRadius: '10px', border: `1.5px solid ${C.border}`,
              background: C.white, color: C.gray, fontSize: '0.85rem', fontWeight: 'bold',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            ⟲ Reset
          </button>
          <button
            onClick={handleDownloadAll}
            style={{
              padding: '9px 16px', borderRadius: '10px', border: 'none',
              background: C.gold, color: C.white, fontSize: '0.85rem', fontWeight: 'bold',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
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

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '0.9rem' }}>
        <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: C.gray }}>🔍</span>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cari judul materi, guru, mapel, bab..."
          style={{
            width: '100%', padding: '11px 14px 11px 38px', borderRadius: '10px',
            border: `1.5px solid ${C.border}`, fontSize: '0.9rem', fontFamily: 'inherit', boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '1.1rem' }}>
        <select value={mapelFilter} onChange={e => setMapelFilter(e.target.value)} style={selectStyle}>
          <option value="">Semua Mapel</option>
          {mapelList.map(m => <option key={m.id} value={m.id}>{m.nama}</option>)}
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

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '1.1rem', borderBottom: `1.5px solid ${C.border}` }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            style={{
              padding: '10px 6px', border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit',
              fontSize: '0.9rem', fontWeight: statusFilter === tab.key ? 'bold' : 'normal',
              color: statusFilter === tab.key ? C.gold : C.gray,
              borderBottom: statusFilter === tab.key ? `2.5px solid ${C.gold}` : '2.5px solid transparent',
              marginRight: '18px', marginBottom: '-1.5px',
            }}
          >
            {tab.label} ({counts[tab.key] ?? 0})
          </button>
        ))}
      </div>

      {errorMsg && (
        <div style={{ background: C.dangerBg, border: `1.5px solid ${C.danger}`, color: C.danger, borderRadius: '12px', padding: '10px 16px', fontSize: '0.88rem', marginBottom: '1.1rem' }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Table */}
      <div style={{ background: C.white, border: `1.5px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ background: C.cream, textAlign: 'left' }}>
                {['No', 'Judul Materi', 'Mapel', 'Bab / Topik', 'Kelas', 'Teacher', 'Tanggal Publish', 'Status', 'Aksi'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', color: C.gray, fontWeight: 'bold', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.03em', borderBottom: `1.5px solid ${C.border}` }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={9} style={{ padding: '32px', textAlign: 'center', color: C.gray }}>Memuat data materi...</td></tr>
              )}
              {!loading && pageRows.length === 0 && (
                <tr><td colSpan={9} style={{ padding: '32px', textAlign: 'center', color: C.gray }}>Tidak ada materi yang cocok dengan filter ini.</td></tr>
              )}
              {!loading && pageRows.map((item, idx) => {
                const badge = STATUS_COLOR[item.status] || { color: C.gray, bg: C.cream };
                const isBusy = busyId === item.id;
                return (
                  <tr key={item.id} style={{ borderTop: `1px solid ${C.border}` }}>
                    <td style={{ padding: '12px 16px', color: C.gray }}>{(page - 1) * PAGE_SIZE + idx + 1}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 'bold', color: C.dark }}>{item.nama}</div>
                      {item.deskripsi && <div style={{ color: C.gray, fontSize: '0.78rem', marginTop: '2px' }}>{item.deskripsi}</div>}
                    </td>
                    <td style={{ padding: '12px 16px', color: C.dark }}>{item.materi_bab?.materi_mapel?.nama || '-'}</td>
                    <td style={{ padding: '12px 16px', color: C.dark }}>{item.materi_bab?.nama || '-'}</td>
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
                        <IconBtn
                          title={item.status === 'Diarsipkan' ? 'Aktifkan kembali' : 'Arsipkan'}
                          color="#b45309" bg="rgba(180,83,9,0.10)"
                          disabled={isBusy}
                          onClick={() => handleArchiveToggle(item)}
                        >
                          {item.status === 'Diarsipkan' ? '📤' : '📦'}
                        </IconBtn>
                        <IconBtn title="Edit" color={C.blue} bg={C.blueBg} disabled={isBusy} onClick={() => setEditItem({ ...item })}>✏️</IconBtn>
                        <IconBtn title="Hapus" color={C.danger} bg={C.dangerBg} disabled={isBusy} onClick={() => setDeleteItem(item)}>🗑️</IconBtn>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {!loading && filteredRows.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', fontSize: '0.85rem', color: C.gray }}>
          <span>Menampilkan {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredRows.length)} dari {filteredRows.length} materi</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{ padding: '7px 14px', borderRadius: '8px', border: `1.5px solid ${C.border}`, background: C.white, color: C.gray, cursor: page === 1 ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: page === 1 ? 0.5 : 1 }}
            >
              ‹ Sebelumnya
            </button>
            <span style={{ padding: '7px 10px' }}>Hal {page} / {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={{ padding: '7px 14px', borderRadius: '8px', border: `1.5px solid ${C.border}`, background: C.white, color: C.gray, cursor: page === totalPages ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: page === totalPages ? 0.5 : 1 }}
            >
              Selanjutnya ›
            </button>
          </div>
        </div>
      )}

      {/* Modal Edit */}
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
              onChange={e => setEditItem({ ...editItem, bab_id: e.target.value })}
              style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: `1.5px solid ${C.border}`, marginTop: '4px', marginBottom: '10px', fontFamily: 'inherit' }}
            >
              <option value="">Pilih bab...</option>
              {editBabOptions.map(b => <option key={b.id} value={b.id}>{b.nama}</option>)}
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
              <button
                onClick={handleSaveEdit}
                disabled={savingEdit}
                style={{ padding: '9px 16px', borderRadius: '9px', border: 'none', background: C.gold, color: C.white, fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                {savingEdit ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus */}
      {deleteItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(23,20,17,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '1rem' }}>
          <div style={{ background: C.white, borderRadius: '16px', padding: '1.6rem', width: '340px', maxWidth: '100%' }}>
            <div style={{ fontWeight: 'bold', fontSize: '1.05rem', color: C.dark, marginBottom: '8px' }}>Hapus Materi?</div>
            <div style={{ color: C.gray, fontSize: '0.88rem', marginBottom: '18px' }}>
              "{deleteItem.nama}" akan dihapus permanen dari seluruh sistem dan tidak bisa dikembalikan.
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteItem(null)} style={{ padding: '9px 16px', borderRadius: '9px', border: `1.5px solid ${C.border}`, background: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Batal</button>
              <button onClick={handleDelete} style={{ padding: '9px 16px', borderRadius: '9px', border: 'none', background: C.danger, color: C.white, fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit' }}>Hapus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPengaturanMateri;