import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../supabaseClient';

/* ============================================================
   StudentMateri.js
   ------------------------------------------------------------
   Redesign total mengikuti mockup "Materi dari Guru" (dark theme).
   Sumber data:
     - sesi_pembelajaran  -> daftar "Pertemuan" (tanggal + judul_materi
       + status per siswa, diisi guru lewat TeacherAbsensiMateri.js)
     - materi_file         -> file materi per pertemuan (skema baru:
       bab_ajar / sub_bab_ajar, bucket storage "materi"), dicocokkan
       ke pertemuan lewat kombinasi (guru yang sama + tanggal yang sama)
       karena tidak ada FK langsung dari sesi_pembelajaran ke materi_file.
     - materi_request      -> tab "Materi Request Saya" (siswa minta
       materi ke guru tertentu, guru menjawab lewat kolom catatan_guru)

   CATATAN ASUMSI (mohon dikoreksi kalau meleset dari struktur asli):
   1) materi_file belum punya kolom ukuran file (bytes), jadi kolom
      "Ukuran" ditampilkan "-" bila tidak tersedia. Rekomendasi: tambah
      kolom `ukuran_bytes` di materi_file saat upload supaya tampilan
      bisa 100% sama seperti mockup.
   2) sesi_pembelajaran.status baru terkonfirmasi defaultnya "Menunggu".
      Nilai lain (mis. "Disetujui") diasumsikan berarti "Selesai".
      Silakan sesuaikan STATUS_MAP di bawah kalau constraint aslinya beda.
   3) Pencocokan pertemuan <-> materi_file pakai tanggal (YYYY-MM-DD) +
      guru_id (auth uid guru) yang sama. Kalau guru upload materi di
      hari lain dari tanggal sesi diisi, file itu tidak akan muncul di
      pertemuan tsb (fallback: tetap kelihatan di tab lain kalau nanti
      dibuatkan halaman "semua materi").
   ============================================================ */

// ─── Palet warna (dark theme, sesuai mockup) ─────────────────────────────────
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

const formatWaktuUpload = (iso) => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${d.getDate()} ${BULAN_PENDEK[d.getMonth()]} ${d.getFullYear()}, ${hh}.${mm}`;
};

const waktuLalu = (iso) => {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  const menit = Math.floor(diffMs / 60000);
  if (menit < 1) return 'Baru saja';
  if (menit < 60) return `${menit} menit lalu`;
  const jam = Math.floor(menit / 60);
  if (jam < 24) return `${jam} jam lalu`;
  const hari = Math.floor(jam / 24);
  if (hari < 30) return `${hari} hari lalu`;
  return formatWaktuUpload(iso);
};

const formatUkuran = (bytes) => {
  if (!bytes && bytes !== 0) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

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
    border: `1px solid ${C.border}`, padding: '1.4rem',
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
      display: 'flex', alignItems: 'center', gap: '8px', ...style
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

// ─── Halaman Utama ────────────────────────────────────────────────────────────
const StudentMateri = () => {
  // ── State: identitas & data mentah ──────────────────────────────────────────
  const [userId, setUserId]           = useState(null);
  const [profile, setProfile]         = useState(null);
  const [loading, setLoading]         = useState(true);
  const [errorMsg, setErrorMsg]       = useState('');

  const [sesiList, setSesiList]             = useState([]);   // dari sesi_pembelajaran
  const [materiFileAll, setMateriFileAll]   = useState([]);   // dari materi_file
  const [guruByProfileId, setGuruByProfileId] = useState({}); // profile_id -> {id, nama}
  const [guruByGuruId, setGuruByGuruId]       = useState({}); // guru.id -> {nama, profile_id}
  const [guruMapelMap, setGuruMapelMap]       = useState({}); // profile_id -> [mapel,...]
  const [guruOptions, setGuruOptions]         = useState([]); // list guru (untuk form request)

  const [materiRequestList, setMateriRequestList] = useState([]);

  // ── State: UI ────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab]     = useState('materi'); // 'materi' | 'request'
  const [mapelFilter, setMapelFilter] = useState('Semua Mapel');
  const [viewMode, setViewMode]       = useState('list'); // 'list' | 'grid'
  const [expandedIds, setExpandedIds] = useState(new Set());

  // ── State: form request materi ─────────────────────────────────────────────
  const [requestForm, setRequestForm]     = useState({ guruId: '', judul: '', deskripsi: '' });
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [requestMsg, setRequestMsg]       = useState(null);

  // ── Init sesi login ──────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setUserId(session.user.id);
      else setLoading(false);
    };
    init();
  }, []);

  // ── Load semua data ──────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setErrorMsg('');
    try {
      // Profil siswa
      const { data: profileData, error: profileErr } = await supabase
        .from('profiles').select('*').eq('id', userId).single();
      if (profileErr) throw profileErr;
      setProfile(profileData);

      // Jadwal les siswa -> untuk tahu guru_id (pola guru.id) yang mengajar siswa ini
      const { data: jadwalData, error: jadwalErr } = await supabase
        .from('jadwal_les')
        .select('*')
        .or(`siswa_id.eq.${userId},siswa_ids.cs.{${userId}}`);
      if (jadwalErr) throw jadwalErr;

      const guruIds = [...new Set((jadwalData || []).map(j => j.guru_id).filter(Boolean))];

      let guruRows = [];
      if (guruIds.length > 0) {
        const { data: guruData, error: guruErr } = await supabase
          .from('guru').select('id, nama, profile_id').in('id', guruIds);
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

      // Mapel yang diajar tiap guru (dari bab_ajar), untuk kartu "Guru Mapel"
      if (profileIds.length > 0) {
        const { data: babAjarData } = await supabase
          .from('bab_ajar').select('guru_id, mapel').in('guru_id', profileIds);
        const mMap = {};
        (babAjarData || []).forEach(b => {
          if (!b.mapel) return;
          if (!mMap[b.guru_id]) mMap[b.guru_id] = new Set();
          mMap[b.guru_id].add(b.mapel);
        });
        const mMapArr = {};
        Object.keys(mMap).forEach(k => { mMapArr[k] = Array.from(mMap[k]); });
        setGuruMapelMap(mMapArr);
      }

      // Pertemuan (sesi_pembelajaran) milik siswa ini
      const { data: sesiData, error: sesiErr } = await supabase
        .from('sesi_pembelajaran')
        .select('*')
        .eq('siswa_id', userId)
        .order('tanggal', { ascending: true });
      if (sesiErr) throw sesiErr;
      setSesiList(sesiData || []);

      // File materi yang dipublish oleh guru-guru tsb, untuk kelas siswa ini
      if (profileIds.length > 0) {
        let fileQuery = supabase
          .from('materi_file')
          .select('id, nama, tipe, tanggal, url, kelas, status, deskripsi, bab_id, sub_bab_id, user_id, diupload_oleh, bab_ajar ( id, judul_bab, mapel ), sub_bab_ajar ( id, judul_sub_bab )')
          .in('user_id', profileIds)
          .eq('status', 'Dipublish')
          .order('tanggal', { ascending: false });
        if (profileData?.kelas) fileQuery = fileQuery.eq('kelas', profileData.kelas);

        const { data: fileData, error: fileErr } = await fileQuery;
        if (fileErr) throw fileErr;
        setMateriFileAll(fileData || []);
      } else {
        setMateriFileAll([]);
      }

      // Materi request milik siswa ini
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
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { if (userId) loadAll(); }, [userId, loadAll]);

  // ── Susun daftar Pertemuan (gabungan sesi_pembelajaran + materi_file) ───────
  const pertemuanList = useMemo(() => {
    // Peta file per (guru_id + tanggal) supaya bisa dicocokkan ke sesi yang tepat
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
      const mapelDariFile = files.find(f => f.bab_ajar?.mapel)?.bab_ajar?.mapel;
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

    return built.reverse(); // paling baru di atas, seperti mockup
  }, [sesiList, materiFileAll, guruByProfileId]);

  // Mapel unik untuk dropdown filter
  const mapelOptionsList = useMemo(() => {
    const set = new Set();
    materiFileAll.forEach(f => { if (f.bab_ajar?.mapel) set.add(f.bab_ajar.mapel); });
    return ['Semua Mapel', ...Array.from(set).sort()];
  }, [materiFileAll]);

  const filteredPertemuan = useMemo(() => {
    if (mapelFilter === 'Semua Mapel') return pertemuanList;
    return pertemuanList.filter(p => p.mapel === mapelFilter);
  }, [pertemuanList, mapelFilter]);

  // Buka pertemuan paling baru secara default
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

  // ── Kirim permintaan materi baru ────────────────────────────────────────────
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
        siswa_nama: profile?.full_name || '-',
        kelas: profile?.kelas || '-',
        judul_materi: requestForm.judul.trim(),
        deskripsi: requestForm.deskripsi.trim() || null,
        status: 'baru',
        created_at: new Date().toISOString(),
      };
      const { error } = await supabase.from('materi_request').insert(payload);
      if (error) throw error;

      // Notifikasi ke guru (best-effort, tidak menggagalkan flow utama kalau error)
      try {
        const guruInfo = guruByGuruId[requestForm.guruId];
        if (guruInfo?.profile_id) {
          await supabase.from('notifikasi').insert({
            user_id: guruInfo.profile_id,
            pesan: `Siswa ${profile?.full_name || ''} meminta materi: "${requestForm.judul.trim()}"`,
            link: null,
          });
        }
      } catch (notifErr) {
        console.error('Gagal kirim notifikasi ke guru:', notifErr);
      }

      setRequestForm({ guruId: '', judul: '', deskripsi: '' });
      setRequestMsg({ type: 'success', text: 'Permintaan materi berhasil dikirim.' });
      await loadAll();
    } catch (err) {
      console.error(err);
      setRequestMsg({ type: 'error', text: err.message || 'Gagal mengirim permintaan materi.' });
    } finally {
      setSubmittingRequest(false);
    }
  };

  const goToRequestTab = () => { setActiveTab('request'); setRequestMsg(null); };

  // ─── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: C.textDim, fontFamily: 'inherit' }}>
        Memuat materi...
      </div>
    );
  }

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
      <div style={{ display: 'flex', gap: '0.4rem', borderBottom: `1px solid ${C.border}` }}>
        {[
          { key: 'materi', label: 'Materi dari Guru', icon: '📖' },
          { key: 'request', label: 'Materi Request Saya', icon: '👤' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              padding: '10px 6px', marginRight: '1.2rem', fontSize: '0.9rem', fontWeight: 700,
              color: activeTab === t.key ? C.gold : C.textDim,
              borderBottom: activeTab === t.key ? `2.5px solid ${C.gold}` : '2.5px solid transparent',
              display: 'flex', alignItems: 'center', gap: '7px'
            }}
          >
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {activeTab === 'materi' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.4rem', alignItems: 'start' }}>
          {/* ── Kolom kiri: daftar pertemuan ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Card style={{ padding: '1.1rem 1.3rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1.02rem', color: C.text }}>Materi dari Guru</div>
                  <div style={{ color: C.textDim, fontSize: '0.8rem' }}>Materi yang diupload oleh guru untuk setiap pertemuan kelas Anda.</div>
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

          {/* ── Kolom kanan: sidebar ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Card>
              <div style={{ fontWeight: 700, color: C.text, marginBottom: '12px', fontSize: '0.92rem' }}>Ringkasan Materi</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ background: C.goldBg, borderRadius: '12px', padding: '12px' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: C.gold }}>{materiFileAll.length}</div>
                  <div style={{ fontSize: '0.74rem', color: C.textDim }}>Materi dari Guru</div>
                </div>
                <div style={{ background: C.purpleBg, borderRadius: '12px', padding: '12px' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: C.purple }}>{materiRequestList.length}</div>
                  <div style={{ fontSize: '0.74rem', color: C.textDim }}>Materi Request</div>
                </div>
              </div>
            </Card>

            <Card style={{ background: C.goldBg, border: `1px solid ${C.goldBorder}` }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <span>💡</span>
                <div>
                  <div style={{ fontWeight: 700, color: C.text, fontSize: '0.85rem', marginBottom: '4px' }}>Tips</div>
                  <div style={{ color: C.textDim, fontSize: '0.8rem', lineHeight: 1.5 }}>
                    Tidak menemukan materi yang Anda butuhkan? Gunakan fitur Request Materi untuk meminta materi ke guru Anda.
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
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.4rem', alignItems: 'start' }}>
          {/* ── Kolom kiri: daftar request + jawaban guru ── */}
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
                          <div style={{ color: C.textFaint, fontSize: '0.72rem', marginTop: '4px' }}>{waktuLalu(item.created_at)}</div>
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

          {/* ── Kolom kanan: form kirim request ── */}
          <Card>
            <div style={{ fontWeight: 700, color: C.text, fontSize: '0.92rem', marginBottom: '4px' }}>Minta Materi</div>
            <div style={{ color: C.textDim, fontSize: '0.8rem', marginBottom: '14px' }}>
              Ajukan permintaan materi yang ingin Anda pelajari.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: C.textDim, marginBottom: '5px', fontWeight: 700 }}>
                  Kirim ke Guru
                </label>
                <select
                  value={requestForm.guruId}
                  onChange={e => setRequestForm({ ...requestForm, guruId: e.target.value })}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '10px',
                    border: `1px solid ${C.border}`, background: C.cardAlt, color: C.text,
                    fontFamily: 'inherit', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box'
                  }}
                >
                  <option value="">-- Pilih Guru --</option>
                  {guruOptions.map(g => <option key={g.id} value={g.id}>{g.nama}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: C.textDim, marginBottom: '5px', fontWeight: 700 }}>
                  Judul Materi
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Integral Tak Tentu"
                  value={requestForm.judul}
                  onChange={e => setRequestForm({ ...requestForm, judul: e.target.value })}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '10px',
                    border: `1px solid ${C.border}`, background: C.cardAlt, color: C.text,
                    fontFamily: 'inherit', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: C.textDim, marginBottom: '5px', fontWeight: 700 }}>
                  Deskripsi (opsional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Jelaskan bagian yang belum Anda pahami..."
                  value={requestForm.deskripsi}
                  onChange={e => setRequestForm({ ...requestForm, deskripsi: e.target.value })}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '10px',
                    border: `1px solid ${C.border}`, background: C.cardAlt, color: C.text,
                    fontFamily: 'inherit', fontSize: '0.85rem', outline: 'none', resize: 'vertical', boxSizing: 'border-box'
                  }}
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

      <p style={{ textAlign: 'center', color: C.textFaint, fontSize: '0.76rem', marginTop: '0.4rem' }}>
        © 2026 Precious Course. All rights reserved.
      </p>
    </div>
  );
};

export default StudentMateri;