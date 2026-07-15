import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';

const C = {
  gold: '#b4964b',
  green: '#2d6a4f',
  dark: '#171411',
  gray: '#444242',
  cream: '#f7f6f0',
  white: '#ffffff',
  border: '#e0ddd6',
  goldBg: 'rgba(180,150,75,0.10)',
  red: '#e74c3c',
  redBg: 'rgba(231,76,60,0.10)',
  blue: '#2f6fed',
  blueBg: 'rgba(47,111,237,0.10)',
  greenBg: 'rgba(45,106,79,0.10)',
  grayBg: 'rgba(68,66,66,0.08)',
};

const TABS = ['Dipublish', 'Draft', 'Diarsipkan'];

const STATUS_STYLE = {
  Dipublish: { bg: C.greenBg, color: C.green },
  Draft: { bg: C.grayBg, color: C.gray },
  Diarsipkan: { bg: C.goldBg, color: C.gold },
};

const fileIcon = (tipe) => {
  const t = (tipe || '').toLowerCase();
  if (t.includes('pdf')) return { emoji: '📄', label: 'PDF', color: C.red };
  if (t.includes('doc')) return { emoji: '📝', label: 'DOC', color: C.blue };
  if (t.includes('ppt')) return { emoji: '📊', label: 'PPT', color: '#d97706' };
  if (t.includes('image') || t.includes('png') || t.includes('jpg') || t.includes('jpeg')) return { emoji: '🖼️', label: 'IMG', color: C.green };
  return { emoji: '📁', label: 'FILE', color: C.gray };
};

const formatTanggal = (iso) => {
  if (!iso) return '-';
  const d = new Date(iso);
  const bulan = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${String(d.getDate()).padStart(2,'0')} ${bulan[d.getMonth()]} ${d.getFullYear()} ${hh}:${mm}`;
};

const IconBtn = ({ title, color, bg, onClick, children }) => (
  <button
    title={title}
    onClick={onClick}
    style={{
      width: '30px', height: '30px', borderRadius: '8px', border: 'none',
      background: bg, color, display: 'flex', alignItems: 'center',
      justifyContent: 'center', cursor: 'pointer', fontSize: '0.9rem', flexShrink: 0,
    }}
  >
    {children}
  </button>
);

/* ============================================================
   Sub-komponen: Form Unggah Materi
   (sebelumnya file terpisah TeacherUploadMateriModal.js,
   sekarang digabung ke dalam file ini)
   ============================================================ */

const uploadFieldLabel = { fontSize: '0.8rem', color: C.gray, display: 'block', marginBottom: '4px', marginTop: '10px' };
const uploadFieldInput = { width: '100%', padding: '10px 11px', borderRadius: '9px', border: `1.5px solid ${C.border}`, boxSizing: 'border-box', fontFamily: 'inherit', fontSize: '0.88rem' };

const TeacherUploadMateriModal = ({ userId, onUploaded }) => {
  const [babAjarList, setBabAjarList] = useState([]);
  const [kelasList, setKelasList] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  const [mapelNama, setMapelNama] = useState('');
  const [babId, setBabId] = useState('');
  const [subBabId, setSubBabId] = useState('');
  const [kelas, setKelas] = useState('');
  const [judul, setJudul] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [file, setFile] = useState(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [namaGuru, setNamaGuru] = useState('');

  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const loadData = async () => {
      if (!userId) return;
      setLoadingOptions(true);

      const [{ data: babAjarData }, { data: profile }, { data: guruRow }] = await Promise.all([
        supabase
          .from('bab_ajar')
          .select('id, mapel, judul_bab, sub_bab_ajar(id, judul_sub_bab)')
          .eq('guru_id', userId)
          .order('urutan', { ascending: true })
          .order('urutan', { referencedTable: 'sub_bab_ajar', ascending: true }),
        supabase.from('profiles').select('full_name').eq('id', userId).single(),
        supabase.from('guru').select('id').eq('profile_id', userId).single(),
      ]);

      setBabAjarList(babAjarData || []);
      setNamaGuru(profile?.full_name || '');

      // Kelas diambil dari jadwal_les milik guru ini, bukan input bebas,
      // supaya nilainya selalu konsisten dengan kelas yang benar-benar diajar.
      if (guruRow?.id) {
        const { data: jadwalData } = await supabase
          .from('jadwal_les')
          .select('kelas')
          .eq('guru_id', guruRow.id);
        const unique = Array.from(new Set((jadwalData || []).map(j => j.kelas).filter(Boolean))).sort();
        setKelasList(unique);
      }
      setLoadingOptions(false);
    };
    loadData();
  }, [userId]);

  const mapelOptions = Array.from(new Set(babAjarList.map(b => b.mapel).filter(Boolean))).sort();
  const babOptions = mapelNama ? babAjarList.filter(b => b.mapel === mapelNama) : babAjarList;
  const subBabOptions = babId ? (babAjarList.find(b => b.id === babId)?.sub_bab_ajar || []) : [];

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f && f.size > 10 * 1024 * 1024) {
      setErrorMsg('Ukuran file maksimal 10MB.');
      return;
    }
    setErrorMsg('');
    setFile(f || null);
  };

  const handleSubmit = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    if (!judul.trim()) return setErrorMsg('Judul materi wajib diisi.');
    if (!mapelNama) return setErrorMsg('Pilih Mapel.');
    if (!babId) return setErrorMsg('Pilih Bab / Topik.');
    if (!kelas) return setErrorMsg('Pilih Kelas.');
    if (!file) return setErrorMsg('Pilih file untuk diunggah.');

    setUploading(true);
    try {
      const safeName = file.name.replace(/\s+/g, '_');
      const path = `${userId}/${Date.now()}_${safeName}`;

      const { error: uploadError } = await supabase.storage.from('materi').upload(path, file);
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('materi').getPublicUrl(path);

      const { error: insertError } = await supabase.from('materi_file').insert({
        bab_id: babId,
        sub_bab_id: subBabId || null,
        user_id: userId,
        nama: judul.trim(),
        tipe: file.type || safeName.split('.').pop(),
        diupload_oleh: namaGuru,
        tanggal: new Date().toISOString(),
        url: publicUrlData.publicUrl,
        kelas,
        deskripsi: deskripsi.trim() || null,
        status: 'Dipublish',
      });
      if (insertError) throw insertError;

      // Reset field yang biasanya beda tiap materi, biarkan Kelas/Mapel/Bab/Sub Bab
      // tetap terisi supaya guru bisa langsung unggah beberapa file berikutnya
      // untuk bab yang sama tanpa mengisi ulang dari awal.
      setJudul('');
      setDeskripsi('');
      setFile(null);
      setFileInputKey(k => k + 1);
      setSuccessMsg('Materi berhasil diunggah.');

      onUploaded('Dipublish');
    } catch (err) {
      console.error(err);
      setErrorMsg('Gagal mengunggah materi: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ background: C.white, borderRadius: '16px', border: `1.5px solid ${C.border}`, padding: '1.2rem', fontFamily: 'inherit' }}>
        <div style={{ fontWeight: 'bold', fontSize: '1.05rem', color: C.dark, marginBottom: '4px' }}>+ Unggah Materi</div>
        <div style={{ fontSize: '0.82rem', color: C.gray }}>Materi akan tersimpan di penyimpanan dan tabel materi.</div>

        {loadingOptions ? (
          <div style={{ padding: '24px 0', textAlign: 'center', color: C.gray }}>Memuat data...</div>
        ) : (
          <>
            <label style={uploadFieldLabel}>Judul Materi</label>
            <input style={uploadFieldInput} value={judul} onChange={e => setJudul(e.target.value)} placeholder="Misal: Persamaan Kuadrat" />

            <label style={uploadFieldLabel}>Deskripsi (opsional)</label>
            <textarea style={{ ...uploadFieldInput, resize: 'vertical' }} rows={2} value={deskripsi} onChange={e => setDeskripsi(e.target.value)} placeholder="Ringkasan singkat isi materi" />

            <label style={uploadFieldLabel}>Kelas</label>
            <select style={uploadFieldInput} value={kelas} onChange={e => setKelas(e.target.value)}>
              <option value="">Pilih kelas...</option>
              {kelasList.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
            {kelasList.length === 0 && (
              <div style={{ fontSize: '0.75rem', color: C.gray, marginTop: '4px' }}>
                Belum ada jadwal les untuk Anda, sehingga daftar kelas kosong.
              </div>
            )}

            <label style={uploadFieldLabel}>Mapel</label>
            <select style={uploadFieldInput} value={mapelNama} onChange={e => { setMapelNama(e.target.value); setBabId(''); setSubBabId(''); }}>
              <option value="">Pilih mapel...</option>
              {mapelOptions.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            {mapelOptions.length === 0 && (
              <div style={{ fontSize: '0.75rem', color: C.gray, marginTop: '4px' }}>
                Belum ada bahan ajar di menu Konten Materi. Tambahkan mapel & bab dulu di sana.
              </div>
            )}

            <label style={uploadFieldLabel}>Bab / Topik</label>
            <select style={uploadFieldInput} value={babId} onChange={e => { setBabId(e.target.value); setSubBabId(''); }} disabled={!mapelNama}>
              <option value="">{mapelNama ? 'Pilih bab...' : 'Pilih mapel dulu'}</option>
              {babOptions.map(b => <option key={b.id} value={b.id}>{b.judul_bab}</option>)}
            </select>

            <label style={uploadFieldLabel}>Sub Bab</label>
            <select style={uploadFieldInput} value={subBabId} onChange={e => setSubBabId(e.target.value)} disabled={!babId}>
              <option value="">{babId ? (subBabOptions.length ? 'Pilih sub bab (opsional)...' : 'Belum ada sub bab untuk bab ini') : 'Pilih bab dulu'}</option>
              {subBabOptions.map(s => <option key={s.id} value={s.id}>{s.judul_sub_bab}</option>)}
            </select>

            <label style={uploadFieldLabel}>File Materi</label>
            <input key={fileInputKey} type="file" onChange={handleFileChange} style={{ width: '100%', fontSize: '0.85rem' }} />

            {errorMsg && <div style={{ color: C.red, fontSize: '0.82rem', marginTop: '10px' }}>{errorMsg}</div>}
            {!errorMsg && successMsg && <div style={{ color: C.green, fontSize: '0.82rem', marginTop: '10px' }}>{successMsg}</div>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                onClick={handleSubmit}
                disabled={uploading}
                style={{ padding: '9px 16px', borderRadius: '9px', border: 'none', background: C.gold, color: C.white, fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit', width: '100%' }}
              >
                {uploading ? 'Mengunggah...' : 'Unggah'}
              </button>
            </div>
          </>
        )}
    </div>
  );
};

/* ============================================================
   Komponen Utama: Arsip Materi
   ============================================================ */

const TeacherArsipMateri = () => {
  const [userId, setUserId] = useState(null);
  const [activeTab, setActiveTab] = useState('Dipublish');
  const [search, setSearch] = useState('');
  const [filterKelas, setFilterKelas] = useState('');
  const [filterMapel, setFilterMapel] = useState('');
  const [filterBab, setFilterBab] = useState('');

  const [babAjarList, setBabAjarList] = useState([]);
  const [kelasList, setKelasList] = useState([]);

  const [materiList, setMateriList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // ambil user login
  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setUserId(session.user.id);
    };
    getUser();
  }, []);

  // ambil daftar bab & sub bab (dari Konten Materi guru ini) untuk dropdown filter
  useEffect(() => {
    if (!userId) return;
    const loadFilters = async () => {
      const { data: babAjarData } = await supabase
        .from('bab_ajar')
        .select('id, mapel, judul_bab, sub_bab_ajar(id, judul_sub_bab)')
        .eq('guru_id', userId)
        .order('urutan', { ascending: true })
        .order('urutan', { referencedTable: 'sub_bab_ajar', ascending: true });
      setBabAjarList(babAjarData || []);
    };
    loadFilters();
  }, [userId]);

  const fetchMateri = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setErrorMsg('');
    try {
      let query = supabase
        .from('materi_file')
        .select('id, nama, tipe, tanggal, url, kelas, status, deskripsi, bab_id, sub_bab_id, bab_ajar ( id, judul_bab, mapel ), sub_bab_ajar ( id, judul_sub_bab )')
        .eq('user_id', userId)
        .eq('status', activeTab)
        .order('tanggal', { ascending: false });

      if (filterKelas) query = query.eq('kelas', filterKelas);
      if (filterBab) query = query.eq('bab_id', filterBab);
      if (search.trim()) query = query.ilike('nama', `%${search.trim()}%`);

      const { data, error } = await query;
      if (error) throw error;

      let rows = data || [];
      if (filterMapel) {
        rows = rows.filter(r => r.bab_ajar?.mapel === filterMapel);
      }
      setMateriList(rows);

      // kumpulkan opsi kelas unik dari data yang pernah diupload
      setKelasList(prev => {
        const set = new Set(prev);
        rows.forEach(r => { if (r.kelas) set.add(r.kelas); });
        return Array.from(set).sort();
      });
    } catch (err) {
      console.error(err);
      setErrorMsg('Gagal memuat materi. Coba muat ulang halaman.');
    } finally {
      setLoading(false);
    }
  }, [userId, activeTab, filterKelas, filterBab, filterMapel, search]);

  useEffect(() => { fetchMateri(); }, [fetchMateri]);

  const mapelOptionsFilter = Array.from(new Set(babAjarList.map(b => b.mapel).filter(Boolean))).sort();
  const babOptionsForMapel = filterMapel
    ? babAjarList.filter(b => b.mapel === filterMapel)
    : babAjarList;

  const handleArchiveToggle = async (item) => {
    const nextStatus = item.status === 'Diarsipkan' ? 'Dipublish' : 'Diarsipkan';
    const { error } = await supabase
      .from('materi_file')
      .update({ status: nextStatus })
      .eq('id', item.id);
    if (error) { alert('Gagal mengubah status: ' + error.message); return; }
    fetchMateri();
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    const { error } = await supabase.from('materi_file').delete().eq('id', deleteItem.id);
    if (error) { alert('Gagal menghapus: ' + error.message); return; }
    setDeleteItem(null);
    fetchMateri();
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
        status: editItem.status,
      })
      .eq('id', editItem.id);
    setSavingEdit(false);
    if (error) { alert('Gagal menyimpan: ' + error.message); return; }
    setEditItem(null);
    fetchMateri();
  };

  const selectStyle = {
    padding: '9px 12px', borderRadius: '10px', border: `1.5px solid ${C.border}`,
    fontSize: '0.85rem', color: C.dark, background: C.white, fontFamily: 'inherit', cursor: 'pointer',
  };

  return (
    <div style={{ fontFamily: 'inherit' }}>
      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap' }}>

      {/* Kolom kiri: tabs, filter, tabel */}
      <div style={{ order: 1, flex: '1 1 560px', minWidth: 0 }}>

      {/* Header (tabs) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '4px', background: C.white, padding: '4px', borderRadius: '12px', border: `1.5px solid ${C.border}` }}>
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '8px 18px', borderRadius: '9px', border: 'none', fontFamily: 'inherit',
                fontSize: '0.9rem', fontWeight: activeTab === tab ? 'bold' : 'normal', cursor: 'pointer',
                background: activeTab === tab ? C.goldBg : 'transparent',
                color: activeTab === tab ? C.gold : C.gray,
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Search & filter */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '1.2rem' }}>
        <div style={{ flex: '1 1 260px', position: 'relative' }}>
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: C.gray }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari judul materi..."
            style={{
              width: '100%', padding: '10px 12px 10px 34px', borderRadius: '10px',
              border: `1.5px solid ${C.border}`, fontSize: '0.9rem', fontFamily: 'inherit', boxSizing: 'border-box',
            }}
          />
        </div>

        <select value={filterKelas} onChange={e => setFilterKelas(e.target.value)} style={selectStyle}>
          <option value="">Semua Kelas</option>
          {kelasList.map(k => <option key={k} value={k}>{k}</option>)}
        </select>

        <select
          value={filterMapel}
          onChange={e => { setFilterMapel(e.target.value); setFilterBab(''); }}
          style={selectStyle}
        >
          <option value="">Semua Mapel</option>
          {mapelOptionsFilter.map(m => <option key={m} value={m}>{m}</option>)}
        </select>

        <select value={filterBab} onChange={e => setFilterBab(e.target.value)} style={selectStyle}>
          <option value="">Semua Bab</option>
          {babOptionsForMapel.map(b => <option key={b.id} value={b.id}>{b.judul_bab}</option>)}
        </select>

        <button
          onClick={fetchMateri}
          style={{ ...selectStyle, display: 'flex', alignItems: 'center', gap: '6px', background: C.cream }}
        >
          ⏳ Filter
        </button>
      </div>

      {/* Tabel */}
      <div style={{ background: C.white, borderRadius: '14px', border: `1.5px solid ${C.border}`, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
          <thead>
            <tr style={{ background: C.cream, textAlign: 'left' }}>
              <th style={{ padding: '12px 16px', color: C.gray, fontWeight: 600 }}>Judul Materi</th>
              <th style={{ padding: '12px 16px', color: C.gray, fontWeight: 600 }}>Kelas</th>
              <th style={{ padding: '12px 16px', color: C.gray, fontWeight: 600 }}>Mapel</th>
              <th style={{ padding: '12px 16px', color: C.gray, fontWeight: 600 }}>Bab / Topik</th>
              <th style={{ padding: '12px 16px', color: C.gray, fontWeight: 600 }}>Sub Bab</th>
              <th style={{ padding: '12px 16px', color: C.gray, fontWeight: 600 }}>Tanggal Publish</th>
              <th style={{ padding: '12px 16px', color: C.gray, fontWeight: 600 }}>Status</th>
              <th style={{ padding: '12px 16px', color: C.gray, fontWeight: 600 }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={8} style={{ padding: '28px', textAlign: 'center', color: C.gray }}>Memuat materi...</td></tr>
            )}
            {!loading && errorMsg && (
              <tr><td colSpan={8} style={{ padding: '28px', textAlign: 'center', color: C.red }}>{errorMsg}</td></tr>
            )}
            {!loading && !errorMsg && materiList.length === 0 && (
              <tr><td colSpan={8} style={{ padding: '28px', textAlign: 'center', color: C.gray }}>Belum ada materi di kategori "{activeTab}".</td></tr>
            )}
            {!loading && !errorMsg && materiList.map(item => {
              const icon = fileIcon(item.tipe);
              const badge = STATUS_STYLE[item.status] || STATUS_STYLE.Draft;
              return (
                <tr key={item.id} style={{ borderTop: `1px solid ${C.border}` }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: `${icon.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>
                        {icon.emoji}
                      </div>
                      <div>
                        <div style={{ fontWeight: 'bold', color: C.dark }}>{item.nama}</div>
                        {item.deskripsi && (
                          <div style={{ color: C.gray, fontSize: '0.78rem', marginTop: '2px' }}>{item.deskripsi}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', color: C.dark }}>{item.kelas || '-'}</td>
                  <td style={{ padding: '12px 16px', color: C.dark }}>{item.bab_ajar?.mapel || '-'}</td>
                  <td style={{ padding: '12px 16px', color: C.dark }}>{item.bab_ajar?.judul_bab || '-'}</td>
                  <td style={{ padding: '12px 16px', color: C.dark }}>{item.sub_bab_ajar?.judul_sub_bab || '-'}</td>
                  <td style={{ padding: '12px 16px', color: C.gray }}>{formatTanggal(item.tanggal)}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '4px 12px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 'bold', background: badge.bg, color: badge.color }}>
                      {item.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <IconBtn title="Lihat file" color={C.blue} bg={C.blueBg} onClick={() => window.open(item.url, '_blank')}>👁️</IconBtn>
                      <IconBtn title="Edit" color={C.gold} bg={C.goldBg} onClick={() => setEditItem({ ...item })}>✏️</IconBtn>
                      <IconBtn
                        title={item.status === 'Diarsipkan' ? 'Pulihkan' : 'Arsipkan'}
                        color="#b45309" bg="rgba(180,83,9,0.10)"
                        onClick={() => handleArchiveToggle(item)}
                      >
                        {item.status === 'Diarsipkan' ? '📤' : '📦'}
                      </IconBtn>
                      <IconBtn title="Hapus" color={C.red} bg={C.redBg} onClick={() => setDeleteItem(item)}>🗑️</IconBtn>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      </div>

      {/* Kolom kanan: form unggah materi */}
      <div style={{ order: 2, width: '360px', flexShrink: 0, position: 'sticky', top: 0 }}>
        <TeacherUploadMateriModal
          userId={userId}
          onUploaded={(uploadedStatus) => {
            setActiveTab(uploadedStatus);
            fetchMateri();
          }}
        />
      </div>

      </div>

      {/* Modal Edit */}
      {editItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: C.white, borderRadius: '16px', padding: '1.6rem', width: '360px', maxWidth: '90vw' }}>
            <div style={{ fontWeight: 'bold', fontSize: '1.05rem', marginBottom: '1rem', color: C.dark }}>Edit Materi</div>

            <label style={{ fontSize: '0.8rem', color: C.gray }}>Judul Materi</label>
            <input
              value={editItem.nama || ''}
              onChange={e => setEditItem({ ...editItem, nama: e.target.value })}
              style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: `1.5px solid ${C.border}`, marginBottom: '10px', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />

            <label style={{ fontSize: '0.8rem', color: C.gray }}>Deskripsi</label>
            <textarea
              value={editItem.deskripsi || ''}
              onChange={e => setEditItem({ ...editItem, deskripsi: e.target.value })}
              rows={2}
              style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: `1.5px solid ${C.border}`, marginBottom: '10px', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' }}
            />

            <label style={{ fontSize: '0.8rem', color: C.gray }}>Kelas</label>
            <input
              value={editItem.kelas || ''}
              onChange={e => setEditItem({ ...editItem, kelas: e.target.value })}
              style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: `1.5px solid ${C.border}`, marginBottom: '10px', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />

            <label style={{ fontSize: '0.8rem', color: C.gray }}>Status</label>
            <select
              value={editItem.status}
              onChange={e => setEditItem({ ...editItem, status: e.target.value })}
              style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: `1.5px solid ${C.border}`, marginBottom: '16px', fontFamily: 'inherit' }}
            >
              {TABS.map(t => <option key={t} value={t}>{t}</option>)}
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: C.white, borderRadius: '16px', padding: '1.6rem', width: '340px', maxWidth: '90vw' }}>
            <div style={{ fontWeight: 'bold', fontSize: '1.05rem', marginBottom: '8px', color: C.dark }}>Hapus Materi?</div>
            <div style={{ color: C.gray, fontSize: '0.88rem', marginBottom: '18px' }}>
              "{deleteItem.nama}" akan dihapus permanen dan tidak bisa dikembalikan.
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteItem(null)} style={{ padding: '9px 16px', borderRadius: '9px', border: `1.5px solid ${C.border}`, background: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Batal</button>
              <button onClick={handleDelete} style={{ padding: '9px 16px', borderRadius: '9px', border: 'none', background: C.red, color: C.white, fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit' }}>Hapus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherArsipMateri;