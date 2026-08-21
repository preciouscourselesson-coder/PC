import React, { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import Toast, { useToast } from '../shared/Toast';
import { C, D } from '../shared/Theme';
import { syncStudentFolders } from '../../utils/studentFolderSync';

const MOBILE_BREAKPOINT = 768;

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

const formatFileSize = (bytes) => {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const initials = (name = '') =>
  name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const avatarPalette = ['#b4964b', '#2d6a4f', '#7a5c9e', '#3f7ea6', '#b0413e', '#a3760f'];
const avatarColor = (name = '') => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return avatarPalette[Math.abs(hash) % avatarPalette.length];
};

const formatTanggalDisplay = (isoDate) => {
  if (!isoDate) return '-';
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
};

const bulanFromIso = (isoDate) => {
  if (!isoDate) return '';
  const bulanNama = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];
  const [y, m] = isoDate.split('-');
  return `${bulanNama[parseInt(m, 10) - 1]} ${y}`;
};

const fileTypeFromUrl = (url = '') => (url.toLowerCase().endsWith('.pdf') ? 'pdf' : 'img');
const fileNameFromUrl = (url = '') => decodeURIComponent(url.split('/').pop() || 'file');

const statusStyle = (status) => {
  if (status === 'Disetujui') return { bg: C.greenBg, fg: C.green };
  if (status === 'Ditolak') return { bg: C.redBg, fg: C.red };
  return { bg: C.amberBg, fg: C.amber };
};

const BUCKET = 'materi';
const TABLE = 'sesi_pembelajaran';

const JENJANG_OPTIONS = ['SD', 'SMP', 'SMA'];
const KELAS_OPTIONS_BY_JENJANG = {
  SD: ['I', 'II', 'III', 'IV', 'V', 'VI'],
  SMP: ['VII', 'VIII', 'IX'],
  SMA: ['X', 'XI', 'XII'],
};
const MAPEL_OPTIONS = ['Matematika', 'Fisika', 'Kimia', 'Bahasa Inggris'];

/* ============================================================
   TeacherAbsensi (sebelumnya TeacherAbsensiMateri)

   Komponen ini murni untuk laporan kehadiran/sesi pembelajaran:
   siswa, tanggal, judul materi yang dibahas (teks singkat), catatan,
   dan bukti foto/PDF per pertemuan (tabel sesi_pembelajaran).

   Manajemen file materi yang sesungguhnya (upload, folder, kategori)
   TIDAK ditangani di sini — itu semua ada di TeacherArsipMateri.js.
   Field "Judul Materi Ajar" di form ini hanya catatan judul, bukan
   referensi ke file materi.

   Rencana ke depan: materi yang dipublish lewat TeacherArsipMateri
   akan disinkronkan ke tab "Materi Dipelajari" pada FolderShared.js
   (folder di sisi siswa), sehingga siswa melihat materi per folder
   yang sama seperti yang dikelola gurunya di TeacherArsipMateri.
   ============================================================ */
const TeacherAbsensi = () => {
  const isMobile = useIsMobile();
  const [guruId, setGuruId] = useState(null);
  const [guruMapel, setGuruMapel] = useState('');
  const [guruNama, setGuruNama] = useState('');

  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [studentsError, setStudentsError] = useState('');
  const { toast, showToast } = useToast();

  const [entries, setEntries] = useState([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [entriesError, setEntriesError] = useState('');

  const [siswa, setSiswa] = useState('');
  const [tanggal, setTanggal] = useState('');
  const [jenjang, setJenjang] = useState('');
  const [kelasManual, setKelasManual] = useState('');
  const [mapel, setMapel] = useState('');
  const [bab, setBab] = useState('');
  const [subBab, setSubBab] = useState('');
  const [catatan, setCatatan] = useState('');
  const [buktiFiles, setBuktiFiles] = useState([]);
  const [errors, setErrors] = useState({});
  const [justAdded, setJustAdded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const [filterSiswa, setFilterSiswa] = useState('Semua Siswa');
  const [filterBulan, setFilterBulan] = useState('Semua Bulan');
  const [search, setSearch] = useState('');
  const [openMenuId, setOpenMenuId] = useState(null);

  // Alat migrasi satu-kali: menyalin bukti file dari pertemuan LAMA (yang
  // dibuat sebelum copyBuktiToArsipMateri ada) ke Arsip Materi per folder
  // siswa. Lihat migrateOldFilesToArsip() di bawah.
  const [migrating, setMigrating] = useState(false);
  const [migrateResult, setMigrateResult] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setGuruId(data?.user?.id || null);
    });
  }, []);

  useEffect(() => {
    if (!guruId) return;
    const loadGuruMapel = async () => {
      const { data, error } = await supabase
        .from('guru')
        .select('mapel')
        .eq('profile_id', guruId)
        .maybeSingle();
      if (!error) {
        setGuruMapel(data?.mapel || '');
      }
    };
    loadGuruMapel();

    const loadGuruNama = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', guruId)
        .maybeSingle();
      if (!error) setGuruNama(data?.full_name || '');
    };
    loadGuruNama();
  }, [guruId]);

  // Set default mapel dari mapel guru (kalau cocok dengan salah satu opsi)
  useEffect(() => {
    if (guruMapel && MAPEL_OPTIONS.includes(guruMapel)) {
      setMapel((prev) => prev || guruMapel);
    }
  }, [guruMapel]);

  // Opsi kelas manual (Bab/Sub-Bab) mengikuti jenjang yang dipilih guru
  const kelasManualOptions = jenjang ? KELAS_OPTIONS_BY_JENJANG[jenjang] || [] : [];

  useEffect(() => {
    setKelasManual((prev) => (kelasManualOptions.includes(prev) ? prev : ''));
  }, [jenjang]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const loadStudents = async () => {
      setLoadingStudents(true);
      setStudentsError('');
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'student')
        .order('full_name', { ascending: true });

      if (error) {
        setStudentsError('Gagal memuat daftar siswa: ' + error.message);
      } else {
        setStudents(data || []);
      }
      setLoadingStudents(false);
    };
    loadStudents();
  }, []);

  const loadEntries = useCallback(async () => {
    setLoadingEntries(true);
    setEntriesError('');
    const { data, error } = await supabase
      .from(TABLE)
      .select('id, tanggal, judul_materi, catatan, bukti_urls, status, siswa_id, profiles:siswa_id(full_name)')
      .order('tanggal', { ascending: false });

    if (error) {
      setEntriesError('Gagal memuat riwayat: ' + error.message);
    } else {
      setEntries(data || []);
    }
    setLoadingEntries(false);
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const addFiles = (fileList) => {
    const files = Array.from(fileList || []);
    const mapped = files.map((f) => ({
      file: f,
      name: f.name,
      type: f.type.includes('pdf') ? 'pdf' : 'img',
      size: f.size,
    }));
    setBuktiFiles((prev) => [...prev, ...mapped]);
  };

  const handleFileChange = (e) => {
    addFiles(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const removeFile = (idx) => {
    setBuktiFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const resetForm = () => {
    setSiswa('');
    setTanggal('');
    setJenjang('');
    setKelasManual('');
    setMapel('');
    setBab('');
    setSubBab('');
    setCatatan('');
    setBuktiFiles([]);
    setErrors({});
    setSaveError('');
  };

  const uploadBuktiFiles = async () => {
    if (!guruId) {
      throw new Error('Sesi login guru tidak ditemukan. Silakan login ulang sebelum mengunggah file.');
    }
    const urls = [];
    for (const item of buktiFiles) {
      const safeName = item.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${guruId}/${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, item.file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    return urls;
  };

  // Pastikan siswa ini punya folder Shared (kategori 'Sekolah') di Arsip
  // Materi, lalu kembalikan id folder-nya. Dipanggil sebelum menyalin bukti
  // supaya bukti tidak pernah nyangkut tanpa folder (materi Shared tanpa
  // folder tidak akan pernah muncul di FolderShared siswa -- lihat filter
  // di FolderShared.js).
  const ensureStudentFolderId = async (siswaId) => {
    // syncStudentFolders aman dipanggil berkali-kali (idempotent) -- akan
    // membuatkan folder utk siswa yang belum punya, tanpa menyentuh yang
    // sudah ada. Tidak diberi onDuplicateConfirm: kalau kebetulan ada
    // konflik nama folder, siswa itu dilewati dulu (folder_id akan null,
    // guru bisa selesaikan konfliknya lewat halaman Arsip Materi nanti).
    await syncStudentFolders(guruId);
    const { data } = await supabase
      .from('folder_materi')
      .select('id')
      .eq('user_id', guruId)
      .eq('siswa_id', siswaId)
      .maybeSingle();
    return data?.id || null;
  };

  // Salin bukti (foto/PDF) yang baru diupload ke Arsip Materi (materi_file)
  // sebagai materi kategori 'Sekolah' (Shared), supaya siswa ybs bisa
  // melihatnya juga lewat FolderShared, dan guru bisa memantaunya dari
  // TeacherArsipMateri. Kalau ini gagal, laporan absensi TETAP tersimpan --
  // hanya penyalinannya yang gagal, jadi guru diberi tahu lewat toast tapi
  // tidak kehilangan data absensinya.
  const copyBuktiToArsipMateri = async (buktiUrls) => {
    if (!buktiUrls.length) return;
    try {
      const folderId = await ensureStudentFolderId(siswa);
      // ⚠️ FIX: sebelumnya pakai `new Date(`${tanggal}T00:00:00`).toISOString()`
      // -- string tanpa akhiran 'Z' di-parse sebagai jam LOKAL, lalu digeser ke
      // UTC saat toISOString(). Untuk timezone WIB (UTC+7), tengah malam
      // tanggal 19 jadi jam 17:00 tanggal 18 UTC -- 10 karakter pertama ISO-nya
      // (dipakai FolderShared.js sebagai kunci penjodohan dengan
      // sesi_pembelajaran.tanggal) jadi MUNDUR SATU HARI dari tanggal yang
      // benar-benar dipilih guru. Akibatnya file ini tidak pernah "nyantol"
      // ke pertemuan manapun di tab "Materi Dipelajari" siswa, walau baris
      // materi_file-nya sendiri sudah benar (makanya tetap muncul normal di
      // TeacherArsipMateri yang filternya per-folder, bukan per-tanggal).
      //
      // Susun ISO string manual sebagai UTC eksplisit -- tidak lewat parsing
      // Date() sama sekali -- supaya 10 karakter pertama SELALU identik
      // dengan `tanggal` yang diketik guru & yang disimpan di
      // sesi_pembelajaran.tanggal, di timezone manapun server/browser berjalan.
      const tanggalIso = `${tanggal}T00:00:00.000Z`;
      const rows = buktiUrls.map((url, idx) => ({
        user_id: guruId,
        nama: bab.trim(),
        tipe: buktiFiles[idx]?.type === 'pdf' ? 'application/pdf' : 'image',
        tanggal: tanggalIso,
        url,
        kelas: `${jenjang} ${kelasManual}`,
        status: 'Dipublish',
        deskripsi: catatan.trim() || null,
        mapel: mapel || null,
        bab: bab.trim(),
        sub_bab: subBab.trim() || null,
        diupload_oleh: guruNama,
        kategori: 'Sekolah',
        folder_id: folderId,
        bentuk: 'File',
        pengajar: guruNama,
        jenis: 'Materi',
      }));
      const { error } = await supabase.from('materi_file').insert(rows);
      if (error) throw error;
    } catch (err) {
      showToast('error', 'Absensi tersimpan, tapi gagal menyalin bukti ke Arsip Materi: ' + err.message);
    }
  };

  const handleSubmit = async () => {
    const newErrors = {};
    if (!siswa) newErrors.siswa = 'Pilih siswa terlebih dahulu';
    if (!tanggal) newErrors.tanggal = 'Isi tanggal pertemuan';
    if (!jenjang) newErrors.jenjang = 'Pilih jenjang';
    if (!kelasManual) newErrors.kelasManual = 'Pilih kelas';
    if (!mapel) newErrors.mapel = 'Pilih mapel';
    if (!bab.trim()) newErrors.bab = 'Isi bab';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSaving(true);
    setSaveError('');
    try {
      const buktiUrls = await uploadBuktiFiles();
      const judulMateri = subBab.trim() ? `${bab.trim()} - ${subBab.trim()}` : bab.trim();

      // CATATAN: kolom jenjang, kelas, mapel, bab, sub_bab harus sudah ada
      // di tabel sesi_pembelajaran (Supabase) agar insert ini berhasil.
      const { error: insertError } = await supabase.from(TABLE).insert({
        siswa_id: siswa,
        guru_id: guruId,
        tanggal,
        judul_materi: judulMateri,
        jenjang,
        kelas: kelasManual,
        mapel,
        bab: bab.trim(),
        sub_bab: subBab.trim() || null,
        catatan: catatan.trim() || null,
        bukti_urls: buktiUrls,
        status: 'Menunggu',
      });
      if (insertError) throw insertError;

      await copyBuktiToArsipMateri(buktiUrls);

      resetForm();
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 2200);
      await loadEntries();
    } catch (err) {
      setSaveError('Gagal menyimpan: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setOpenMenuId(null);
    const prevEntries = entries;
    setEntries((prev) => prev.filter((e) => e.id !== id));
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) {
      setEntries(prevEntries);
      showToast('error', 'Gagal menghapus: ' + error.message);
    }
  };

  // ============================================================
  // Migrasi satu-kali: pindahkan bukti file dari pertemuan LAMA ke Arsip
  // Materi (materi_file), per folder siswa masing-masing.
  //
  // Sebelum copyBuktiToArsipMateri() ada, bukti yang diupload lewat form
  // di atas hanya tersimpan di sesi_pembelajaran.bukti_urls -- tidak pernah
  // disalin ke materi_file. Fungsi ini menyisir SEMUA pertemuan milik guru
  // yang sedang login, lalu untuk tiap url bukti yang BELUM ada di
  // materi_file, disalin dengan mapping field yang sama persis seperti
  // copyBuktiToArsipMateri (kategori 'Sekolah', folder sesuai siswa).
  //
  // Aman dijalankan berkali-kali (idempotent): url yang sudah pernah
  // disalin (baik oleh alat ini maupun oleh alur upload normal) dideteksi
  // lewat pengecekan `materi_file.url` yang sudah ada, jadi tidak akan
  // pernah dobel.
  // ============================================================
  const migrateOldFilesToArsip = async () => {
    if (!guruId) return;
    if (!window.confirm('Pindahkan semua file bukti dari pertemuan lama ke Arsip Materi (folder per siswa)? Proses ini aman dijalankan berkali-kali dan tidak akan menggandakan file yang sudah pernah dipindahkan.')) {
      return;
    }
    setMigrating(true);
    setMigrateResult(null);
    try {
      // 1. Ambil semua pertemuan milik guru ini yang punya bukti_urls.
      const { data: sesiRows, error: sesiErr } = await supabase
        .from(TABLE)
        .select('id, siswa_id, tanggal, judul_materi, jenjang, kelas, mapel, bab, sub_bab, catatan, bukti_urls')
        .eq('guru_id', guruId);
      if (sesiErr) throw sesiErr;

      const withBukti = (sesiRows || []).filter(
        (r) => Array.isArray(r.bukti_urls) && r.bukti_urls.length > 0
      );
      if (withBukti.length === 0) {
        setMigrateResult('Tidak ada file bukti pada riwayat pertemuan yang perlu dipindahkan.');
        return;
      }

      // 2. Cek url mana saja yang SUDAH ada di materi_file supaya tidak
      // disalin dobel (baik hasil migrasi sebelumnya maupun hasil alur
      // upload normal / copyBuktiToArsipMateri untuk entri baru).
      const allUrls = withBukti.flatMap((r) => r.bukti_urls);
      const { data: existingRows, error: existErr } = await supabase
        .from('materi_file')
        .select('url')
        .eq('user_id', guruId)
        .in('url', allUrls);
      if (existErr) throw existErr;
      const existingUrls = new Set((existingRows || []).map((e) => e.url));

      // 3. Cache folder_id per siswa (sekali sync per siswa saja).
      const folderCache = new Map();
      const getFolderId = async (siswaId) => {
        if (folderCache.has(siswaId)) return folderCache.get(siswaId);
        await syncStudentFolders(guruId);
        const { data } = await supabase
          .from('folder_materi')
          .select('id')
          .eq('user_id', guruId)
          .eq('siswa_id', siswaId)
          .maybeSingle();
        const folderId = data?.id || null;
        folderCache.set(siswaId, folderId);
        return folderId;
      };

      // 4. Susun baris materi_file baru untuk url yang belum pernah disalin.
      const rowsToInsert = [];
      const siswaTanpaFolder = new Set();
      for (const sesi of withBukti) {
        const urlsBaru = sesi.bukti_urls.filter((u) => !existingUrls.has(u));
        if (urlsBaru.length === 0) continue;

        const folderId = await getFolderId(sesi.siswa_id);
        if (!folderId) siswaTanpaFolder.add(sesi.siswa_id);

        // Sama seperti copyBuktiToArsipMateri: susun ISO manual sebagai UTC
        // eksplisit supaya 10 karakter pertama tetap identik dengan
        // sesi_pembelajaran.tanggal, di timezone manapun.
        const tanggalIso = `${sesi.tanggal}T00:00:00.000Z`;
        const namaMateri = (sesi.bab || sesi.judul_materi || '').trim();

        urlsBaru.forEach((url) => {
          rowsToInsert.push({
            user_id: guruId,
            nama: namaMateri,
            tipe: fileTypeFromUrl(url) === 'pdf' ? 'application/pdf' : 'image',
            tanggal: tanggalIso,
            url,
            kelas: `${sesi.jenjang || ''} ${sesi.kelas || ''}`.trim(),
            status: 'Dipublish',
            deskripsi: (sesi.catatan || '').trim() || null,
            mapel: sesi.mapel || null,
            bab: (sesi.bab || '').trim(),
            sub_bab: (sesi.sub_bab || '').trim() || null,
            diupload_oleh: guruNama,
            kategori: 'Sekolah',
            folder_id: folderId,
            bentuk: 'File',
            pengajar: guruNama,
            jenis: 'Materi',
          });
        });
      }

      if (rowsToInsert.length === 0) {
        setMigrateResult('Semua file bukti sudah ada di Arsip Materi. Tidak ada yang dipindahkan.');
        return;
      }

      const { error: insertErr } = await supabase.from('materi_file').insert(rowsToInsert);
      if (insertErr) throw insertErr;

      const ringkasan = siswaTanpaFolder.size > 0
        ? `${rowsToInsert.length} file dipindahkan ke Arsip Materi. ${siswaTanpaFolder.size} siswa belum punya folder (file tersalin tanpa folder, bisa dirapikan lewat Arsip Materi).`
        : `${rowsToInsert.length} file berhasil dipindahkan ke Arsip Materi, masing-masing ke folder siswanya.`;
      setMigrateResult(ringkasan);
      showToast('success', ringkasan);
    } catch (err) {
      const msg = 'Gagal memindahkan file lama: ' + err.message;
      setMigrateResult(msg);
      showToast('error', msg);
    } finally {
      setMigrating(false);
    }
  };

  const bulanOptions = ['Semua Bulan', ...Array.from(new Set(entries.map((e) => bulanFromIso(e.tanggal))))];

  const filteredEntries = entries.filter((e) => {
    const namaSiswa = e.profiles?.full_name || '';
    if (filterSiswa !== 'Semua Siswa' && namaSiswa !== filterSiswa) return false;
    if (filterBulan !== 'Semua Bulan' && bulanFromIso(e.tanggal) !== filterBulan) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      if (!e.judul_materi.toLowerCase().includes(q) && !(e.catatan || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // ======================== STYLE FUNCTIONS ========================
  const inputStyle = (hasError) => ({
    width: '100%',
    padding: isMobile ? '12px 14px' : '10px 12px',
    borderRadius: '10px',
    border: `1.5px solid ${hasError ? C.red : C.border}`,
    fontSize: isMobile ? '16px' : '0.9rem',
    color: C.dark,
    fontFamily: 'inherit',
    background: C.white,
    outline: 'none',
    boxSizing: 'border-box',
  });

  const labelStyle = {
    display: 'block',
    fontSize: isMobile ? '0.9rem' : '0.8rem',
    fontWeight: 600,
    color: C.gray,
    marginBottom: '6px',
  };

  const darkInputStyle = (hasError) => ({
    width: '100%',
    padding: isMobile ? '12px 14px' : '10px 12px',
    borderRadius: '9px',
    border: `1.5px solid ${hasError ? D.danger : D.fieldBorder}`,
    fontSize: isMobile ? '16px' : '0.9rem',
    color: D.text,
    fontFamily: 'inherit',
    background: D.field,
    outline: 'none',
    boxSizing: 'border-box',
  });

  const darkLabelStyle = {
    display: 'block',
    fontSize: isMobile ? '0.9rem' : '0.78rem',
    fontWeight: 600,
    color: D.textMuted,
    marginBottom: '6px',
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', fontFamily: 'inherit' }}>
      <Toast toast={toast} />
      {/* Form Input Pertemuan - kartu elegan bertema gelap */}
      <div
        style={{
          background: D.bg,
          borderRadius: '16px',
          overflow: 'hidden',
          marginBottom: '1.5rem',
          boxShadow: '0 12px 32px rgba(0,0,0,0.28)',
        }}
      >
        <div
          style={{
            padding: isMobile ? '0.9rem 1.1rem' : '1.1rem 1.75rem',
            background: D.bgSoft,
            borderBottom: `1px solid ${D.gold}`,
            display: 'flex',
            alignItems: 'baseline',
            gap: '10px',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ color: D.gold, fontWeight: 800, fontSize: isMobile ? '1rem' : '1rem', letterSpacing: '0.03em' }}>
            INPUT GURU
          </span>
          <span style={{ color: D.textMuted, fontSize: isMobile ? '0.9rem' : '0.85rem', fontWeight: 500 }}>
            (Tambah Laporan Pembelajaran)
          </span>
        </div>

        <div style={{ padding: isMobile ? '1.1rem' : '1.75rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))', gap: isMobile ? '1.25rem' : '2rem' }}>
            {/* Kolom kiri */}
            <div>
              <label style={darkLabelStyle}>Nama Siswa</label>
              <select
                value={siswa}
                onChange={(e) => setSiswa(e.target.value)}
                disabled={loadingStudents}
                style={{ ...darkInputStyle(errors.siswa), cursor: 'pointer' }}
              >
                <option value="">{loadingStudents ? 'Memuat siswa...' : '— Pilih siswa —'}</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.full_name}</option>
                ))}
              </select>
              {errors.siswa && <div style={{ color: D.danger, fontSize: '0.75rem', marginTop: '4px' }}>{errors.siswa}</div>}
              {studentsError && <div style={{ color: D.danger, fontSize: '0.75rem', marginTop: '4px' }}>{studentsError}</div>}

              <div style={{ marginTop: '1.1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div>
                  <label style={darkLabelStyle}>Jenjang</label>
                  <select
                    value={jenjang}
                    onChange={(e) => setJenjang(e.target.value)}
                    style={{ ...darkInputStyle(errors.jenjang), cursor: 'pointer' }}
                  >
                    <option value="">— Pilih —</option>
                    {JENJANG_OPTIONS.map((j) => (
                      <option key={j} value={j}>{j}</option>
                    ))}
                  </select>
                  {errors.jenjang && <div style={{ color: D.danger, fontSize: '0.75rem', marginTop: '4px' }}>{errors.jenjang}</div>}
                </div>

                <div>
                  <label style={darkLabelStyle}>Kelas</label>
                  <select
                    value={kelasManual}
                    onChange={(e) => setKelasManual(e.target.value)}
                    disabled={!jenjang}
                    style={{ ...darkInputStyle(errors.kelasManual), cursor: jenjang ? 'pointer' : 'not-allowed' }}
                  >
                    <option value="">{jenjang ? '— Pilih —' : 'Pilih jenjang dulu'}</option>
                    {kelasManualOptions.map((k) => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                  {errors.kelasManual && <div style={{ color: D.danger, fontSize: '0.75rem', marginTop: '4px' }}>{errors.kelasManual}</div>}
                </div>
              </div>

              <div style={{ marginTop: '1.1rem' }}>
                <label style={darkLabelStyle}>Mapel</label>
                <select
                  value={mapel}
                  onChange={(e) => setMapel(e.target.value)}
                  style={{ ...darkInputStyle(errors.mapel), cursor: 'pointer' }}
                >
                  <option value="">— Pilih mapel —</option>
                  {MAPEL_OPTIONS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                {errors.mapel && <div style={{ color: D.danger, fontSize: '0.75rem', marginTop: '4px' }}>{errors.mapel}</div>}
              </div>

              <div style={{ marginTop: '1.1rem' }}>
                <label style={darkLabelStyle}>Tanggal</label>
                <input
                  type="date"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  style={darkInputStyle(errors.tanggal)}
                />
                {tanggal && (
                  <div style={{ fontSize: '0.75rem', color: D.textMuted, marginTop: '4px' }}>
                    {formatTanggalDisplay(tanggal)}
                  </div>
                )}
                {errors.tanggal && <div style={{ color: D.danger, fontSize: '0.75rem', marginTop: '4px' }}>{errors.tanggal}</div>}
              </div>

              <div style={{ marginTop: '1.1rem' }}>
                <label style={darkLabelStyle}>Bab</label>
                <input
                  type="text"
                  placeholder="cth. Fungsi Kuadrat"
                  value={bab}
                  onChange={(e) => setBab(e.target.value)}
                  style={darkInputStyle(errors.bab)}
                />
                {errors.bab && <div style={{ color: D.danger, fontSize: '0.75rem', marginTop: '4px' }}>{errors.bab}</div>}
              </div>

              <div style={{ marginTop: '1.1rem' }}>
                <label style={darkLabelStyle}>Sub-Bab</label>
                <input
                  type="text"
                  placeholder="cth. Menentukan Titik Puncak (opsional)"
                  value={subBab}
                  onChange={(e) => setSubBab(e.target.value)}
                  style={darkInputStyle(false)}
                />
              </div>

              <div style={{ marginTop: '1.1rem' }}>
                <label style={darkLabelStyle}>Catatan Selama Pembelajaran</label>
                <textarea
                  placeholder="Apa yang dibahas, sejauh mana progresnya, latihan soal berapa..."
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  rows={5}
                  style={{ ...darkInputStyle(false), resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>
            </div>

            {/* Kolom kanan */}
            <div>
              <label style={darkLabelStyle}>Upload Bukti Pembelajaran</label>
              <div
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                style={{
                  border: `1.5px dashed ${isDragging ? D.gold : D.fieldBorder}`,
                  background: isDragging ? D.goldSoft : D.field,
                  borderRadius: '12px',
                  padding: isMobile ? '1.5rem 1rem' : '1.75rem 1rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  minHeight: isMobile ? '120px' : 'auto',
                }}
              >
                <div style={{ fontSize: isMobile ? '2rem' : '1.6rem', color: D.gold, marginBottom: '6px' }}>⬆</div>
                <div style={{ color: D.text, fontSize: isMobile ? '1rem' : '0.88rem', fontWeight: 500 }}>
                  Drag &amp; Drop file di sini
                </div>
                <div style={{ color: D.textFaint, fontSize: isMobile ? '0.9rem' : '0.78rem', marginTop: '2px' }}>
                  atau klik untuk memilih file
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,image/*"
                multiple
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />

              {buktiFiles.length > 0 && (
                <div style={{ marginTop: '0.85rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {buktiFiles.map((f, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        background: D.field,
                        border: `1px solid ${D.fieldBorder}`,
                        borderRadius: '10px',
                        padding: '8px 10px',
                      }}
                    >
                      <span
                        style={{
                          width: '30px',
                          height: '30px',
                          borderRadius: '7px',
                          background: f.type === 'pdf' ? D.red : D.blue,
                          color: '#fff',
                          fontSize: '0.62rem',
                          fontWeight: 800,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {f.type === 'pdf' ? 'PDF' : 'IMG'}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: D.text, fontSize: '0.83rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {f.name}
                        </div>
                        <div style={{ color: D.textFaint, fontSize: '0.72rem' }}>{formatFileSize(f.size)}</div>
                      </div>
                      <button
                        onClick={() => removeFile(idx)}
                        aria-label="Hapus file"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: D.textMuted, fontSize: '1.2rem', padding: '6px', minHeight: '44px', minWidth: '44px' }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ marginTop: '1.1rem' }}>
                <label style={darkLabelStyle}>Status</label>
                <select value="Menunggu Persetujuan" disabled style={{ ...darkInputStyle(false), cursor: 'not-allowed', color: D.textMuted }}>
                  <option>Menunggu Persetujuan</option>
                </select>
                <div style={{ fontSize: '0.7rem', color: D.textFaint, marginTop: '4px' }}>
                  Status berubah setelah ditinjau oleh admin.
                </div>
              </div>
            </div>
          </div>

          {saveError && (
            <div style={{ color: D.danger, fontSize: '0.82rem', marginTop: '1rem' }}>{saveError}</div>
          )}

          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column-reverse' : 'row',
            justifyContent: 'flex-end',
            alignItems: isMobile ? 'stretch' : 'center',
            gap: '0.75rem',
            marginTop: '1.5rem',
          }}>
            {justAdded && (
              <span style={{ color: '#7fbf9e', fontSize: isMobile ? '1rem' : '0.85rem', fontWeight: 600, textAlign: isMobile ? 'center' : 'left' }}>
                ✓ Pertemuan berhasil dicatat
              </span>
            )}
            <button
              onClick={resetForm}
              disabled={saving}
              style={{
                background: 'none',
                border: `1.5px solid ${D.fieldBorder}`,
                padding: isMobile ? '12px 24px' : '10px 20px',
                borderRadius: '10px',
                cursor: saving ? 'not-allowed' : 'pointer',
                color: D.textMuted,
                fontWeight: '500',
                fontSize: isMobile ? '16px' : '0.9rem',
                minHeight: isMobile ? '48px' : 'auto',
                fontFamily: 'inherit',
              }}
            >
              Batal
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              style={{
                background: D.gold,
                border: 'none',
                padding: isMobile ? '12px 28px' : '10px 26px',
                borderRadius: '10px',
                cursor: saving ? 'default' : 'pointer',
                color: '#241d0d',
                fontWeight: '700',
                opacity: saving ? 0.7 : 1,
                fontSize: isMobile ? '16px' : '0.9rem',
                minHeight: isMobile ? '48px' : 'auto',
                fontFamily: 'inherit',
              }}
            >
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </div>
      </div>

      {/* Tabel Riwayat */}
      <div style={{ background: C.white, borderRadius: '16px', border: `1.5px solid ${C.border}`, padding: isMobile ? '1.1rem' : '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: isMobile ? '1.1rem' : '1.15rem', fontWeight: '700', color: C.dark, margin: 0 }}>Riwayat Absensi &amp; Materi</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', color: C.gray }}>
              {filteredEntries.length} dari {entries.length} pertemuan
            </span>
            {/* Alat migrasi satu-kali: salin bukti dari pertemuan lama ke Arsip
                Materi (folder per siswa). Aman diklik berkali-kali. */}
            <button
              type="button"
              onClick={migrateOldFilesToArsip}
              disabled={migrating}
              title="Pindahkan bukti file dari pertemuan lama ke Arsip Materi, sesuai folder siswa masing-masing"
              style={{
                background: 'none',
                border: `1.5px solid ${C.border}`,
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: C.gray,
                cursor: migrating ? 'default' : 'pointer',
                opacity: migrating ? 0.6 : 1,
              }}
            >
              {migrating ? 'Memindahkan...' : 'Pindahkan File Lama ke Arsip'}
            </button>
          </div>
        </div>
        {migrateResult && (
          <div style={{ fontSize: '0.8rem', color: C.gray, marginBottom: '0.75rem' }}>{migrateResult}</div>
        )}

        {/* Filters */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div>
            <label style={{ ...labelStyle, fontSize: isMobile ? '0.85rem' : '0.72rem' }}>Nama Siswa</label>
            <select value={filterSiswa} onChange={(e) => setFilterSiswa(e.target.value)} style={{ ...inputStyle(false), cursor: 'pointer', fontSize: isMobile ? '16px' : '0.85rem' }}>
              <option>Semua Siswa</option>
              {students.map((s) => (
                <option key={s.id} value={s.full_name}>{s.full_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ ...labelStyle, fontSize: isMobile ? '0.85rem' : '0.72rem' }}>Bulan</label>
            <select value={filterBulan} onChange={(e) => setFilterBulan(e.target.value)} style={{ ...inputStyle(false), cursor: 'pointer', fontSize: isMobile ? '16px' : '0.85rem' }}>
              {bulanOptions.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ ...labelStyle, fontSize: isMobile ? '0.85rem' : '0.72rem' }}>Cari</label>
            <input
              type="text"
              placeholder="Cari materi atau catatan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ ...inputStyle(false), fontSize: isMobile ? '16px' : '0.85rem' }}
            />
          </div>
        </div>

        {entriesError && (
          <div style={{ color: C.red, fontSize: '0.85rem', marginBottom: '1rem' }}>{entriesError}</div>
        )}

        {/* Riwayat: kartu di mobile, tabel di desktop */}
        {isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {loadingEntries && (
              <div style={{ padding: '2rem', textAlign: 'center', color: C.grayLight }}>Memuat riwayat...</div>
            )}
            {!loadingEntries && filteredEntries.length === 0 && (
              <div style={{ padding: '2rem', textAlign: 'center', color: C.grayLight }}>
                Belum ada pertemuan yang cocok dengan filter ini.
              </div>
            )}
            {!loadingEntries && filteredEntries.map((item) => {
              const st = statusStyle(item.status);
              const namaSiswa = item.profiles?.full_name || 'Siswa tidak ditemukan';
              return (
                <div
                  key={item.id}
                  style={{
                    border: `1.5px solid ${C.border}`,
                    borderRadius: '14px',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    position: 'relative',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <span
                        style={{
                          width: '28px', height: '28px', borderRadius: '50%',
                          background: avatarColor(namaSiswa), color: C.white,
                          fontSize: '0.65rem', fontWeight: 700,
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}
                      >
                        {initials(namaSiswa)}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: C.dark, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{namaSiswa}</div>
                        <div style={{ fontSize: '0.72rem', color: C.gray }}>{formatTanggalDisplay(item.tanggal)}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.gray, fontSize: '1.2rem', padding: '6px', minHeight: '44px', minWidth: '44px', flexShrink: 0 }}
                    >
                      ⋮
                    </button>
                    {openMenuId === item.id && (
                      <div
                        style={{
                          position: 'absolute', right: '0.5rem', top: '2.5rem',
                          background: C.white, border: `1px solid ${C.border}`, borderRadius: '8px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.08)', zIndex: 10, minWidth: '110px',
                        }}
                      >
                        <button style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', color: C.dark, fontSize: '0.9rem' }}>
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', color: C.red, fontSize: '0.9rem' }}
                        >
                          Hapus
                        </button>
                      </div>
                    )}
                  </div>

                  <div style={{ fontSize: '0.9rem', fontWeight: 500, color: C.dark }}>{item.judul_materi}</div>
                  {item.catatan && (
                    <div style={{ fontSize: '0.8rem', color: C.gray }}>{item.catatan}</div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                    <span style={{ background: st.bg, color: st.fg, padding: '3px 10px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 600 }}>
                      {item.status}
                    </span>
                    {item.bukti_urls && item.bukti_urls.length > 0 && (
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {item.bukti_urls.map((url, i) => (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            title={fileNameFromUrl(url)}
                            style={{
                              width: '32px', height: '32px', borderRadius: '6px',
                              background: fileTypeFromUrl(url) === 'pdf' ? '#e0574f' : '#3f7ea6',
                              color: '#fff', fontSize: '0.6rem', fontWeight: 700,
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none',
                            }}
                          >
                            {fileTypeFromUrl(url) === 'pdf' ? 'PDF' : 'IMG'}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: C.cream }}>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}`, borderRadius: '8px 0 0 0' }}>No.</th>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Tanggal</th>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Siswa</th>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Judul Materi Ajar</th>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Catatan</th>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Bukti</th>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Status</th>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}`, borderRadius: '0 8px 0 0' }}></th>
              </tr>
            </thead>
            <tbody>
              {loadingEntries && (
                <tr>
                  <td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: C.grayLight }}>
                    Memuat riwayat...
                  </td>
                </tr>
              )}
              {!loadingEntries && filteredEntries.map((item, idx) => {
                const st = statusStyle(item.status);
                const namaSiswa = item.profiles?.full_name || 'Siswa tidak ditemukan';
                return (
                  <tr key={item.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: '10px', color: C.gray }}>{idx + 1}</td>
                    <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>{formatTanggalDisplay(item.tanggal)}</td>
                    <td style={{ padding: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            width: '26px',
                            height: '26px',
                            borderRadius: '50%',
                            background: avatarColor(namaSiswa),
                            color: C.white,
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {initials(namaSiswa)}
                        </span>
                        <span style={{ fontWeight: 500 }}>{namaSiswa}</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px', fontWeight: '500', minWidth: '140px' }}>{item.judul_materi}</td>
                    <td style={{ padding: '10px', color: C.gray, minWidth: '220px' }}>{item.catatan || '-'}</td>
                    <td style={{ padding: '10px' }}>
                      {(!item.bukti_urls || item.bukti_urls.length === 0) ? (
                        <span style={{ color: C.grayLight }}>-</span>
                      ) : (
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {item.bukti_urls.map((url, i) => (
                            <a
                              key={i}
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              title={fileNameFromUrl(url)}
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '6px',
                                background: fileTypeFromUrl(url) === 'pdf' ? '#e0574f' : '#3f7ea6',
                                color: '#fff',
                                fontSize: '0.55rem',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                textDecoration: 'none',
                              }}
                            >
                              {fileTypeFromUrl(url) === 'pdf' ? 'PDF' : 'IMG'}
                            </a>
                          ))}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '10px' }}>
                      <span
                        style={{
                          background: st.bg,
                          color: st.fg,
                          padding: '4px 12px',
                          borderRadius: '999px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px', position: 'relative' }}>
                      <button
                        onClick={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.gray, fontSize: '1.2rem', padding: '6px', minHeight: '44px', minWidth: '44px' }}
                      >
                        ⋮
                      </button>
                      {openMenuId === item.id && (
                        <div
                          style={{
                            position: 'absolute',
                            right: 0,
                            top: '30px',
                            background: C.white,
                            border: `1px solid ${C.border}`,
                            borderRadius: '8px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                            zIndex: 10,
                            minWidth: '110px',
                          }}
                        >
                          <button
                            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', color: C.dark, fontSize: '0.9rem' }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', color: C.red, fontSize: '0.9rem' }}
                          >
                            Hapus
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!loadingEntries && filteredEntries.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: C.grayLight }}>
                    Belum ada pertemuan yang cocok dengan filter ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        )}
      </div>
    </div>
  );
};

export default TeacherAbsensi;