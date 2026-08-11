import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { checkedUpdate } from '../../utils/supabaseUpdateGuard';
import Toast, { useToast } from '../shared/Toast';
import { C } from '../shared/Theme';

const MOBILE_BREAKPOINT = 768;

// Hook kecil untuk deteksi ukuran layar (mobile vs desktop)
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= MOBILE_BREAKPOINT : false
  );
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return isMobile;
};

const TABS = ['Dipublish', 'Draft', 'Diarsipkan'];

const STATUS_STYLE = {
  Dipublish: { bg: C.greenBg, color: C.green },
  Draft: { bg: C.grayBg, color: C.gray },
  Diarsipkan: { bg: C.goldBg, color: C.gold },
};

// Kategori sumber materi: milik pribadi guru, materi resmi sekolah tempat mengajar,
// atau materi yang lahir dari menjawab request siswa (kategori ini TIDAK dipilih manual
// oleh guru saat upload -- hanya diisi otomatis oleh alur "Kirim Materi" di TeacherHome.js
// saat guru menjawab request dengan mengunggah file baru, lalu langsung tersimpan di arsip ini).
const KATEGORI_OPTIONS = [
  { value: 'Pribadi', label: 'Pribadi' },
  { value: 'Sekolah', label: 'Sekolah yang Diajar' },
];
// Dipakai khusus untuk tab filter di halaman arsip (baca-saja, termasuk Request)
const KATEGORI_FILTER_OPTIONS = [
  ...KATEGORI_OPTIONS,
  { value: 'Request', label: 'Dari Request Siswa' },
];
const KATEGORI_STYLE = {
  Pribadi: { bg: C.grayBg, color: C.gray },
  Sekolah: { bg: C.greenBg, color: C.green },
  Request: { bg: C.blueBg, color: C.blue },
};
const KATEGORI_LABEL = {
  Pribadi: 'Pribadi',
  Sekolah: 'Sekolah',
  Request: 'Dari Request',
};

// Jenis materi khusus untuk kategori Sekolah
const JENIS_OPTIONS = ['Materi', 'Tugas', 'Penilaian Harian'];
const JENIS_STYLE = {
  Materi: { bg: C.blueBg, color: C.blue },
  Tugas: { bg: C.goldBg, color: C.gold },
  'Penilaian Harian': { bg: C.redBg, color: C.red },
};

// Bentuk unggahan: file yang diupload, atau tautan (link) eksternal
const BENTUK_OPTIONS = [
  { value: 'File', label: '📁 Unggah File' },
  { value: 'Link', label: '🔗 Tautan (Link)' },
];

const fileIcon = (tipe) => {
  const t = (tipe || '').toLowerCase();
  if (t === 'link') return { emoji: '🔗', label: 'LINK', color: C.blue };
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

const IconBtn = ({ title, color, bg, onClick, children, size = 30 }) => (
  <button
    title={title}
    onClick={onClick}
    style={{
      width: `${size}px`, height: `${size}px`, borderRadius: '8px', border: 'none',
      background: bg, color, display: 'flex', alignItems: 'center',
      justifyContent: 'center', cursor: 'pointer', fontSize: '0.9rem', flexShrink: 0,
    }}
  >
    {children}
  </button>
);

// Kontrol pilihan bergaya "segmented" (dipakai untuk Kategori & Bentuk unggahan)
const SegmentedControl = ({ options, value, onChange, disabled }) => (
  <div style={{ display: 'flex', gap: '6px', background: C.cream, padding: '4px', borderRadius: '10px', border: `1.5px solid ${C.border}` }}>
    {options.map(opt => (
      <button
        key={opt.value}
        type="button"
        disabled={disabled}
        onClick={() => onChange(opt.value)}
        style={{
          flex: 1, padding: '8px 10px', borderRadius: '7px', border: 'none',
          cursor: disabled ? 'default' : 'pointer', fontFamily: 'inherit', fontSize: '0.82rem',
          fontWeight: value === opt.value ? 'bold' : 'normal',
          background: value === opt.value ? C.white : 'transparent',
          color: value === opt.value ? C.dark : C.gray,
          boxShadow: value === opt.value ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
        }}
      >
        {opt.label}
      </button>
    ))}
  </div>
);

// Badge kecil untuk menampilkan kategori / jenis / folder pada kartu & tabel
const Badge = ({ label, style }) => (
  <span style={{ padding: '2px 9px', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 'bold', background: style.bg, color: style.color, whiteSpace: 'nowrap' }}>
    {label}
  </span>
);

// Kotak folder pada grid navigasi (pola sama seperti "Tugas Saya" di TeacherHomework:
// klik kotak untuk menyaring materi per folder, ada kotak putus-putus untuk folder baru)
const FolderTile = ({ icon, label, count, active, onClick, onDelete }) => (
  <div
    role="button"
    tabIndex={0}
    onClick={onClick}
    onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick();
      }
    }}
    style={{
      position: 'relative', display: 'flex', flexDirection: 'column', gap: '6px',
      borderRadius: '12px', border: `1.5px solid ${active ? C.gold : C.border}`,
      background: active ? C.goldBg : C.white, padding: '0.8rem', cursor: 'pointer',
      boxSizing: 'border-box',
    }}
  >
    {onDelete && (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        title={`Hapus folder ${label}`}
        style={{
          position: 'absolute', top: '4px', right: '4px', width: '22px', height: '22px',
          borderRadius: '6px', border: 'none', background: 'transparent', color: C.gray,
          cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        🗑️
      </button>
    )}
    <div style={{
      width: '34px', height: '34px', borderRadius: '9px', display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontSize: '1rem',
      background: active ? C.gold : C.cream, color: active ? C.white : C.gray,
    }}>
      {icon}
    </div>
    <div style={{ minWidth: 0 }}>
      <div
        style={{
          fontSize: '0.8rem', fontWeight: 'bold', color: active ? C.gold : C.dark,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}
        title={label}
      >
        {label}
      </div>
      <div style={{ fontSize: '0.7rem', color: C.gray }}>{count} materi</div>
    </div>
  </div>
);

// Modal untuk membuat folder baru dari grid folder (kategori mengikuti tab Pribadi/Sekolah yang aktif)
const NewMateriFolderModal = ({ kategori, creating, onCreate, onClose }) => {
  const [nama, setNama] = useState('');
  const [error, setError] = useState('');

  const submit = async () => {
    if (!nama.trim()) { setError('Nama folder wajib diisi.'); return; }
    setError('');
    try {
      await onCreate(nama.trim());
    } catch (err) {
      setError(err.message || 'Gagal membuat folder.');
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '1rem',
    }}>
      <div style={{ background: C.white, padding: '1.4rem', width: '320px', maxWidth: '100%', borderRadius: '16px', boxSizing: 'border-box' }}>
        <div style={{ fontWeight: 'bold', fontSize: '1.05rem', marginBottom: '4px', color: C.dark }}>Folder Baru</div>
        <div style={{ fontSize: '0.78rem', color: C.gray, marginBottom: '12px' }}>
          Folder akan dibuat untuk kategori "{KATEGORI_LABEL[kategori] || 'Pribadi'}".
        </div>
        <input
          autoFocus
          value={nama}
          onChange={e => setNama(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="Contoh: Bab 1 - Aljabar"
          style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: `1.5px solid ${C.border}`, boxSizing: 'border-box', fontFamily: 'inherit', fontSize: '16px' }}
        />
        {error && <div style={{ color: C.red, fontSize: '0.78rem', marginTop: '6px' }}>{error}</div>}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button onClick={onClose} style={{ padding: '9px 16px', borderRadius: '9px', border: `1.5px solid ${C.border}`, background: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
            Batal
          </button>
          <button
            onClick={submit}
            disabled={creating}
            style={{ padding: '9px 16px', borderRadius: '9px', border: 'none', background: C.gold, color: C.white, fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            {creating ? 'Membuat...' : 'Buat Folder'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Modal konfirmasi hapus folder
const DeleteFolderModal = ({ target, isMobile, onConfirm, onCancel }) => (
  <div style={{
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex',
    alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', zIndex: 200,
  }}>
    <div style={{
      background: C.white, padding: isMobile ? '1.3rem' : '1.6rem',
      width: isMobile ? '100%' : '340px', maxWidth: isMobile ? '100%' : '90vw',
      borderRadius: isMobile ? '18px 18px 0 0' : '16px', boxSizing: 'border-box',
    }}>
      <div style={{ fontWeight: 'bold', fontSize: '1.05rem', marginBottom: '8px', color: C.dark }}>Hapus Folder?</div>
      <div style={{ color: C.gray, fontSize: '0.88rem', marginBottom: '18px' }}>
        Folder "{target?.nama}" akan dihapus. Materi di dalamnya akan pindah ke "Tanpa Folder", bukan ikut terhapus.
      </div>
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <button onClick={onCancel} style={{ padding: '9px 16px', borderRadius: '9px', border: `1.5px solid ${C.border}`, background: 'none', cursor: 'pointer', fontFamily: 'inherit', flex: isMobile ? 1 : 'initial' }}>Batal</button>
        <button onClick={onConfirm} style={{ padding: '9px 16px', borderRadius: '9px', border: 'none', background: C.red, color: C.white, fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit', flex: isMobile ? 1 : 'initial' }}>Hapus</button>
      </div>
    </div>
  </div>
);

// Kartu materi untuk tampilan mobile (menggantikan baris tabel)
const MateriCard = ({ item, badge, icon, onView, onEdit, onArchive, onDelete }) => (
  <div style={{ background: C.white, border: `1.5px solid ${C.border}`, borderRadius: '14px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
      <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: `${icon.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>
        {icon.emoji}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 'bold', color: C.dark, fontSize: '0.95rem', wordBreak: 'break-word' }}>{item.nama}</div>
        {item.deskripsi && (
          <div style={{ color: C.gray, fontSize: '0.78rem', marginTop: '2px', wordBreak: 'break-word' }}>{item.deskripsi}</div>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '6px' }}>
          {item.kategori && <Badge label={KATEGORI_LABEL[item.kategori] || 'Pribadi'} style={KATEGORI_STYLE[item.kategori] || KATEGORI_STYLE.Pribadi} />}
          {item.jenis && <Badge label={item.jenis} style={JENIS_STYLE[item.jenis] || JENIS_STYLE.Materi} />}
          {item.folder_materi?.nama && <Badge label={`📂 ${item.folder_materi.nama}`} style={{ bg: C.grayBg, color: C.gray }} />}
        </div>
      </div>
      <span style={{ padding: '3px 10px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 'bold', background: badge.bg, color: badge.color, whiteSpace: 'nowrap', flexShrink: 0 }}>
        {item.status}
      </span>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: '6px', columnGap: '8px', fontSize: '0.82rem' }}>
      <div style={{ color: C.gray }}>Kelas</div>
      <div style={{ color: C.dark, textAlign: 'right' }}>{item.kelas || '-'}</div>

      <div style={{ color: C.gray }}>Mapel</div>
      <div style={{ color: C.dark, textAlign: 'right' }}>{item.mapel || '-'}</div>

      <div style={{ color: C.gray }}>Bab / Topik</div>
      <div style={{ color: C.dark, textAlign: 'right' }}>{item.bab || '-'}</div>

      {item.sub_bab && (
        <>
          <div style={{ color: C.gray }}>Sub Bab</div>
          <div style={{ color: C.dark, textAlign: 'right' }}>{item.sub_bab}</div>
        </>
      )}

      {item.kategori === 'Sekolah' && (
        <>
          <div style={{ color: C.gray }}>Pengajar</div>
          <div style={{ color: C.dark, textAlign: 'right' }}>{item.pengajar || '-'}</div>
        </>
      )}

      <div style={{ color: C.gray }}>Tanggal</div>
      <div style={{ color: C.dark, textAlign: 'right' }}>{formatTanggal(item.tanggal)}</div>
    </div>

    <div style={{ display: 'flex', gap: '8px', borderTop: `1px solid ${C.border}`, paddingTop: '10px', marginTop: '2px' }}>
      <IconBtn title="Lihat file" color={C.blue} bg={C.blueBg} onClick={onView} size={38}>👁️</IconBtn>
      <IconBtn title="Edit" color={C.gold} bg={C.goldBg} onClick={onEdit} size={38}>✏️</IconBtn>
      <IconBtn
        title={item.status === 'Diarsipkan' ? 'Pulihkan' : 'Arsipkan'}
        color="#b45309" bg="rgba(180,83,9,0.10)"
        onClick={onArchive}
        size={38}
      >
        {item.status === 'Diarsipkan' ? '📤' : '📦'}
      </IconBtn>
      <IconBtn title="Hapus" color={C.red} bg={C.redBg} onClick={onDelete} size={38}>🗑️</IconBtn>
    </div>
  </div>
);

/* ============================================================
   Sub-komponen: Form Unggah Materi
   (sebelumnya file terpisah TeacherUploadMateriModal.js,
   sekarang digabung ke dalam file ini)
   ============================================================ */

const uploadFieldLabel = { fontSize: '0.8rem', color: C.gray, display: 'block', marginBottom: '4px', marginTop: '10px' };
const uploadFieldInput = { width: '100%', padding: '10px 11px', borderRadius: '9px', border: `1.5px solid ${C.border}`, boxSizing: 'border-box', fontFamily: 'inherit', fontSize: '16px' };

const TeacherUploadMateriModal = ({ userId, onUploaded }) => {
  const [kelasList, setKelasList] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  // Kategori sumber materi: Pribadi atau Sekolah yang diajar
  const [kategori, setKategori] = useState('Pribadi');

  // Folder tempat materi dikelompokkan (spesifik per kategori)
  const [folderList, setFolderList] = useState([]);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [folderId, setFolderId] = useState('');
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [folderErrorMsg, setFolderErrorMsg] = useState('');

  // Mapel, Bab, Sub Bab sekarang input teks bebas (tidak lagi bergantung ke tabel bab_ajar)
  const [mapel, setMapel] = useState('');
  const [bab, setBab] = useState('');
  const [subBab, setSubBab] = useState('');
  // Riwayat mapel/bab yang pernah diketik guru ini, dipakai sebagai saran datalist saja
  const [mapelHistory, setMapelHistory] = useState([]);
  const [babHistory, setBabHistory] = useState([]);

  const [kelas, setKelas] = useState('');
  const [judul, setJudul] = useState('');
  const [deskripsi, setDeskripsi] = useState('');

  // Bentuk materi: unggah File atau tautan Link
  const [bentuk, setBentuk] = useState('File');
  const [file, setFile] = useState(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [link, setLink] = useState('');

  // Field khusus kategori Sekolah
  const [pengajar, setPengajar] = useState('');
  const [jenis, setJenis] = useState('Materi');

  const [namaGuru, setNamaGuru] = useState('');

  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const loadData = async () => {
      if (!userId) return;
      setLoadingOptions(true);

      const [{ data: profile }, { data: guruRow }, { data: riwayatMateri }] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('id', userId).single(),
        supabase.from('guru').select('id').eq('profile_id', userId).single(),
        supabase.from('materi_file').select('mapel, bab').eq('user_id', userId),
      ]);

      setNamaGuru(profile?.full_name || '');
      setPengajar(profile?.full_name || '');
      setMapelHistory(Array.from(new Set((riwayatMateri || []).map(r => r.mapel).filter(Boolean))).sort());
      setBabHistory(Array.from(new Set((riwayatMateri || []).map(r => r.bab).filter(Boolean))).sort());

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

  // Muat ulang daftar folder setiap kali kategori (Pribadi/Sekolah) berganti
  const loadFolders = useCallback(async (kat) => {
    if (!userId) return;
    setLoadingFolders(true);
    const { data, error } = await supabase
      .from('folder_materi')
      .select('id, nama')
      .eq('user_id', userId)
      .eq('kategori', kat)
      .order('nama', { ascending: true });
    if (!error) setFolderList(data || []);
    setLoadingFolders(false);
  }, [userId]);


  useEffect(() => {
    setFolderId('');
    setShowNewFolderInput(false);
    setNewFolderName('');
    setFolderErrorMsg('');
    loadFolders(kategori);
  }, [kategori, loadFolders]);

  const handleCreateFolder = async () => {
    setFolderErrorMsg('');
    if (!newFolderName.trim()) {
      setFolderErrorMsg('Nama folder wajib diisi.');
      return;
    }
    setCreatingFolder(true);
    try {
      const { data, error } = await supabase
        .from('folder_materi')
        .insert({ user_id: userId, nama: newFolderName.trim(), kategori })
        .select('id, nama')
        .single();
      if (error) throw error;
      setFolderList(prev => [...prev, data].sort((a, b) => a.nama.localeCompare(b.nama)));
      setFolderId(data.id);
      setNewFolderName('');
      setShowNewFolderInput(false);
    } catch (err) {
      console.error(err);
      setFolderErrorMsg('Gagal membuat folder: ' + err.message);
    } finally {
      setCreatingFolder(false);
    }
  };

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
    if (!mapel.trim()) return setErrorMsg('Isi Mapel.');
    if (!bab.trim()) return setErrorMsg('Isi Bab / Topik.');
    if (!kelas) return setErrorMsg('Pilih Kelas.');
    if (kategori === 'Sekolah' && !pengajar.trim()) return setErrorMsg('Isi nama pengajar materi ini.');
    if (bentuk === 'File' && !file) return setErrorMsg('Pilih file untuk diunggah.');
    if (bentuk === 'Link' && !link.trim()) return setErrorMsg('Isi tautan (link) materi.');

    setUploading(true);
    try {
      let finalUrl = '';
      let tipe = 'link';

      if (bentuk === 'File') {
        const safeName = file.name.replace(/\s+/g, '_');
        const path = `${userId}/${Date.now()}_${safeName}`;
        const { error: uploadError } = await supabase.storage.from('materi').upload(path, file);
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from('materi').getPublicUrl(path);
        finalUrl = publicUrlData.publicUrl;
        tipe = file.type || safeName.split('.').pop();
      } else {
        finalUrl = link.trim();
      }

      const { error: insertError } = await supabase.from('materi_file').insert({
        mapel: mapel.trim(),
        bab: bab.trim(),
        sub_bab: subBab.trim() || null,
        user_id: userId,
        nama: judul.trim(),
        tipe,
        diupload_oleh: namaGuru,
        tanggal: new Date().toISOString(),
        url: finalUrl,
        kelas,
        deskripsi: deskripsi.trim() || null,
        status: 'Dipublish',
        kategori,
        folder_id: folderId || null,
        bentuk,
        pengajar: kategori === 'Sekolah' ? pengajar.trim() : null,
        jenis: kategori === 'Sekolah' ? jenis : null,
      });
      if (insertError) throw insertError;

      // Reset field yang biasanya beda tiap materi, biarkan Kategori/Folder/Kelas/
      // Mapel/Bab tetap terisi supaya guru bisa langsung unggah beberapa
      // materi berikutnya untuk folder & bab yang sama tanpa mengisi ulang dari awal.
      setJudul('');
      setDeskripsi('');
      setFile(null);
      setFileInputKey(k => k + 1);
      setLink('');
      setSuccessMsg('Materi berhasil diunggah.');
      setMapelHistory(prev => Array.from(new Set([...prev, mapel.trim()])).sort());
      setBabHistory(prev => Array.from(new Set([...prev, bab.trim()])).sort());

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
            <label style={uploadFieldLabel}>Kategori Materi</label>
            <SegmentedControl options={KATEGORI_OPTIONS} value={kategori} onChange={setKategori} />

            <label style={uploadFieldLabel}>Folder</label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <select
                style={{ ...uploadFieldInput, flex: 1 }}
                value={folderId}
                onChange={e => setFolderId(e.target.value)}
                disabled={loadingFolders}
              >
                <option value="">Tanpa folder (Umum)</option>
                {folderList.map(f => <option key={f.id} value={f.id}>{f.nama}</option>)}
              </select>
              <button
                type="button"
                onClick={() => setShowNewFolderInput(s => !s)}
                style={{ padding: '0 14px', borderRadius: '9px', border: `1.5px solid ${C.border}`, background: showNewFolderInput ? C.goldBg : C.white, color: C.gold, fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
              >
                + Folder
              </button>
            </div>
            {loadingFolders && <div style={{ fontSize: '0.75rem', color: C.gray, marginTop: '4px' }}>Memuat folder...</div>}
            {showNewFolderInput && (
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                <input
                  style={{ ...uploadFieldInput, flex: 1 }}
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  placeholder={`Nama folder ${kategori === 'Sekolah' ? 'sekolah' : 'pribadi'} baru...`}
                />
                <button
                  type="button"
                  onClick={handleCreateFolder}
                  disabled={creatingFolder}
                  style={{ padding: '0 14px', borderRadius: '9px', border: 'none', background: C.gold, color: C.white, fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
                >
                  {creatingFolder ? '...' : 'Buat'}
                </button>
              </div>
            )}
            {folderErrorMsg && <div style={{ color: C.red, fontSize: '0.78rem', marginTop: '4px' }}>{folderErrorMsg}</div>}

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
            <input
              style={uploadFieldInput}
              value={mapel}
              onChange={e => setMapel(e.target.value)}
              placeholder="Misal: Matematika"
              list="mapel-history-list"
            />
            <datalist id="mapel-history-list">
              {mapelHistory.map(m => <option key={m} value={m} />)}
            </datalist>

            <label style={uploadFieldLabel}>Bab / Topik</label>
            <input
              style={uploadFieldInput}
              value={bab}
              onChange={e => setBab(e.target.value)}
              placeholder="Misal: Persamaan Kuadrat"
              list="bab-history-list"
            />
            <datalist id="bab-history-list">
              {babHistory.map(b => <option key={b} value={b} />)}
            </datalist>

            <label style={uploadFieldLabel}>Sub Bab (opsional)</label>
            <input
              style={uploadFieldInput}
              value={subBab}
              onChange={e => setSubBab(e.target.value)}
              placeholder="Misal: Rumus ABC"
            />

            {kategori === 'Sekolah' && (
              <>
                <label style={uploadFieldLabel}>Pengajar Materi Ini</label>
                <input style={uploadFieldInput} value={pengajar} onChange={e => setPengajar(e.target.value)} placeholder="Nama guru pengajar materi" />

                <label style={uploadFieldLabel}>Jenis</label>
                <select style={uploadFieldInput} value={jenis} onChange={e => setJenis(e.target.value)}>
                  {JENIS_OPTIONS.map(j => <option key={j} value={j}>{j}</option>)}
                </select>
              </>
            )}

            <label style={uploadFieldLabel}>Bentuk</label>
            <SegmentedControl options={BENTUK_OPTIONS} value={bentuk} onChange={setBentuk} />

            {bentuk === 'File' ? (
              <>
                <label style={uploadFieldLabel}>File Materi</label>
                <input key={fileInputKey} type="file" onChange={handleFileChange} style={{ width: '100%', fontSize: '0.85rem' }} />
              </>
            ) : (
              <>
                <label style={uploadFieldLabel}>Tautan (Link)</label>
                <input style={uploadFieldInput} value={link} onChange={e => setLink(e.target.value)} placeholder="https://..." />
              </>
            )}

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
  const isMobile = useIsMobile();
  const [userId, setUserId] = useState(null);
  const { toast, showToast } = useToast();
  const [activeTab, setActiveTab] = useState('Dipublish');
  const [search, setSearch] = useState('');
  // Kategori sumber materi yang sedang ditampilkan (folder tersimpan terpisah per kategori)
  const [filterKategori, setFilterKategori] = useState('Pribadi');
  // Folder yang sedang aktif dipilih pada grid folder: "all" | "none" | id folder_materi
  const [activeFolderId, setActiveFolderId] = useState('all');

  const [folderOptions, setFolderOptions] = useState([]);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState(null); // { id, nama }

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

  // ambil seluruh folder milik guru ini (semua kategori) untuk opsi filter
  useEffect(() => {
    if (!userId) return;
    const loadFolderOptions = async () => {
      const { data } = await supabase
        .from('folder_materi')
        .select('id, nama, kategori')
        .eq('user_id', userId)
        .order('nama', { ascending: true });
      setFolderOptions(data || []);
    };
    loadFolderOptions();
  }, [userId]);

  // PENTING — soal visibilitas file: query di bawah ini sudah dibatasi
  // `.eq('user_id', userId)`, jadi setiap guru hanya mengambil materi yang ia
  // unggah sendiri. Supaya ini benar-benar tertutup di sisi server (bukan
  // hanya di client), pastikan tabel `materi_file` punya RLS policy sejenis:
  //   create policy "guru lihat materi sendiri" on materi_file
  //     for select using (auth.uid() = user_id or is_admin(auth.uid()));
  // begitu juga bucket storage 'materi' — akses publicUrl memang terbuka,
  // tapi listing/insert/delete tetap harus dibatasi ke pemilik + admin.
  const fetchMateri = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setErrorMsg('');
    try {
      let query = supabase
        .from('materi_file')
        .select('id, nama, tipe, tanggal, url, kelas, status, deskripsi, mapel, bab, sub_bab, kategori, folder_id, bentuk, pengajar, jenis, folder_materi ( id, nama )')
        .eq('user_id', userId)
        .eq('status', activeTab)
        .eq('kategori', filterKategori)
        .order('tanggal', { ascending: false });

      if (search.trim()) query = query.ilike('nama', `%${search.trim()}%`);

      const { data, error } = await query;
      if (error) throw error;

      setMateriList(data || []);
    } catch (err) {
      console.error(err);
      setErrorMsg('Gagal memuat materi. Coba muat ulang halaman.');
    } finally {
      setLoading(false);
    }
  }, [userId, activeTab, filterKategori, search]);

  useEffect(() => { fetchMateri(); }, [fetchMateri]);

  // Ganti kategori atau tab publish/draft/arsip -> kembali ke "Semua Materi"
  // supaya tidak nyangkut di folder yang mungkin tidak relevan lagi.
  useEffect(() => { setActiveFolderId('all'); }, [filterKategori, activeTab]);

  // Materi yang benar-benar ditampilkan, disaring lagi berdasarkan folder yang
  // aktif dipilih pada grid folder (mirip pola client-side filtering di
  // Dashboard TeacherHomework).
  const displayedMateri = materiList.filter(item => {
    if (activeFolderId === 'all') return true;
    if (activeFolderId === 'none') return !item.folder_id;
    return item.folder_id === activeFolderId;
  });

  // Folder milik kategori yang sedang aktif saja (folder Pribadi & Sekolah terpisah)
  const foldersForKategori = folderOptions.filter(f => f.kategori === filterKategori);
  const countInFolder = (folderId) => materiList.filter(m => m.folder_id === folderId).length;
  const countNoFolder = materiList.filter(m => !m.folder_id).length;

  const handleCreateFolder = async (nama) => {
    setCreatingFolder(true);
    try {
      const { data, error } = await supabase
        .from('folder_materi')
        .insert({ user_id: userId, nama, kategori: filterKategori })
        .select('id, nama, kategori')
        .single();
      if (error) throw error;
      setFolderOptions(prev => [...prev, data].sort((a, b) => a.nama.localeCompare(b.nama)));
      setShowNewFolderModal(false);
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleDeleteFolder = async () => {
    if (!deleteFolderTarget) return;
    try {
      const { error } = await supabase.from('folder_materi').delete().eq('id', deleteFolderTarget.id);
      if (error) throw error;
      setFolderOptions(prev => prev.filter(f => f.id !== deleteFolderTarget.id));
      if (activeFolderId === deleteFolderTarget.id) setActiveFolderId('all');
      // Materi yang tadinya ada di folder ini otomatis lepas ke "Tanpa Folder"
      // kalau FK folder_id sudah ON DELETE SET NULL; samakan juga di state
      // lokal supaya langsung terlihat tanpa fetch ulang.
      setMateriList(prev => prev.map(m => (m.folder_id === deleteFolderTarget.id ? { ...m, folder_id: null, folder_materi: null } : m)));
      setDeleteFolderTarget(null);
    } catch (err) {
      showToast('error', 'Gagal menghapus folder: ' + err.message);
    }
  };


  const handleArchiveToggle = async (item) => {
    const nextStatus = item.status === 'Diarsipkan' ? 'Dipublish' : 'Diarsipkan';
    const { error } = await checkedUpdate(
      supabase
        .from('materi_file')
        .update({ status: nextStatus })
        .eq('id', item.id)
    );
    if (error) { showToast('error', 'Gagal mengubah status: ' + error.message); return; }
    fetchMateri();
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    const { error } = await supabase.from('materi_file').delete().eq('id', deleteItem.id);
    if (error) { showToast('error', 'Gagal menghapus: ' + error.message); return; }
    setDeleteItem(null);
    fetchMateri();
  };

  const handleSaveEdit = async () => {
    if (!editItem) return;
    setSavingEdit(true);
    const { error } = await checkedUpdate(
      supabase
        .from('materi_file')
        .update({
          nama: editItem.nama,
          deskripsi: editItem.deskripsi,
          kelas: editItem.kelas,
          mapel: editItem.mapel,
          bab: editItem.bab,
          sub_bab: editItem.sub_bab || null,
          status: editItem.status,
          folder_id: editItem.folder_id || null,
          pengajar: editItem.kategori === 'Sekolah' ? (editItem.pengajar || null) : null,
          jenis: editItem.kategori === 'Sekolah' ? (editItem.jenis || null) : null,
        })
        .eq('id', editItem.id)
    );
    setSavingEdit(false);
    if (error) { showToast('error', 'Gagal menyimpan: ' + error.message); return; }
    setEditItem(null);
    fetchMateri();
  };

  return (
    <div style={{ fontFamily: 'inherit' }}>
      <Toast toast={toast} />
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '16px' : '24px', alignItems: 'flex-start', flexWrap: 'wrap' }}>

      {/* Kolom kiri: tabs, filter, tabel/kartu */}
      <div style={{ order: 1, flex: isMobile ? '1 1 100%' : '1 1 560px', minWidth: 0, width: isMobile ? '100%' : 'auto', boxSizing: 'border-box' }}>

      {/* Kategori sumber materi — menentukan set folder mana yang ditampilkan di grid.
          Pakai KATEGORI_FILTER_OPTIONS (termasuk "Request") karena ini cuma untuk menyaring
          tampilan, bukan untuk memilih kategori saat upload manual. */}
      <div style={{ marginBottom: '0.9rem' }}>
        <SegmentedControl
          options={KATEGORI_FILTER_OPTIONS}
          value={filterKategori}
          onChange={setFilterKategori}
        />
      </div>

      {/* Pencarian judul materi */}
      <div style={{ position: 'relative', marginBottom: '1rem' }}>
        <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: C.gray }}>🔍</span>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cari judul materi..."
          style={{
            width: '100%', padding: '10px 12px 10px 34px', borderRadius: '10px',
            border: `1.5px solid ${C.border}`, fontSize: '16px', fontFamily: 'inherit', boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Grid folder (gaya sama seperti "Tugas Saya"): klik kotak untuk menyaring materi per folder */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: '10px', marginBottom: '1.2rem',
      }}>
        <FolderTile
          icon="📋"
          label="Semua Materi"
          count={materiList.length}
          active={activeFolderId === 'all'}
          onClick={() => setActiveFolderId('all')}
        />
        <FolderTile
          icon="📄"
          label="Tanpa Folder"
          count={countNoFolder}
          active={activeFolderId === 'none'}
          onClick={() => setActiveFolderId('none')}
        />
        {foldersForKategori.map(f => (
          <FolderTile
            key={f.id}
            icon="📂"
            label={f.nama}
            count={countInFolder(f.id)}
            active={activeFolderId === f.id}
            onClick={() => setActiveFolderId(f.id)}
            onDelete={() => setDeleteFolderTarget(f)}
          />
        ))}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setShowNewFolderModal(true)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowNewFolderModal(true); } }}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px',
            borderRadius: '12px', border: `1.5px dashed ${C.border}`, color: C.gray, padding: '0.8rem',
            cursor: 'pointer', boxSizing: 'border-box',
          }}
        >
          <span style={{ fontSize: '1rem' }}>➕</span>
          <span style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Folder Baru</span>
        </div>
      </div>

      {/* Tabel (desktop) / Kartu (mobile) */}
      {loading ? (
        <div style={{ background: C.white, borderRadius: '14px', border: `1.5px solid ${C.border}`, padding: '28px', textAlign: 'center', color: C.gray }}>
          Memuat materi...
        </div>
      ) : errorMsg ? (
        <div style={{ background: C.white, borderRadius: '14px', border: `1.5px solid ${C.border}`, padding: '28px', textAlign: 'center', color: C.red }}>
          {errorMsg}
        </div>
      ) : displayedMateri.length === 0 ? (
        <div style={{ background: C.white, borderRadius: '14px', border: `1.5px solid ${C.border}`, padding: '28px', textAlign: 'center', color: C.gray }}>
          Belum ada materi di sini untuk status "{activeTab}".
        </div>
      ) : isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {displayedMateri.map(item => {
            const icon = fileIcon(item.tipe);
            const badge = STATUS_STYLE[item.status] || STATUS_STYLE.Draft;
            return (
              <MateriCard
                key={item.id}
                item={item}
                icon={icon}
                badge={badge}
                onView={() => window.open(item.url, '_blank')}
                onEdit={() => setEditItem({ ...item })}
                onArchive={() => handleArchiveToggle(item)}
                onDelete={() => setDeleteItem(item)}
              />
            );
          })}
        </div>
      ) : (
        <div style={{ background: C.white, borderRadius: '14px', border: `1.5px solid ${C.border}`, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ background: C.cream, textAlign: 'left' }}>
                <th style={{ padding: '12px 16px', color: C.gray, fontWeight: 600 }}>Judul Materi</th>
                <th style={{ padding: '12px 16px', color: C.gray, fontWeight: 600 }}>Kategori</th>
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
              {displayedMateri.map(item => {
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
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                        <Badge label={KATEGORI_LABEL[item.kategori] || 'Pribadi'} style={KATEGORI_STYLE[item.kategori] || KATEGORI_STYLE.Pribadi} />
                        {item.jenis && <Badge label={item.jenis} style={JENIS_STYLE[item.jenis] || JENIS_STYLE.Materi} />}
                        {item.folder_materi?.nama && (
                          <span style={{ fontSize: '0.72rem', color: C.gray }}>📂 {item.folder_materi.nama}</span>
                        )}
                        {item.kategori === 'Sekolah' && item.pengajar && (
                          <span style={{ fontSize: '0.72rem', color: C.gray }}>Pengajar: {item.pengajar}</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', color: C.dark }}>{item.kelas || '-'}</td>
                    <td style={{ padding: '12px 16px', color: C.dark }}>{item.mapel || '-'}</td>
                    <td style={{ padding: '12px 16px', color: C.dark }}>{item.bab || '-'}</td>
                    <td style={{ padding: '12px 16px', color: C.dark }}>{item.sub_bab || '-'}</td>
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
      )}

      </div>

      {/* Kolom kanan: form unggah materi */}
      <div style={{ order: 2, width: isMobile ? '100%' : '360px', flexShrink: 0, position: isMobile ? 'static' : 'sticky', top: 0, boxSizing: 'border-box' }}>
        <TeacherUploadMateriModal
          userId={userId}
          onUploaded={(uploadedStatus) => {
            setActiveTab(uploadedStatus);
            fetchMateri();
          }}
        />
      </div>

      </div>

      {/* Modal Folder Baru (dari grid folder) */}
      {showNewFolderModal && (
        <NewMateriFolderModal
          kategori={filterKategori}
          creating={creatingFolder}
          onCreate={handleCreateFolder}
          onClose={() => setShowNewFolderModal(false)}
        />
      )}

      {/* Modal Konfirmasi Hapus Folder */}
      {deleteFolderTarget && (
        <DeleteFolderModal
          target={deleteFolderTarget}
          isMobile={isMobile}
          onConfirm={handleDeleteFolder}
          onCancel={() => setDeleteFolderTarget(null)}
        />
      )}

      {/* Modal Edit */}
      {editItem && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex',
          alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', zIndex: 200,
        }}>
          <div style={{
            background: C.white, padding: isMobile ? '1.3rem' : '1.6rem',
            width: isMobile ? '100%' : '360px', maxWidth: isMobile ? '100%' : '90vw',
            borderRadius: isMobile ? '18px 18px 0 0' : '16px',
            maxHeight: '88vh', overflowY: 'auto', boxSizing: 'border-box',
          }}>
            <div style={{ fontWeight: 'bold', fontSize: '1.05rem', marginBottom: '1rem', color: C.dark }}>Edit Materi</div>

            <label style={{ fontSize: '0.8rem', color: C.gray }}>Kategori</label>
            <div style={{ marginBottom: '10px' }}>
              <Badge label={KATEGORI_LABEL[editItem.kategori] || 'Pribadi'} style={KATEGORI_STYLE[editItem.kategori] || KATEGORI_STYLE.Pribadi} />
            </div>

            <label style={{ fontSize: '0.8rem', color: C.gray }}>Folder</label>
            <select
              value={editItem.folder_id || ''}
              onChange={e => setEditItem({ ...editItem, folder_id: e.target.value || null })}
              style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: `1.5px solid ${C.border}`, marginBottom: '10px', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: '16px' }}
            >
              <option value="">Tanpa folder (Umum)</option>
              {folderOptions.filter(f => f.kategori === editItem.kategori).map(f => (
                <option key={f.id} value={f.id}>{f.nama}</option>
              ))}
            </select>

            {editItem.kategori === 'Sekolah' && (
              <>
                <label style={{ fontSize: '0.8rem', color: C.gray }}>Pengajar Materi Ini</label>
                <input
                  value={editItem.pengajar || ''}
                  onChange={e => setEditItem({ ...editItem, pengajar: e.target.value })}
                  style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: `1.5px solid ${C.border}`, marginBottom: '10px', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: '16px' }}
                />

                <label style={{ fontSize: '0.8rem', color: C.gray }}>Jenis</label>
                <select
                  value={editItem.jenis || 'Materi'}
                  onChange={e => setEditItem({ ...editItem, jenis: e.target.value })}
                  style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: `1.5px solid ${C.border}`, marginBottom: '10px', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: '16px' }}
                >
                  {JENIS_OPTIONS.map(j => <option key={j} value={j}>{j}</option>)}
                </select>
              </>
            )}

            <label style={{ fontSize: '0.8rem', color: C.gray }}>Judul Materi</label>
            <input
              value={editItem.nama || ''}
              onChange={e => setEditItem({ ...editItem, nama: e.target.value })}
              style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: `1.5px solid ${C.border}`, marginBottom: '10px', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: '16px' }}
            />

            <label style={{ fontSize: '0.8rem', color: C.gray }}>Deskripsi</label>
            <textarea
              value={editItem.deskripsi || ''}
              onChange={e => setEditItem({ ...editItem, deskripsi: e.target.value })}
              rows={2}
              style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: `1.5px solid ${C.border}`, marginBottom: '10px', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: '16px', resize: 'vertical' }}
            />

            <label style={{ fontSize: '0.8rem', color: C.gray }}>Kelas</label>
            <input
              value={editItem.kelas || ''}
              onChange={e => setEditItem({ ...editItem, kelas: e.target.value })}
              style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: `1.5px solid ${C.border}`, marginBottom: '10px', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: '16px' }}
            />

            <label style={{ fontSize: '0.8rem', color: C.gray }}>Mapel</label>
            <input
              value={editItem.mapel || ''}
              onChange={e => setEditItem({ ...editItem, mapel: e.target.value })}
              style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: `1.5px solid ${C.border}`, marginBottom: '10px', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: '16px' }}
            />

            <label style={{ fontSize: '0.8rem', color: C.gray }}>Bab / Topik</label>
            <input
              value={editItem.bab || ''}
              onChange={e => setEditItem({ ...editItem, bab: e.target.value })}
              style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: `1.5px solid ${C.border}`, marginBottom: '10px', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: '16px' }}
            />

            <label style={{ fontSize: '0.8rem', color: C.gray }}>Sub Bab (opsional)</label>
            <input
              value={editItem.sub_bab || ''}
              onChange={e => setEditItem({ ...editItem, sub_bab: e.target.value })}
              style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: `1.5px solid ${C.border}`, marginBottom: '10px', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: '16px' }}
            />

            <label style={{ fontSize: '0.8rem', color: C.gray }}>Status</label>
            <select
              value={editItem.status}
              onChange={e => setEditItem({ ...editItem, status: e.target.value })}
              style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: `1.5px solid ${C.border}`, marginBottom: '16px', fontFamily: 'inherit', fontSize: '16px', boxSizing: 'border-box' }}
            >
              {TABS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setEditItem(null)} style={{ padding: '9px 16px', borderRadius: '9px', border: `1.5px solid ${C.border}`, background: 'none', cursor: 'pointer', fontFamily: 'inherit', flex: isMobile ? 1 : 'initial' }}>Batal</button>
              <button
                onClick={handleSaveEdit}
                disabled={savingEdit}
                style={{ padding: '9px 16px', borderRadius: '9px', border: 'none', background: C.gold, color: C.white, fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit', flex: isMobile ? 1 : 'initial' }}
              >
                {savingEdit ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus */}
      {deleteItem && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex',
          alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', zIndex: 200,
        }}>
          <div style={{
            background: C.white, padding: isMobile ? '1.3rem' : '1.6rem',
            width: isMobile ? '100%' : '340px', maxWidth: isMobile ? '100%' : '90vw',
            borderRadius: isMobile ? '18px 18px 0 0' : '16px', boxSizing: 'border-box',
          }}>
            <div style={{ fontWeight: 'bold', fontSize: '1.05rem', marginBottom: '8px', color: C.dark }}>Hapus Materi?</div>
            <div style={{ color: C.gray, fontSize: '0.88rem', marginBottom: '18px' }}>
              "{deleteItem.nama}" akan dihapus permanen dan tidak bisa dikembalikan.
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteItem(null)} style={{ padding: '9px 16px', borderRadius: '9px', border: `1.5px solid ${C.border}`, background: 'none', cursor: 'pointer', fontFamily: 'inherit', flex: isMobile ? 1 : 'initial' }}>Batal</button>
              <button onClick={handleDelete} style={{ padding: '9px 16px', borderRadius: '9px', border: 'none', background: C.red, color: C.white, fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit', flex: isMobile ? 1 : 'initial' }}>Hapus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherArsipMateri;