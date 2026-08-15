// FolderShared.js
// Gabungan StudentArsip.js + StudentMateri.js menjadi satu halaman "Folder Share":
//   Tab 1 - Materi Dipelajari : daftar pertemuan & file materi dari guru (dari StudentMateri)
//   Tab 2 - Request Materi    : ajukan & lihat status request materi ke guru (dari StudentMateri)
//   Tab 3 - Upload Arsip      : upload materi sekolah / hasil tugas / penilaian + riwayatnya (dari StudentArsip)
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { useIsMobile, TOUCH_TARGET } from '../shared/shared';

// ─── Konfigurasi Arsip (tab Upload) ───────────────────────────────────────────
const TABLE_ARSIP = 'bank_soal_siswa';
const BUCKET_ARSIP = 'bank-soal';
const MAX_SIZE_MB = 10;
// Kategori upload: materi dari sekolah, hasil penugasan, atau penilaian.
const jenisOptions = ['Materi Sekolah', 'Tugas', 'Penilaian'];

// ─── Palet warna (dark theme, sama seperti StudentMateri) ────────────────────
const C = {
  bg:        '#121110',
  bgAlt:     '#17130f',
  card:      '#1c1815',
  cardAlt:   '#211c17',
  border:    'rgba(255,255,255,0.08)',
  borderSoft:'rgba(255,255,255,0.05)',
  text:      '#f3f1ea',
  textDim:   '#a9a297',
  textFaint: '#7a746a',
  gold:      '#c9a860',
  goldBg:    'rgba(201,168,96,0.12)',
  goldBorder:'rgba(201,168,96,0.35)',
  green:     '#3fae7a',
  greenBg:   'rgba(63,174,122,0.14)',
  red:       '#e0685c',
  redBg:     'rgba(224,104,92,0.14)',
  blue:      '#5b9bf0',
  blueBg:    'rgba(91,155,240,0.14)',
  purple:    '#a685e0',
  purpleBg:  'rgba(166,133,224,0.14)',
};

const MAPEL_ACCENT = ['#c9a860', '#5b9bf0', '#3fae7a', '#e0685c', '#a685e0', '#f0b45b'];
const mapelColor = (nama) => {
  if (!nama) return C.textFaint;
  let h = 0;
  for (let i = 0; i < nama.length; i++) h = nama.charCodeAt(i) + ((h << 5) - h);
  return MAPEL_ACCENT[Math.abs(h) % MAPEL_ACCENT.length];
};

// Warna pill per kategori upload arsip
const jenisStyle = (jenis) => {
  if (jenis === 'Materi Sekolah') return { bg: C.blueBg, fg: C.blue };
  if (jenis === 'Penilaian') return { bg: C.redBg, fg: C.red };
  return { bg: C.goldBg, fg: C.gold }; // Tugas (default)
};

// ─── Helper tanggal & waktu ───────────────────────────────────────────────────
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const BULAN_PENDEK = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

const dateKey = (iso) => (iso ? String(iso).slice(0, 10) : '');

const formatTanggalPanjang = (iso) => {
  if (!iso) return '-';
  const d = new Date(`${dateKey(iso)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '-';
  return `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
};

const formatTanggalSingkat = (iso) => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatWaktuUpload = (iso) => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${d.getDate()} ${BULAN_PENDEK[d.getMonth()]} ${d.getFullYear()}, ${hh}.${mm}`;
};

const formatUkuran = (bytes) => {
  if (!bytes && bytes !== 0) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const sanitizeFileName = (name = '') => name.replace(/[^a-zA-Z0-9._-]/g, '_');

// ─── Icon & warna per tipe file ───────────────────────────────────────────────
const fileTypeInfo = (tipe) => {
  const t = (tipe || '').toLowerCase();
  if (t.includes('pdf')) return { label: 'PDF', color: C.red, bg: C.redBg, icon: '📄' };
  if (t.includes('ppt') || t.includes('presentation')) return { label: 'PPT', color: '#e0a15c', bg: 'rgba(224,161,92,0.14)', icon: '📊' };
  if (t.includes('doc') || t.includes('word')) return { label: 'DOC', color: C.blue, bg: C.blueBg, icon: '📝' };
  if (t.includes('xls') || t.includes('sheet')) return { label: 'XLS', color: C.green, bg: C.greenBg, icon: '📗' };
  if (t.includes('png') || t.includes('jpg') || t.includes('jpeg') || t.includes('image')) return { label: 'IMG', color: C.purple, bg: C.purpleBg, icon: '🖼️' };
  return { label: (tipe || 'FILE').toUpperCase().slice(0, 4), color: C.textDim, bg: 'rgba(255,255,255,0.06)', icon: '📎' };
};

// Ekstensi file dari URL -> tipe generik yang dikenali fileTypeInfo di atas
const fileTypeFromUrl = (url = '') => {
  const ext = url.toLowerCase().split('.').pop();
  if (ext === 'pdf') return 'pdf';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image';
  if (['doc', 'docx'].includes(ext)) return 'doc';
  if (['xls', 'xlsx'].includes(ext)) return 'xls';
  if (['ppt', 'pptx'].includes(ext)) return 'ppt';
  return 'file';
};

// ─── Badge status materi_request ─────────────────────────────────────────────
const requestStatusBadge = (status) => {
  if (status === 'selesai') return { label: 'Selesai', emoji: '✅', bg: C.greenBg, color: C.green };
  if (status === 'ditolak') return { label: 'Ditolak', emoji: '❌', bg: C.redBg, color: C.red };
  return { label: 'Menunggu', emoji: '⏳', bg: C.goldBg, color: C.gold };
};

// ─── Komponen kecil ───────────────────────────────────────────────────────────
const Card = ({ children, style = {} }) => (
  <div style={{
    background: C.card, borderRadius: '18px',
    border: `1px solid ${C.border}`, padding: '1.1rem',
    ...style
  }}>
    {children}
  </div>
);

const Pill = ({ children, bg, color, style = {} }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    padding: '3px 11px', borderRadius: '999px', fontSize: '0.74rem',
    fontWeight: 700, background: bg, color, whiteSpace: 'nowrap', ...style
  }}>
    {children}
  </span>
);

const GoldButton = ({ children, onClick, style = {}, ...rest }) => (
  <button
    onClick={onClick}
    style={{
      background: C.gold, border: 'none', color: '#1c1508',
      padding: '10px 18px', borderRadius: '999px', fontWeight: 700,
      fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit',
      display: 'flex', alignItems: 'center', gap: '8px', minHeight: `${TOUCH_TARGET}px`,
      ...style
    }}
    onMouseEnter={e => (e.currentTarget.style.background = '#dab976')}
    onMouseLeave={e => (e.currentTarget.style.background = C.gold)}
    {...rest}
  >
    {children}
  </button>
);

const Avatar = ({ nama, size = 38 }) => {
  const initials = (nama || 'G').trim().split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `linear-gradient(135deg, ${C.goldBg}, rgba(255,255,255,0.06))`,
      border: `1px solid ${C.goldBorder}`, color: C.gold,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: size * 0.36 + 'px'
    }}>
      {initials || '👤'}
    </div>
  );
};

// Input & label dark-theme untuk form (dipakai di tab Upload & Request)
const fieldLabel = { display: 'block', fontSize: '0.78rem', color: C.textDim, marginBottom: '5px', fontWeight: 700 };
const fieldInput = {
  width: '100%', padding: '10px 12px', borderRadius: '10px',
  border: `1px solid ${C.border}`, background: C.cardAlt, color: C.text,
  fontFamily: 'inherit', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box',
  minHeight: `${TOUCH_TARGET}px`,
};

// ─── Kartu riwayat upload arsip ───────────────────────────────────────────────
const ArsipEntryCard = ({ item, onDelete, deleting }) => {
  const js = jenisStyle(item.jenis);
  const fi = fileTypeInfo(fileTypeFromUrl(item.file_url));

  return (
    <Card style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '0.92rem', color: C.text, wordBreak: 'break-word' }}>
            {item.judul}
          </div>
          <div style={{ fontSize: '0.76rem', color: C.textFaint, marginTop: '2px' }}>
            {formatTanggalSingkat(item.created_at)}
          </div>
        </div>
        <Pill bg={js.bg} color={js.fg}>{item.jenis}</Pill>
      </div>

      <div style={{ fontSize: '0.84rem', color: C.text }}>
        <span style={{ fontWeight: 600 }}>{item.bab}</span>
        {item.sub_bab && <span style={{ color: C.textDim }}> — {item.sub_bab}</span>}
      </div>

      {item.deskripsi && (
        <div style={{
          fontSize: '0.8rem', color: C.textDim, background: C.cardAlt, borderRadius: '10px',
          padding: '0.6rem 0.75rem', lineHeight: 1.4, wordBreak: 'break-word'
        }}>
          {item.deskripsi}
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
        <a
          href={item.file_url}
          target="_blank"
          rel="noreferrer"
          style={{
            flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            minHeight: `${TOUCH_TARGET}px`, borderRadius: '10px',
            background: fi.bg, color: fi.color, border: `1px solid ${C.border}`,
            fontSize: '0.8rem', fontWeight: 700, textDecoration: 'none'
          }}
        >
          {fi.icon} Buka File ({fi.label})
        </a>
        <button
          onClick={() => onDelete(item)}
          disabled={deleting[item.id]}
          style={{
            minHeight: `${TOUCH_TARGET}px`, minWidth: `${TOUCH_TARGET}px`,
            background: 'transparent', border: `1.5px solid ${C.red}`, color: C.red,
            borderRadius: '10px', cursor: deleting[item.id] ? 'default' : 'pointer',
            fontSize: '0.8rem', fontWeight: 600, opacity: deleting[item.id] ? 0.6 : 1,
          }}
        >
          {deleting[item.id] ? '...' : 'Hapus'}
        </button>
      </div>
    </Card>
  );
};

// ─── Halaman Utama ────────────────────────────────────────────────────────────
const FolderShared = () => {
  const isMobile = useIsMobile();

  // ── Identitas siswa ─────────────────────────────────────────────────────────
  const [userId, setUserId] = useState(null);
  const [studentProfile, setStudentProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // ── State: Materi dari Guru ─────────────────────────────────────────────────
  const [sesiList, setSesiList] = useState([]);
  const [materiFileAll, setMateriFileAll] = useState([]);
  const [guruByProfileId, setGuruByProfileId] = useState({});
  const [guruByGuruId, setGuruByGuruId] = useState({});
  const [guruMapelMap, setGuruMapelMap] = useState({});
  const [guruOptions, setGuruOptions] = useState([]);
  const [loadingMateri, setLoadingMateri] = useState(true);

  const [mapelFilter, setMapelFilter] = useState('Semua Mapel');
  const [viewMode, setViewMode] = useState('list');
  const [expandedIds, setExpandedIds] = useState(new Set());

  // ── State: Request Materi ───────────────────────────────────────────────────
  const [materiRequestList, setMateriRequestList] = useState([]);
  const [requestForm, setRequestForm] = useState({ guruId: '', judul: '', deskripsi: '' });
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [requestMsg, setRequestMsg] = useState(null);

  // ── State: Upload Arsip ─────────────────────────────────────────────────────
  const [entries, setEntries] = useState([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [entriesError, setEntriesError] = useState('');

  const [jenis, setJenis] = useState(jenisOptions[0]);
  const [bab, setBab] = useState('');
  const [subBab, setSubBab] = useState('');
  const [judul, setJudul] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const fileInputRef = useRef(null);

  const [filterJenis, setFilterJenis] = useState('Semua');
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState({});

  // ── Tab aktif ────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('materi'); // 'materi' | 'request' | 'upload'

  // ─── Ambil profil siswa yang login ─────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoadingProfile(false); return; }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .eq('role', 'student')
        .maybeSingle();

      if (error) {
        console.error('Gagal ambil profil siswa:', error.message);
      } else {
        setStudentProfile(data);
        if (data) setUserId(data.id);
      }
      setLoadingProfile(false);
    };
    init();
  }, []);

  // ─── Ambil data Materi dari Guru + daftar guru ─────────────────────────────
  const loadMateri = useCallback(async () => {
    if (!userId) return;
    setLoadingMateri(true);
    setErrorMsg('');
    try {
      const { data: jadwalData, error: jadwalErr } = await supabase
        .from('jadwal_les')
        .select('*')
        .or(`siswa_id.eq.${userId},siswa_ids.cs.{${userId}}`);
      if (jadwalErr) throw jadwalErr;

      const guruIds = [...new Set((jadwalData || []).map(j => j.guru_id).filter(Boolean))];

      let guruRows = [];
      if (guruIds.length > 0) {
        const { data: guruData, error: guruErr } = await supabase
          .from('guru').select('id, nama, profile_id, mapel').in('id', guruIds);
        if (guruErr) throw guruErr;
        guruRows = guruData || [];
      }
      setGuruOptions(guruRows);

      const byGuruId = {};
      const byProfileId = {};
      guruRows.forEach(g => {
        byGuruId[g.id] = { nama: g.nama, profile_id: g.profile_id };
        if (g.profile_id) byProfileId[g.profile_id] = { id: g.id, nama: g.nama };
      });
      setGuruByGuruId(byGuruId);
      setGuruByProfileId(byProfileId);

      const profileIds = guruRows.map(g => g.profile_id).filter(Boolean);

      const mMapArr = {};
      guruRows.forEach(g => {
        if (g.profile_id && g.mapel) mMapArr[g.profile_id] = [g.mapel];
      });
      setGuruMapelMap(mMapArr);

      const { data: sesiData, error: sesiErr } = await supabase
        .from('sesi_pembelajaran')
        .select('*')
        .eq('siswa_id', userId)
        .order('tanggal', { ascending: true });
      if (sesiErr) throw sesiErr;
      setSesiList(sesiData || []);

      if (profileIds.length > 0) {
        let fileQuery = supabase
          .from('materi_file')
          .select('id, nama, tipe, tanggal, url, kelas, status, deskripsi, bab_id, user_id, diupload_oleh, mapel, bab, sub_bab')
          .in('user_id', profileIds)
          .eq('status', 'Dipublish')
          .order('tanggal', { ascending: false });
        if (studentProfile?.kelas) fileQuery = fileQuery.eq('kelas', studentProfile.kelas);

        const { data: fileData, error: fileErr } = await fileQuery;
        if (fileErr) throw fileErr;
        setMateriFileAll(fileData || []);
      } else {
        setMateriFileAll([]);
      }

      const { data: reqData, error: reqErr } = await supabase
        .from('materi_request')
        .select('*')
        .eq('siswa_id', userId)
        .order('created_at', { ascending: false });
      if (reqErr) throw reqErr;
      setMateriRequestList(reqData || []);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Gagal memuat data materi.');
    } finally {
      setLoadingMateri(false);
    }
  }, [userId, studentProfile]);

  useEffect(() => { if (userId) loadMateri(); }, [userId, loadMateri]);

  // ─── Ambil riwayat upload arsip siswa ini ──────────────────────────────────
  const loadEntries = useCallback(async () => {
    if (!studentProfile) return;
    setLoadingEntries(true);
    setEntriesError('');
    try {
      const { data, error } = await supabase
        .from(TABLE_ARSIP)
        .select('id, jenis, bab, sub_bab, judul, deskripsi, file_name, file_url, created_at')
        .eq('siswa_id', studentProfile.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setEntries(data || []);
    } catch (err) {
      setEntriesError('Gagal memuat riwayat: ' + err.message);
    } finally {
      setLoadingEntries(false);
    }
  }, [studentProfile]);

  useEffect(() => { if (studentProfile) loadEntries(); }, [studentProfile, loadEntries]);

  // ─── Turunan: daftar Pertemuan (gabungan sesi_pembelajaran + materi_file) ──
  const pertemuanList = useMemo(() => {
    const fileMap = {};
    materiFileAll.forEach(f => {
      const key = `${f.user_id}|${dateKey(f.tanggal)}`;
      if (!fileMap[key]) fileMap[key] = [];
      fileMap[key].push(f);
    });

    const ascending = [...sesiList].sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal));

    const built = ascending.map((sesi, idx) => {
      const key = `${sesi.guru_id}|${dateKey(sesi.tanggal)}`;
      const files = fileMap[key] || [];
      const mapelDariFile = files.find(f => f.mapel)?.mapel;
      const guruInfo = guruByProfileId[sesi.guru_id];
      return {
        id: sesi.id,
        pertemuanKe: idx + 1,
        tanggal: sesi.tanggal,
        judulMateri: sesi.judul_materi,
        catatan: sesi.catatan,
        status: sesi.status,
        guruId: sesi.guru_id,
        guruNama: guruInfo?.nama || 'Guru',
        mapel: mapelDariFile || 'Sesi Belajar',
        files,
      };
    });

    return built.reverse();
  }, [sesiList, materiFileAll, guruByProfileId]);

  const mapelOptionsList = useMemo(() => {
    const set = new Set();
    materiFileAll.forEach(f => { if (f.mapel) set.add(f.mapel); });
    return ['Semua Mapel', ...Array.from(set).sort()];
  }, [materiFileAll]);

  const filteredPertemuan = useMemo(() => {
    if (mapelFilter === 'Semua Mapel') return pertemuanList;
    return pertemuanList.filter(p => p.mapel === mapelFilter);
  }, [pertemuanList, mapelFilter]);

  useEffect(() => {
    if (pertemuanList.length > 0 && expandedIds.size === 0) {
      setExpandedIds(new Set([pertemuanList[0].id]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pertemuanList.length]);

  const toggleExpand = (id) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // ─── Kirim permintaan materi baru ──────────────────────────────────────────
  const goToRequestTab = () => { setActiveTab('request'); setRequestMsg(null); };

  const submitMateriRequest = async () => {
    setRequestMsg(null);
    if (!requestForm.judul.trim()) {
      setRequestMsg({ type: 'error', text: 'Judul materi tidak boleh kosong.' }); return;
    }
    if (!requestForm.guruId) {
      setRequestMsg({ type: 'error', text: 'Pilih guru tujuan terlebih dahulu.' }); return;
    }
    setSubmittingRequest(true);
    try {
      const payload = {
        guru_id: requestForm.guruId,
        siswa_id: userId,
        siswa_nama: studentProfile?.full_name || '-',
        kelas: studentProfile?.kelas || '-',
        judul_materi: requestForm.judul.trim(),
        deskripsi: requestForm.deskripsi.trim() || null,
        status: 'baru',
        created_at: new Date().toISOString(),
      };
      const { error } = await supabase.from('materi_request').insert(payload);
      if (error) throw error;

      try {
        const guruInfo = guruByGuruId[requestForm.guruId];
        if (guruInfo?.profile_id) {
          await supabase.from('notifikasi').insert({
            user_id: guruInfo.profile_id,
            pesan: `Siswa ${studentProfile?.full_name || ''} meminta materi: "${requestForm.judul.trim()}"`,
            link: null,
          });
        }
      } catch (notifErr) {
        console.error('Gagal kirim notifikasi ke guru:', notifErr);
      }

      setRequestForm({ guruId: '', judul: '', deskripsi: '' });
      setRequestMsg({ type: 'success', text: 'Permintaan materi berhasil dikirim.' });
      await loadMateri();
    } catch (err) {
      console.error(err);
      setRequestMsg({ type: 'error', text: err.message || 'Gagal mengirim permintaan materi.' });
    } finally {
      setSubmittingRequest(false);
    }
  };

  // ─── Form helpers Upload Arsip ─────────────────────────────────────────────
  const resetForm = () => {
    setJenis(jenisOptions[0]);
    setBab('');
    setSubBab('');
    setJudul('');
    setDeskripsi('');
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileSelect = (f) => {
    if (!f) return;
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      setFormError(`Ukuran file maksimal ${MAX_SIZE_MB}MB.`);
      return;
    }
    setFormError('');
    setFile(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    handleFileSelect(f);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!bab.trim()) return setFormError('Bab wajib diisi.');
    if (!judul.trim()) return setFormError('Judul wajib diisi.');
    if (!file) return setFormError('File wajib diupload.');

    setSubmitting(true);
    try {
      const path = `${studentProfile.id}/${Date.now()}_${sanitizeFileName(file.name)}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET_ARSIP)
        .upload(path, file, { cacheControl: '3600', upsert: false });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from(BUCKET_ARSIP).getPublicUrl(path);
      const fileUrl = publicUrlData?.publicUrl;
      if (!fileUrl) throw new Error('Gagal mendapatkan URL file setelah upload.');

      const { data: inserted, error: insertError } = await supabase
        .from(TABLE_ARSIP)
        .insert([
          {
            siswa_id: studentProfile.id,
            jenis,
            bab: bab.trim(),
            sub_bab: subBab.trim() || null,
            judul: judul.trim(),
            deskripsi: deskripsi.trim() || null,
            file_name: file.name,
            file_url: fileUrl,
          },
        ])
        .select();

      if (insertError) throw insertError;

      setEntries((prev) => [inserted[0], ...prev]);
      setFormSuccess('Berhasil diupload.');
      resetForm();
      setTimeout(() => setFormSuccess(''), 3000);
    } catch (err) {
      setFormError('Gagal upload: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Hapus "${item.judul}"? Tindakan ini tidak bisa dibatalkan.`)) return;

    setDeleting((prev) => ({ ...prev, [item.id]: true }));
    try {
      try {
        const marker = `/${BUCKET_ARSIP}/`;
        const idx = item.file_url.indexOf(marker);
        if (idx !== -1) {
          const path = decodeURIComponent(item.file_url.slice(idx + marker.length));
          await supabase.storage.from(BUCKET_ARSIP).remove([path]);
        }
      } catch (storageErr) {
        console.warn('Gagal hapus file di storage:', storageErr.message);
      }

      const { error } = await supabase
        .from(TABLE_ARSIP)
        .delete()
        .eq('id', item.id)
        .eq('siswa_id', studentProfile.id);

      if (error) throw error;

      setEntries((prev) => prev.filter((e) => e.id !== item.id));
    } catch (err) {
      setEntriesError('Gagal menghapus: ' + err.message);
    } finally {
      setDeleting((prev) => ({ ...prev, [item.id]: false }));
    }
  };

  const babSuggestions = Array.from(new Set(entries.map((e) => e.bab))).filter(Boolean);

  const filteredEntries = entries.filter((e) => {
    if (filterJenis !== 'Semua' && e.jenis !== filterJenis) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const hay = `${e.judul} ${e.bab} ${e.sub_bab || ''} ${e.deskripsi || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  // ─── Guard akses ────────────────────────────────────────────────────────────
  if (loadingProfile) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: C.textDim, fontFamily: 'inherit' }}>
        Memuat profil siswa...
      </div>
    );
  }

  if (!studentProfile) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: C.red, fontFamily: 'inherit' }}>
        Anda tidak terdaftar sebagai siswa. Silakan hubungi admin.
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{
      maxWidth: '1180px', margin: '0 auto', fontFamily: 'inherit',
      display: 'flex', flexDirection: 'column', gap: '1.4rem', color: C.text
    }}>
      {errorMsg && (
        <div style={{ background: C.redBg, color: C.red, padding: '10px 14px', borderRadius: '10px', fontSize: '0.85rem' }}>
          {errorMsg}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.4rem', borderBottom: `1px solid ${C.border}`, overflowX: 'auto' }}>
        {[
          { key: 'materi', label: 'Materi Dipelajari', icon: '📖' },
          { key: 'request', label: 'Request Materi', icon: '🙋' },
          { key: 'upload', label: 'Upload Arsip', icon: '⬆️' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              padding: '10px 6px', marginRight: '1.2rem', fontSize: '0.9rem', fontWeight: 700,
              color: activeTab === t.key ? C.gold : C.textDim, whiteSpace: 'nowrap',
              borderBottom: activeTab === t.key ? `2.5px solid ${C.gold}` : '2.5px solid transparent',
              display: 'flex', alignItems: 'center', gap: '7px', minHeight: `${TOUCH_TARGET}px`,
            }}
          >
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* ─────────────────────── TAB: MATERI DIPELAJARI ─────────────────────── */}
      {activeTab === 'materi' && (
        loadingMateri ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: C.textDim }}>Memuat materi...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: '1.4rem', alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Card style={{ padding: '1.1rem 1.3rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1.02rem', color: C.text }}>Materi dari Guru</div>
                    <div style={{ color: C.textDim, fontSize: '0.8rem' }}>Seluruh materi yang telah Anda pelajari, per pertemuan.</div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <select
                      value={mapelFilter}
                      onChange={e => setMapelFilter(e.target.value)}
                      style={{
                        background: C.cardAlt, color: C.text, border: `1px solid ${C.border}`,
                        borderRadius: '10px', padding: '8px 12px', fontSize: '0.82rem', fontFamily: 'inherit', outline: 'none'
                      }}
                    >
                      {mapelOptionsList.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <div style={{ display: 'flex', border: `1px solid ${C.border}`, borderRadius: '10px', overflow: 'hidden' }}>
                      {['list', 'grid'].map(v => (
                        <button key={v} onClick={() => setViewMode(v)} style={{
                          border: 'none', cursor: 'pointer', padding: '8px 12px',
                          background: viewMode === v ? C.goldBg : 'transparent',
                          color: viewMode === v ? C.gold : C.textDim, fontSize: '0.9rem'
                        }}>
                          {v === 'list' ? '☰' : '▦'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>

              {filteredPertemuan.length === 0 && (
                <Card style={{ textAlign: 'center', color: C.textDim, padding: '2.4rem 1rem' }}>
                  Belum ada pertemuan dengan materi untuk ditampilkan.
                </Card>
              )}

              {viewMode === 'list' ? (
                filteredPertemuan.map(p => {
                  const open = expandedIds.has(p.id);
                  const accent = mapelColor(p.mapel);
                  return (
                    <Card key={p.id} style={{ padding: 0, overflow: 'hidden' }}>
                      <button
                        onClick={() => toggleExpand(p.id)}
                        style={{
                          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                          padding: '1rem 1.3rem', display: 'flex', alignItems: 'center',
                          justifyContent: 'space-between', gap: '10px', fontFamily: 'inherit', textAlign: 'left'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                          <span style={{ color: C.textDim, fontSize: '0.85rem', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .15s', display: 'inline-block' }}>›</span>
                          <span style={{ fontWeight: 700, color: C.text, fontSize: '0.92rem' }}>Pertemuan {p.pertemuanKe}</span>
                          <span style={{ color: C.textFaint }}>•</span>
                          <span style={{ color: C.textDim, fontSize: '0.85rem' }}>{formatTanggalPanjang(p.tanggal)}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: accent, display: 'inline-block' }} />
                          <span style={{ color: C.text, fontWeight: 600 }}>{p.mapel}</span>
                          <span style={{ color: C.textFaint }}>-</span>
                          <span style={{ color: C.textDim }}>{p.guruNama}</span>
                        </div>
                      </button>

                      {open && (
                        <div style={{ borderTop: `1px solid ${C.borderSoft}`, padding: '0.6rem 1.3rem 1.1rem' }}>
                          {p.judulMateri && (
                            <div style={{ color: C.textDim, fontSize: '0.8rem', margin: '0.6rem 0 0.8rem' }}>
                              <strong style={{ color: C.text }}>Topik: </strong>{p.judulMateri}
                              {p.catatan && <span> — {p.catatan}</span>}
                            </div>
                          )}
                          {p.files.length === 0 ? (
                            <div style={{ color: C.textFaint, fontSize: '0.82rem', padding: '0.6rem 0' }}>
                              Belum ada file materi diupload untuk pertemuan ini.
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {p.files.map((f, i) => {
                                const fi = fileTypeInfo(f.tipe);
                                return (
                                  <div key={f.id} style={{
                                    display: 'flex', alignItems: 'center', gap: '12px',
                                    padding: '10px 12px', borderRadius: '12px', background: C.cardAlt,
                                    border: `1px solid ${C.borderSoft}`
                                  }}>
                                    <span style={{
                                      width: '34px', height: '34px', borderRadius: '9px', flexShrink: 0,
                                      background: fi.bg, color: fi.color, display: 'flex',
                                      alignItems: 'center', justifyContent: 'center', fontSize: '1rem'
                                    }}>{fi.icon}</span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ color: C.text, fontWeight: 600, fontSize: '0.86rem' }}>
                                        {i + 1}. {f.nama}
                                      </div>
                                      {f.deskripsi && (
                                        <div style={{ color: C.textDim, fontSize: '0.78rem', marginTop: '2px' }}>{f.deskripsi}</div>
                                      )}
                                    </div>
                                    <div style={{ textAlign: 'right', fontSize: '0.74rem', color: C.textFaint, flexShrink: 0 }}>
                                      <div>Diupload</div>
                                      <div>{formatWaktuUpload(f.tanggal)}</div>
                                    </div>
                                    <div style={{ fontSize: '0.74rem', color: C.textFaint, width: '58px', textAlign: 'right', flexShrink: 0 }}>
                                      {formatUkuran(f.ukuran_bytes)}
                                    </div>
                                    <a
                                      href={f.url} download target="_blank" rel="noreferrer"
                                      style={{
                                        flexShrink: 0, textDecoration: 'none', color: C.gold,
                                        border: `1px solid ${C.goldBorder}`, borderRadius: '999px',
                                        padding: '6px 13px', fontSize: '0.76rem', fontWeight: 700
                                      }}
                                    >
                                      ⬇ Unduh
                                    </a>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </Card>
                  );
                })
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
                  {filteredPertemuan.flatMap(p => p.files.map(f => ({ ...f, _pertemuan: p }))).map(f => {
                    const fi = fileTypeInfo(f.tipe);
                    return (
                      <Card key={f.id} style={{ padding: '1rem' }}>
                        <div style={{
                          width: '38px', height: '38px', borderRadius: '10px', background: fi.bg, color: fi.color,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', marginBottom: '10px'
                        }}>{fi.icon}</div>
                        <div style={{ color: C.text, fontWeight: 700, fontSize: '0.85rem', marginBottom: '4px' }}>{f.nama}</div>
                        <div style={{ color: C.textFaint, fontSize: '0.74rem', marginBottom: '10px' }}>
                          Pertemuan {f._pertemuan.pertemuanKe} • {formatTanggalPanjang(f._pertemuan.tanggal)}
                        </div>
                        <a href={f.url} download target="_blank" rel="noreferrer" style={{
                          display: 'inline-block', textDecoration: 'none', color: C.gold,
                          border: `1px solid ${C.goldBorder}`, borderRadius: '999px',
                          padding: '6px 13px', fontSize: '0.76rem', fontWeight: 700
                        }}>⬇ Unduh</a>
                      </Card>
                    );
                  })}
                  {filteredPertemuan.every(p => p.files.length === 0) && (
                    <div style={{ color: C.textFaint, fontSize: '0.85rem' }}>Belum ada file materi.</div>
                  )}
                </div>
              )}
            </div>

            {/* ── Sidebar kanan ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Card>
                <div style={{ fontWeight: 700, color: C.text, marginBottom: '12px', fontSize: '0.92rem' }}>Ringkasan</div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px' }}>
                  <div style={{ background: C.goldBg, borderRadius: '12px', padding: '12px' }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: C.gold }}>{materiFileAll.length}</div>
                    <div style={{ fontSize: '0.74rem', color: C.textDim }}>Materi dari Guru</div>
                  </div>
                  <div style={{ background: C.purpleBg, borderRadius: '12px', padding: '12px' }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: C.purple }}>{materiRequestList.length}</div>
                    <div style={{ fontSize: '0.74rem', color: C.textDim }}>Materi Request</div>
                  </div>
                  <div style={{ background: C.blueBg, borderRadius: '12px', padding: '12px' }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: C.blue }}>{entries.length}</div>
                    <div style={{ fontSize: '0.74rem', color: C.textDim }}>Arsip Terupload</div>
                  </div>
                </div>
              </Card>

              <Card style={{ background: C.goldBg, border: `1px solid ${C.goldBorder}` }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <span>💡</span>
                  <div>
                    <div style={{ fontWeight: 700, color: C.text, fontSize: '0.85rem', marginBottom: '4px' }}>Tips</div>
                    <div style={{ color: C.textDim, fontSize: '0.8rem', lineHeight: 1.5 }}>
                      Tidak menemukan materi yang Anda butuhkan? Gunakan tab Request Materi untuk meminta materi ke guru Anda.
                    </div>
                  </div>
                </div>
              </Card>

              <Card>
                <div style={{ fontWeight: 700, color: C.text, fontSize: '0.9rem', marginBottom: '6px' }}>Butuh Materi Lain?</div>
                <div style={{ color: C.textDim, fontSize: '0.8rem', marginBottom: '12px' }}>
                  Ajukan request materi yang belum tersedia.
                </div>
                <GoldButton onClick={goToRequestTab} style={{ width: '100%', justifyContent: 'center' }}>
                  📄 Request Materi
                </GoldButton>
              </Card>

              {guruOptions.length > 0 && (
                <Card>
                  <div style={{ fontWeight: 700, color: C.text, fontSize: '0.9rem', marginBottom: '10px' }}>
                    Guru {guruOptions.length === 1 ? '' : 'Anda'}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {guruOptions.map(g => (
                      <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Avatar nama={g.nama} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ color: C.text, fontWeight: 600, fontSize: '0.85rem' }}>{g.nama}</div>
                          <div style={{ color: C.textDim, fontSize: '0.74rem' }}>
                            {(guruMapelMap[g.profile_id] || []).join(', ') || 'Guru'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          </div>
        )
      )}

      {/* ─────────────────────── TAB: REQUEST MATERI ─────────────────────── */}
      {activeTab === 'request' && (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: '1.4rem', alignItems: 'start' }}>
          <Card>
            <div style={{ fontWeight: 700, color: C.text, fontSize: '0.95rem', marginBottom: '4px' }}>Materi Request Saya</div>
            <div style={{ color: C.textDim, fontSize: '0.8rem', marginBottom: '1rem' }}>
              Daftar permintaan materi yang Anda ajukan, beserta jawaban dari guru.
            </div>

            {materiRequestList.length === 0 ? (
              <div style={{ color: C.textFaint, fontSize: '0.85rem', padding: '1.5rem 0', textAlign: 'center' }}>
                Belum ada permintaan materi.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {materiRequestList.map((item, idx) => {
                  const badge = requestStatusBadge(item.status);
                  const guruNama = guruByGuruId[item.guru_id]?.nama || 'Guru';
                  return (
                    <div key={item.id} style={{
                      padding: '0.9rem 0',
                      borderBottom: idx < materiRequestList.length - 1 ? `1px solid ${C.borderSoft}` : 'none'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, color: C.text, fontSize: '0.88rem' }}>{item.judul_materi}</div>
                          <div style={{ color: C.textDim, fontSize: '0.78rem', marginTop: '2px' }}>Untuk guru: {guruNama}</div>
                          {item.deskripsi && (
                            <div style={{ color: C.textFaint, fontSize: '0.76rem', fontStyle: 'italic', marginTop: '2px' }}>{item.deskripsi}</div>
                          )}
                          <div style={{ color: C.textFaint, fontSize: '0.72rem', marginTop: '4px' }}>{formatWaktuUpload(item.created_at)}</div>
                        </div>
                        <Pill bg={badge.bg} color={badge.color}>{badge.emoji} {badge.label}</Pill>
                      </div>
                      {item.catatan_guru && (
                        <div style={{
                          marginTop: '8px', background: C.cardAlt, borderRadius: '10px',
                          padding: '8px 12px', fontSize: '0.8rem', color: C.textDim,
                          borderLeft: `3px solid ${C.gold}`
                        }}>
                          💬 <strong style={{ color: C.text }}>{guruNama}:</strong> {item.catatan_guru}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card>
            <div style={{ fontWeight: 700, color: C.text, fontSize: '0.92rem', marginBottom: '4px' }}>Minta Materi</div>
            <div style={{ color: C.textDim, fontSize: '0.8rem', marginBottom: '14px' }}>
              Ajukan permintaan materi yang ingin Anda pelajari.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={fieldLabel}>Kirim ke Guru</label>
                <select
                  value={requestForm.guruId}
                  onChange={e => setRequestForm({ ...requestForm, guruId: e.target.value })}
                  style={{ ...fieldInput, cursor: 'pointer' }}
                >
                  <option value="">-- Pilih Guru --</option>
                  {guruOptions.map(g => <option key={g.id} value={g.id}>{g.nama}</option>)}
                </select>
              </div>

              <div>
                <label style={fieldLabel}>Judul Materi</label>
                <input
                  type="text"
                  placeholder="Contoh: Integral Tak Tentu"
                  value={requestForm.judul}
                  onChange={e => setRequestForm({ ...requestForm, judul: e.target.value })}
                  style={fieldInput}
                />
              </div>

              <div>
                <label style={fieldLabel}>Deskripsi (opsional)</label>
                <textarea
                  rows={3}
                  placeholder="Jelaskan bagian yang belum Anda pahami..."
                  value={requestForm.deskripsi}
                  onChange={e => setRequestForm({ ...requestForm, deskripsi: e.target.value })}
                  style={{ ...fieldInput, resize: 'vertical' }}
                />
              </div>

              {requestMsg && (
                <div style={{
                  padding: '9px 12px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 600,
                  background: requestMsg.type === 'success' ? C.greenBg : C.redBg,
                  color: requestMsg.type === 'success' ? C.green : C.red
                }}>
                  {requestMsg.text}
                </div>
              )}

              <GoldButton
                onClick={submitMateriRequest}
                style={{ width: '100%', justifyContent: 'center', opacity: submittingRequest ? 0.7 : 1 }}
                disabled={submittingRequest}
              >
                {submittingRequest ? 'Mengirim...' : 'Kirim Permintaan'}
              </GoldButton>
            </div>
          </Card>
        </div>
      )}

      {/* ─────────────────────── TAB: UPLOAD ARSIP ─────────────────────── */}
      {activeTab === 'upload' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
          <Card>
            <div style={{ fontWeight: 700, color: C.text, fontSize: '0.95rem', marginBottom: '4px' }}>
              Upload Materi Sekolah / Tugas / Penilaian
            </div>
            <div style={{ color: C.textDim, fontSize: '0.8rem', marginBottom: '1.1rem' }}>
              Simpan arsip materi dari sekolah, hasil penugasan, atau hasil penilaian Anda di sini.
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem', marginBottom: '1rem'
              }}>
                <div>
                  <label style={fieldLabel}>Kategori</label>
                  <select value={jenis} onChange={(e) => setJenis(e.target.value)} style={{ ...fieldInput, cursor: 'pointer' }}>
                    {jenisOptions.map((j) => (
                      <option key={j} value={j}>{j}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={fieldLabel}>Bab</label>
                  <input
                    type="text"
                    list="bab-suggestions"
                    value={bab}
                    onChange={(e) => setBab(e.target.value)}
                    placeholder="cth. Fungsi Kuadrat"
                    style={fieldInput}
                  />
                  <datalist id="bab-suggestions">
                    {babSuggestions.map((b) => (
                      <option key={b} value={b} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label style={fieldLabel}>Sub Bab (opsional)</label>
                  <input
                    type="text"
                    value={subBab}
                    onChange={(e) => setSubBab(e.target.value)}
                    placeholder="cth. Menentukan Titik Puncak"
                    style={fieldInput}
                  />
                </div>

                <div>
                  <label style={fieldLabel}>Judul</label>
                  <input
                    type="text"
                    value={judul}
                    onChange={(e) => setJudul(e.target.value)}
                    placeholder="cth. Ulangan Harian 1"
                    style={fieldInput}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={fieldLabel}>Deskripsi (opsional)</label>
                <textarea
                  value={deskripsi}
                  onChange={(e) => setDeskripsi(e.target.value)}
                  placeholder="Catatan tambahan tentang file ini..."
                  rows={3}
                  style={{ ...fieldInput, resize: 'vertical' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={fieldLabel}>File</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={handleDrop}
                  style={{
                    border: `2px dashed ${dragActive ? C.gold : C.border}`,
                    borderRadius: '12px', padding: '1.5rem', textAlign: 'center', cursor: 'pointer',
                    background: dragActive ? C.goldBg : C.cardAlt,
                    transition: 'background 0.15s, border-color 0.15s',
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={(e) => handleFileSelect(e.target.files?.[0])}
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                    style={{ display: 'none' }}
                  />
                  {file ? (
                    <div style={{ color: C.text, fontWeight: 600, fontSize: '0.9rem' }}>
                      📎 {file.name}
                      <div style={{ fontWeight: 400, color: C.textDim, fontSize: '0.78rem', marginTop: '4px' }}>
                        Klik untuk ganti file
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ color: C.gold, fontSize: '1.3rem', marginBottom: '4px' }}>⬆</div>
                      <div style={{ color: C.text, fontWeight: 600, fontSize: '0.9rem' }}>Drag &amp; Drop file di sini</div>
                      <div style={{ color: C.textDim, fontSize: '0.78rem', marginTop: '2px' }}>
                        atau klik untuk memilih file (PDF, gambar, Word, Excel, atau PPT, maks {MAX_SIZE_MB}MB)
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {formError && (
                <div style={{ color: C.red, fontSize: '0.85rem', marginBottom: '1rem' }}>{formError}</div>
              )}
              {formSuccess && (
                <div style={{ color: C.green, fontSize: '0.85rem', marginBottom: '1rem' }}>{formSuccess}</div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <GoldButton
                  type="submit"
                  style={{
                    width: isMobile ? '100%' : 'auto', justifyContent: 'center',
                    opacity: submitting ? 0.6 : 1, cursor: submitting ? 'default' : 'pointer',
                  }}
                  disabled={submitting}
                >
                  {submitting ? 'Mengupload...' : 'Upload'}
                </GoldButton>
              </div>
            </form>
          </Card>

          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.1rem' }}>
              <div style={{ fontWeight: 700, color: C.text, fontSize: '0.95rem' }}>Riwayat Upload Saya</div>
              <span style={{ fontSize: '0.78rem', color: C.textDim }}>
                {filteredEntries.length} dari {entries.length} file
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1.1rem' }}>
              <div>
                <label style={{ ...fieldLabel, fontSize: '0.72rem' }}>Kategori</label>
                <select value={filterJenis} onChange={(e) => setFilterJenis(e.target.value)} style={{ ...fieldInput, cursor: 'pointer' }}>
                  <option value="Semua">Semua</option>
                  {jenisOptions.map((j) => (
                    <option key={j} value={j}>{j}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ ...fieldLabel, fontSize: '0.72rem' }}>Cari</label>
                <input
                  type="text"
                  placeholder="Cari judul, bab, atau deskripsi..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={fieldInput}
                />
              </div>
            </div>

            {entriesError && (
              <div style={{ color: C.red, fontSize: '0.85rem', marginBottom: '1rem' }}>{entriesError}</div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
              {loadingEntries && (
                <div style={{ padding: '2rem', textAlign: 'center', color: C.textFaint, gridColumn: '1 / -1' }}>Memuat riwayat...</div>
              )}
              {!loadingEntries && filteredEntries.map((item) => (
                <ArsipEntryCard key={item.id} item={item} onDelete={handleDelete} deleting={deleting} />
              ))}
              {!loadingEntries && filteredEntries.length === 0 && (
                <div style={{ padding: '2rem', textAlign: 'center', color: C.textFaint, gridColumn: '1 / -1' }}>
                  Belum ada file yang diupload.
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      <p style={{ textAlign: 'center', color: C.textFaint, fontSize: '0.76rem', marginTop: '0.4rem' }}>
        © 2026 Precious Course. All rights reserved.
      </p>
    </div>
  );
};

export default FolderShared;