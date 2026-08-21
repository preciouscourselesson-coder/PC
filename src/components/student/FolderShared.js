// FolderShared.js
// Gabungan StudentArsip.js + StudentMateri.js menjadi satu halaman "Folder Share":
//   Tab 1 - Materi Dipelajari : daftar pertemuan & file materi dari guru (dari StudentMateri)
//   Tab 2 - Request Materi    : ajukan & lihat status request materi ke guru (dari StudentMateri)
//   Tab 3 - Upload Arsip      : upload materi sekolah / hasil tugas / penilaian + riwayatnya (dari StudentArsip)
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useIsMobile, TOUCH_TARGET } from '../shared/shared';

// ─── Konfigurasi Arsip (tab Upload) ───────────────────────────────────────────
// ⚠️ PERUBAHAN ARSITEKTUR: Upload Arsip sekarang menulis LANGSUNG ke `materi_file`
// (folder_id = folder 'Sekolah' milik siswa ini untuk guru yang dipilih), BUKAN lagi
// ke tabel `bank_soal_siswa` yang terpisah. Alasan: `materi_file`/`folder_materi` adalah
// tabel yang sama persis yang dibaca TeacherArsipMateri.js -- jadi begitu siswa upload,
// otomatis muncul di folder atas nama siswa itu di sisi guru, tanpa proses "copy" apa pun.
// Nama tabel/bucket lama ('bank_soal_siswa' / 'bank-soal') sudah tidak dipakai kode ini
// sama sekali -- disebut di sini hanya sebagai catatan sejarah migrasi data, bukan
// konstanta aktif (makanya tidak dideklarasikan sebagai variabel, supaya tidak
// memicu warning `no-unused-vars`). Kalau suatu saat perlu migrasi data lama dari
// `bank_soal_siswa`/bucket `bank-soal` ke `materi_file`/`materi-file`, tulis script
// migrasi terpisah (bukan di file ini).

const TABLE_MATERI = 'materi_file';
const TABLE_FOLDER = 'folder_materi';
// 🔧 KONFIRMASI DIPERLUKAN: samakan nama bucket ini dengan bucket yang dipakai
// TeacherUploadMateriModal.jsx (folder TeacherArsipMateri/components/) supaya file
// materi guru & materi upload siswa konsisten disimpan di storage yang sama.
const BUCKET_MATERI = 'materi-file';
const MAX_SIZE_MB = 10;
// Bucket & batas ukuran untuk lampiran di tab "Request Materi" (bukan sama
// dengan BUCKET_MATERI di atas -- itu untuk tab "Upload Arsip"/materi guru).
// Nama bucket ini SENGAJA disamakan dengan yang sudah didokumentasikan untuk
// fitur "Minta Materi" versi StudentHome.js (home/hooks/useMateriRequest.js)
// supaya kedua alur "minta materi" (dari StudentHome maupun dari sini,
// FolderShared tab Request) konsisten pakai bucket & kolom yang sama di
// tabel `materi_request` -- lihat SQL terlampir untuk kolom yang dibutuhkan.
const BUCKET_MATERI_REQUEST = 'materi-request-files';
const MAX_SIZE_REQUEST_MB = 10;
const REQUEST_FILE_ACCEPT = '.pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.ppt,.pptx';
// Kategori upload: materi dari sekolah, hasil penugasan, atau penilaian.
// 🔧 KONFIRMASI DIPERLUKAN: `materi_file` saat ini (dari query di FolderShared.js)
// tidak punya kolom `jenis` -- field ini dulunya cuma ada di `bank_soal_siswa`.
// Kode di bawah mengasumsikan kolom `jenis` (text, nullable) SUDAH/AKAN ditambahkan
// ke `materi_file` lewat migrasi. Kalau belum, siapkan migration SQL-nya dulu:
//   alter table materi_file add column jenis text;
const jenisOptions = ['Materi Sekolah', 'Tugas', 'Penilaian'];
// Opsi mapel untuk form Upload Arsip siswa -- disamakan persis dengan
// MAPEL_OPTIONS di TeacherAbsensi.js / TeacherArsipMateri/useUploadMateriForm.js
// supaya nilai yang tersimpan konsisten dan bisa dicocokkan lintas alur upload
// (guru maupun siswa) saat difilter di dropdown Mapel tab "Materi Dipelajari".
const MAPEL_OPTIONS = ['Matematika', 'Fisika', 'Kimia', 'Bahasa Inggris'];

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
            {item.guruNamaFolder && <span> · folder guru: {item.guruNamaFolder}</span>}
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
  const [guruFilter, setGuruFilter] = useState('Semua Guru');
  const [bulanFilter, setBulanFilter] = useState('Semua Bulan');
  const [viewMode, setViewMode] = useState('list');
  const [expandedIds, setExpandedIds] = useState(new Set());

  // ── State: Request Materi ───────────────────────────────────────────────────
  const [materiRequestList, setMateriRequestList] = useState([]);
  const [requestForm, setRequestForm] = useState({ guruId: '', mapel: '', judul: '', deskripsi: '' });
  const [requestFile, setRequestFile] = useState(null);
  const [requestFileError, setRequestFileError] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [requestMsg, setRequestMsg] = useState(null);

  // ── State: Upload Arsip ─────────────────────────────────────────────────────
  const [entries, setEntries] = useState([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [entriesError, setEntriesError] = useState('');

  const [jenis, setJenis] = useState(jenisOptions[0]);
  const [bab, setBab] = useState('');
  const [subBab, setSubBab] = useState('');
  const [mapel, setMapel] = useState('');
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
  // Kalau diarahkan dari halaman lain (mis. tombol "+ Minta Materi" di
  // StudentHome) dengan navigate(..., { state: { tab: 'request' } }),
  // langsung buka tab yang dituju alih-alih selalu mulai dari 'materi'.
  const location = useLocation();
  const VALID_TABS = ['materi', 'request', 'upload'];
  const initialTab = VALID_TABS.includes(location.state?.tab) ? location.state.tab : 'materi';
  const [activeTab, setActiveTab] = useState(initialTab); // 'materi' | 'request' | 'upload'

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
        // ⚠️ FIX: filter `.eq('kelas', studentProfile.kelas)` yang sebelumnya
        // dipasang di query SQL ini SELALU menerapkan ke SEMUA baris (baik
        // kategori 'Sekolah' maupun 'Request') SEBELUM kita sempat tahu
        // kategorinya apa. Masalahnya: format string `kelas` yang ditulis
        // TeacherAbsensi.js (`${jenjang} ${kelasManual}`, misal "SMA X")
        // hampir pasti TIDAK identik dengan format `profiles.kelas` milik
        // siswa (mis. cuma "X", atau format lain dari form pendaftaran/admin).
        // Begitu tidak match, filter ini menghasilkan 0 baris SAMA SEKALI --
        // termasuk materi kategori 'Sekolah' yang sebenarnya SUDAH benar
        // tertaut ke folder siswa ini lewat `folder_id`/`siswa_id` (link
        // berbasis ID, seharusnya jadi satu-satunya sumber kebenaran untuk
        // kategori 'Sekolah', bukan dobel-disaring lagi pakai string `kelas`
        // yang rawan beda format). Makanya "Materi dari Guru" tampil 0 padahal
        // guru sudah upload & foldernya sudah benar.
        //
        // Perbaikan: filter `kelas` TIDAK lagi dipasang di query SQL. Untuk
        // kategori 'Sekolah', cukup andalkan `folder_materi.siswa_id === userId`
        // (sudah pasti benar, berbasis ID). Untuk kategori 'Request' (yang
        // memang masih broadcast per-kelas, belum folder-scoped -- lihat
        // catatan di bawah), filter `kelas` tetap diterapkan tapi di sisi
        // client saja, supaya satu baris 'Sekolah' yang formatnya beda tidak
        // ikut ke-nolkan gara-gara baris 'Request' lain.
        const { data: fileData, error: fileErr } = await supabase
          .from('materi_file')
          .select('id, nama, tipe, tanggal, url, kelas, status, deskripsi, bab_id, user_id, diupload_oleh, mapel, bab, sub_bab, kategori, folder_id, folder_materi:folder_id ( siswa_id )')
          .in('user_id', profileIds)
          .eq('status', 'Dipublish')
          .in('kategori', ['Sekolah', 'Request'])
          .order('tanggal', { ascending: false });
        if (fileErr) throw fileErr;

        // Materi 'Pribadi' guru sudah tersaring lewat filter kategori di atas
        // (tidak pernah ikut ke-query). Untuk kategori 'Sekolah' (Shared),
        // materi HARUS berada di folder milik siswa ini sendiri
        // (folder_materi.siswa_id === userId) -- kalau folder_id kosong atau
        // folder itu bukan folder siswa ini, materi tidak ditampilkan sama
        // sekali (disepakati: tanpa folder = tidak tampil ke siapapun). Ini
        // link berbasis ID, jadi TIDAK perlu (dan tidak boleh) disaring lagi
        // pakai string `kelas` yang formatnya bisa beda-beda antar file.
        // Kategori 'Request' untuk sementara masih broadcast per-kelas seperti
        // sebelumnya (alur "Kirim Materi" di TeacherHome.js belum dipastikan
        // ikut mengisi folder_id ke folder siswa yang me-request -- perlu
        // ditinjau ulang saat alur itu disentuh), makanya masih perlu
        // dicocokkan ke `studentProfile.kelas` di sini.
        const scopedFileData = (fileData || []).filter((f) => {
          if (f.kategori === 'Sekolah') return f.folder_materi?.siswa_id === userId;
          return !studentProfile?.kelas || f.kelas === studentProfile.kelas; // 'Request'
        });

        setMateriFileAll(scopedFileData);
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
  // Sekarang baca dari `materi_file` (diupload_oleh = siswa ini), lintas semua
  // guru/folder -- bukan lagi dari `bank_soal_siswa`. Field di-mapping ke bentuk
  // lama (judul/file_url/created_at) supaya ArsipEntryCard tidak perlu diubah.
  const loadEntries = useCallback(async () => {
    if (!studentProfile) return;
    setLoadingEntries(true);
    setEntriesError('');
    try {
      const { data, error } = await supabase
        .from(TABLE_MATERI)
        .select('id, jenis, bab, sub_bab, nama, deskripsi, url, tanggal, folder_id, folder_materi:folder_id ( siswa_id, nama, user_id )')
        .eq('diupload_oleh', studentProfile.id)
        .order('tanggal', { ascending: false });
      if (error) throw error;

      const mapped = (data || []).map((m) => ({
        id: m.id,
        jenis: m.jenis,
        bab: m.bab,
        sub_bab: m.sub_bab,
        judul: m.nama,
        deskripsi: m.deskripsi,
        file_url: m.url,
        created_at: m.tanggal,
        folder_id: m.folder_id,
        // Nama guru pemilik folder ditampilkan di kartu supaya siswa tahu
        // arsip ini "nempel" di folder guru yang mana (siswa bisa punya >1 guru).
        guruNamaFolder: guruByProfileId[m.folder_materi?.user_id]?.nama || null,
      }));
      setEntries(mapped);
    } catch (err) {
      setEntriesError('Gagal memuat riwayat: ' + err.message);
    } finally {
      setLoadingEntries(false);
    }
  }, [studentProfile, guruByProfileId]);

  useEffect(() => { if (studentProfile) loadEntries(); }, [studentProfile, loadEntries]);

  // ─── Turunan: daftar Pertemuan (gabungan sesi_pembelajaran + materi_file) ──
  // ⚠️ FIX: sebelumnya pertemuanList HANYA dibangun dari `sesiList`
  // (baris `sesi_pembelajaran`, yaitu laporan absensi dari TeacherAbsensi.js)
  // -- file materi_file yang cocok (guru+tanggal sama) ditempel ke situ, tapi
  // grup guru+tanggal yang TIDAK punya baris sesi_pembelajaran sama sekali
  // dibuang begitu saja. Akibatnya materi Shared yang diupload guru langsung
  // dari TeacherArsipMateri (kategori 'Sekolah', folder milik siswa ini) --
  // tanpa disertai laporan absensi di tanggal yang sama -- tidak pernah
  // muncul sebagai kartu di tab "Materi Dipelajari", walau file-nya sudah
  // benar tersimpan & ikut kehitung di badge total (lihat `materiFileAll.length`
  // di bagian statistik atas). Sekarang setiap grup guru+tanggal yang belum
  // "diklaim" oleh sesi manapun dibuatkan kartu pertemuan tersendiri (tanpa
  // status absensi, karena memang bukan hasil laporan absensi), supaya SEMUA
  // materi Shared yang ditujukan ke folder siswa ini pasti tampil di sini.
  const pertemuanList = useMemo(() => {
    const fileMap = {};
    materiFileAll.forEach(f => {
      const key = `${f.user_id}|${dateKey(f.tanggal)}`;
      if (!fileMap[key]) fileMap[key] = [];
      fileMap[key].push(f);
    });

    const usedKeys = new Set();

    const ascendingSesi = [...sesiList].sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal));

    const sesiEntries = ascendingSesi.map((sesi) => {
      const key = `${sesi.guru_id}|${dateKey(sesi.tanggal)}`;
      usedKeys.add(key);
      const files = fileMap[key] || [];
      const mapelDariFile = files.find(f => f.mapel)?.mapel;
      const guruInfo = guruByProfileId[sesi.guru_id];
      return {
        id: sesi.id,
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

    // Grup guru+tanggal dari materi_file yang tidak punya sesi_pembelajaran
    // pasangannya -- ini yang tadinya hilang. Dibuatkan entri "pertemuan"
    // sintetis (id diprefix `materi-` supaya tidak pernah bentrok dengan id
    // sesi_pembelajaran yang asli).
    const materiOnlyEntries = Object.keys(fileMap)
      .filter((key) => !usedKeys.has(key))
      .map((key) => {
        const files = [...fileMap[key]].sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
        const guruId = key.split('|')[0];
        const guruInfo = guruByProfileId[guruId];
        const mapelDariFile = files.find(f => f.mapel)?.mapel;
        const judulDariFile = files.find(f => f.bab)?.bab;
        return {
          id: `materi-${key}`,
          tanggal: files[0]?.tanggal,
          judulMateri: judulDariFile || null,
          catatan: null,
          status: null,
          guruId,
          guruNama: guruInfo?.nama || 'Guru',
          mapel: mapelDariFile || 'Materi',
          files,
        };
      });

    const built = [...sesiEntries, ...materiOnlyEntries]
      .sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal))
      .map((p, idx) => ({ ...p, pertemuanKe: idx + 1 }));

    return built.reverse();
  }, [sesiList, materiFileAll, guruByProfileId]);

  const mapelOptionsList = useMemo(() => {
    const set = new Set();
    materiFileAll.forEach(f => { if (f.mapel) set.add(f.mapel); });
    return ['Semua Mapel', ...Array.from(set).sort()];
  }, [materiFileAll]);

  // Daftar guru yang muncul di riwayat pertemuan siswa ini (bukan dari
  // materiFileAll supaya nama guru yang dipakai persis sama dengan yang
  // ditampilkan di kartu pertemuan -- lihat p.guruNama di pertemuanList).
  const guruOptionsList = useMemo(() => {
    const set = new Set();
    pertemuanList.forEach(p => { if (p.guruNama) set.add(p.guruNama); });
    return ['Semua Guru', ...Array.from(set).sort()];
  }, [pertemuanList]);

  // Daftar bulan+tahun ("YYYY-MM") yang punya pertemuan, diurutkan dari yang
  // paling baru. Label tampilan ("Agustus 2026") disusun terpisah di
  // bulanFilterLabel supaya value select tetap "YYYY-MM" (gampang dibanding).
  const bulanOptionsList = useMemo(() => {
    const set = new Set();
    pertemuanList.forEach(p => { if (p.tanggal) set.add(dateKey(p.tanggal).slice(0, 7)); });
    return ['Semua Bulan', ...Array.from(set).sort().reverse()];
  }, [pertemuanList]);

  const bulanFilterLabel = (ym) => {
    if (ym === 'Semua Bulan') return ym;
    const [y, m] = ym.split('-');
    return `${BULAN[parseInt(m, 10) - 1]} ${y}`;
  };

  const filteredPertemuan = useMemo(() => {
    return pertemuanList.filter(p => (
      (mapelFilter === 'Semua Mapel' || p.mapel === mapelFilter) &&
      (guruFilter === 'Semua Guru' || p.guruNama === guruFilter) &&
      (bulanFilter === 'Semua Bulan' || dateKey(p.tanggal).slice(0, 7) === bulanFilter)
    ));
  }, [pertemuanList, mapelFilter, guruFilter, bulanFilter]);

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

  const handleRequestFileSelect = (f) => {
    if (!f) return;
    if (f.size > MAX_SIZE_REQUEST_MB * 1024 * 1024) {
      setRequestFileError(`Ukuran file maksimal ${MAX_SIZE_REQUEST_MB}MB.`);
      return;
    }
    setRequestFileError('');
    setRequestFile(f);
  };

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
      // Lampiran opsional: upload dulu ke storage sebelum insert baris
      // `materi_request`, supaya kalau upload gagal, kita tidak kepalang
      // sudah bikin baris request tanpa file yang dijanjikan di form.
      let fileUrl = null;
      let fileName = null;
      if (requestFile) {
        const path = `${userId}/${Date.now()}_${sanitizeFileName(requestFile.name)}`;
        const { error: uploadErr } = await supabase.storage
          .from(BUCKET_MATERI_REQUEST)
          .upload(path, requestFile, { cacheControl: '3600', upsert: false });
        if (uploadErr) throw uploadErr;
        const { data: publicUrlData } = supabase.storage.from(BUCKET_MATERI_REQUEST).getPublicUrl(path);
        fileUrl = publicUrlData?.publicUrl || null;
        fileName = requestFile.name;
      }

      const payload = {
        guru_id: requestForm.guruId,
        siswa_id: userId,
        siswa_nama: studentProfile?.full_name || '-',
        kelas: studentProfile?.kelas || '-',
        mapel: requestForm.mapel || null,
        judul_materi: requestForm.judul.trim(),
        deskripsi: requestForm.deskripsi.trim() || null,
        file_url: fileUrl,
        file_name: fileName,
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

      setRequestForm({ guruId: '', mapel: '', judul: '', deskripsi: '' });
      setRequestFile(null);
      setRequestFileError('');
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
  const [uploadGuruId, setUploadGuruId] = useState('');

  const resetForm = () => {
    setJenis(jenisOptions[0]);
    setBab('');
    setSubBab('');
    setMapel('');
    setJudul('');
    setDeskripsi('');
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Cari folder 'Sekolah' milik siswa ini untuk guru terpilih. Kalau belum ada
  // (mis. guru belum pernah membuka TeacherArsipMateri sejak siswa ini masuk
  // jadwalnya, sehingga syncStudentFolders belum sempat jalan), buat baris
  // folder_materi baru di sini juga -- supaya siswa tidak terblokir menunggu
  // guru buka halaman arsipnya dulu.
  // 🔧 KONFIRMASI DIPERLUKAN: nama kolom folder_materi (terutama `user_id` sebagai
  // pemilik/guru, dan `nama` sebagai judul folder) diasumsikan sama dengan yang
  // dipakai syncStudentFolders() di utils/studentFolderSync.js. Sesuaikan kalau beda.
  const ensureStudentFolder = async (guruProfileId) => {
    const { data: existing, error: findErr } = await supabase
      .from(TABLE_FOLDER)
      .select('id')
      .eq('siswa_id', studentProfile.id)
      .eq('user_id', guruProfileId)
      .eq('kategori', 'Sekolah')
      .maybeSingle();
    if (findErr) throw findErr;
    if (existing) return existing.id;

    const { data: created, error: createErr } = await supabase
      .from(TABLE_FOLDER)
      .insert({
        user_id: guruProfileId,
        siswa_id: studentProfile.id,
        kategori: 'Sekolah',
        nama: studentProfile.full_name || 'Siswa',
      })
      .select('id')
      .single();
    if (createErr) throw createErr;
    return created.id;
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

    if (!uploadGuruId) return setFormError('Pilih guru tujuan terlebih dahulu.');
    if (!mapel) return setFormError('Mapel wajib dipilih.');
    if (!bab.trim()) return setFormError('Bab wajib diisi.');
    if (!judul.trim()) return setFormError('Judul wajib diisi.');
    if (!file) return setFormError('File wajib diupload.');

    const guruInfo = guruByGuruId[uploadGuruId];
    if (!guruInfo?.profile_id) return setFormError('Data guru tujuan tidak lengkap, coba muat ulang halaman.');

    setSubmitting(true);
    try {
      // 1. Pastikan folder 'Sekolah' milik siswa ini untuk guru terpilih ada
      //    (folder yang SAMA dengan yang dilihat guru di TeacherArsipMateri).
      const folderId = await ensureStudentFolder(guruInfo.profile_id);

      // 2. Upload file fisik ke storage.
      const path = `${folderId}/${Date.now()}_${sanitizeFileName(file.name)}`;
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_MATERI)
        .upload(path, file, { cacheControl: '3600', upsert: false });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from(BUCKET_MATERI).getPublicUrl(path);
      const fileUrl = publicUrlData?.publicUrl;
      if (!fileUrl) throw new Error('Gagal mendapatkan URL file setelah upload.');

      // 3. Insert baris materi_file LANGSUNG ke folder guru tsb -- ini yang
      //    membuat file otomatis "muncul" di sisi guru, tanpa proses copy.
      //    status 'Dipublish' supaya langsung terlihat guru di tab default
      //    TeacherArsipMateri (samakan dengan status yang dipakai guru sendiri
      //    saat upload -- 🔧 konfirmasi ulang kalau ternyata perlu status
      //    "menunggu review" dulu sebelum guru approve).
      const { data: inserted, error: insertError } = await supabase
        .from(TABLE_MATERI)
        .insert([
          {
            nama: judul.trim(),
            tipe: fileTypeFromUrl(file.name),
            tanggal: new Date().toISOString(),
            url: fileUrl,
            kelas: studentProfile.kelas || null,
            status: 'Dipublish',
            deskripsi: deskripsi.trim() || null,
            mapel,
            bab: bab.trim(),
            sub_bab: subBab.trim() || null,
            jenis,
            kategori: 'Sekolah',
            folder_id: folderId,
            user_id: guruInfo.profile_id,
            diupload_oleh: studentProfile.id,
          },
        ])
        .select('id, jenis, bab, sub_bab, nama, deskripsi, url, tanggal, folder_id')
        .single();

      if (insertError) throw insertError;

      setEntries((prev) => [
        {
          id: inserted.id,
          jenis: inserted.jenis,
          bab: inserted.bab,
          sub_bab: inserted.sub_bab,
          judul: inserted.nama,
          deskripsi: inserted.deskripsi,
          file_url: inserted.url,
          created_at: inserted.tanggal,
          folder_id: inserted.folder_id,
          guruNamaFolder: guruInfo.nama,
        },
        ...prev,
      ]);
      setFormSuccess(`Berhasil diupload ke folder Anda pada ${guruInfo.nama}.`);
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
        const marker = `/${BUCKET_MATERI}/`;
        const idx = item.file_url.indexOf(marker);
        if (idx !== -1) {
          const path = decodeURIComponent(item.file_url.slice(idx + marker.length));
          await supabase.storage.from(BUCKET_MATERI).remove([path]);
        }
      } catch (storageErr) {
        console.warn('Gagal hapus file di storage:', storageErr.message);
      }

      // Guard `.eq('diupload_oleh', ...)` supaya siswa cuma bisa hapus arsip
      // yang dia sendiri upload -- bukan materi yang diupload guru meski
      // sama-sama ada di folder ini. RLS di sisi Supabase tetap WAJIB
      // menegakkan aturan yang sama (jangan andalkan filter client-side saja).
      const { error } = await supabase
        .from(TABLE_MATERI)
        .delete()
        .eq('id', item.id)
        .eq('diupload_oleh', studentProfile.id);

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
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
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
                    <select
                      value={guruFilter}
                      onChange={e => setGuruFilter(e.target.value)}
                      style={{
                        background: C.cardAlt, color: C.text, border: `1px solid ${C.border}`,
                        borderRadius: '10px', padding: '8px 12px', fontSize: '0.82rem', fontFamily: 'inherit', outline: 'none'
                      }}
                    >
                      {guruOptionsList.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                    <select
                      value={bulanFilter}
                      onChange={e => setBulanFilter(e.target.value)}
                      style={{
                        background: C.cardAlt, color: C.text, border: `1px solid ${C.border}`,
                        borderRadius: '10px', padding: '8px 12px', fontSize: '0.82rem', fontFamily: 'inherit', outline: 'none'
                      }}
                    >
                      {bulanOptionsList.map(b => <option key={b} value={b}>{bulanFilterLabel(b)}</option>)}
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
                          {item.file_url && (
                            <a
                              href={item.file_url} download target="_blank" rel="noreferrer"
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '4px',
                                color: C.gold, fontSize: '0.76rem', fontWeight: 600, textDecoration: 'none'
                              }}
                            >
                              📎 {item.file_name || 'Lampiran'}
                            </a>
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
                <label style={fieldLabel}>Mapel</label>
                <select
                  value={requestForm.mapel}
                  onChange={e => setRequestForm({ ...requestForm, mapel: e.target.value })}
                  style={{ ...fieldInput, cursor: 'pointer' }}
                >
                  <option value="">— Pilih mapel —</option>
                  {MAPEL_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
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

              <div>
                <label style={fieldLabel}>Lampiran (opsional)</label>
                <input
                  type="file"
                  accept={REQUEST_FILE_ACCEPT}
                  onChange={e => handleRequestFileSelect(e.target.files?.[0])}
                  style={{ ...fieldInput, padding: '8px', cursor: 'pointer' }}
                />
                <div style={{ color: C.textFaint, fontSize: '0.72rem', marginTop: '4px' }}>
                  PDF, gambar, Word, Excel, atau PPT, maks {MAX_SIZE_REQUEST_MB}MB. Contoh: foto soal yang belum dipahami.
                </div>
                {requestFile && !requestFileError && (
                  <div style={{ color: C.textDim, fontSize: '0.78rem', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    📎 {requestFile.name}
                    <button
                      type="button"
                      onClick={() => { setRequestFile(null); setRequestFileError(''); }}
                      style={{ background: 'none', border: 'none', color: C.red, cursor: 'pointer', fontSize: '0.78rem', padding: 0 }}
                    >
                      Hapus
                    </button>
                  </div>
                )}
                {requestFileError && (
                  <div style={{ color: C.red, fontSize: '0.76rem', marginTop: '4px' }}>{requestFileError}</div>
                )}
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
                  <label style={fieldLabel}>Guru Tujuan</label>
                  <select value={uploadGuruId} onChange={(e) => setUploadGuruId(e.target.value)} style={{ ...fieldInput, cursor: 'pointer' }}>
                    <option value="">-- Pilih Guru --</option>
                    {guruOptions.map((g) => (
                      <option key={g.id} value={g.id}>{g.nama}</option>
                    ))}
                  </select>
                  <div style={{ fontSize: '0.72rem', color: C.textFaint, marginTop: '4px' }}>
                    File akan tersimpan di folder Anda pada guru ini, dan otomatis terlihat oleh guru tersebut.
                  </div>
                </div>

                <div>
                  <label style={fieldLabel}>Kategori</label>
                  <select value={jenis} onChange={(e) => setJenis(e.target.value)} style={{ ...fieldInput, cursor: 'pointer' }}>
                    {jenisOptions.map((j) => (
                      <option key={j} value={j}>{j}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={fieldLabel}>Mapel</label>
                  <select
                    value={mapel}
                    onChange={(e) => setMapel(e.target.value)}
                    style={{ ...fieldInput, cursor: 'pointer' }}
                  >
                    <option value="">— Pilih mapel —</option>
                    {MAPEL_OPTIONS.map((m) => (
                      <option key={m} value={m}>{m}</option>
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