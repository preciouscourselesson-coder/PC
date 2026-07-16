import React, { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';

const C = {
  gold: '#b4964b',
  goldDark: '#96793a',
  green: '#2d6a4f',
  greenBg: 'rgba(45,106,79,0.10)',
  amber: '#a3760f',
  amberBg: 'rgba(180,150,75,0.14)',
  red: '#b0413e',
  redBg: 'rgba(176,65,62,0.10)',
  dark: '#171411',
  gray: '#726d66',
  grayLight: '#a8a29a',
  cream: '#f7f6f0',
  white: '#ffffff',
  border: '#e6e2d8',
};

// Palet gelap & elegan khusus untuk kartu form input pertemuan
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
  blue: '#4f8fdb',
  danger: '#e0574f',
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

const TeacherAbsensiMateri = () => {
  const isMobile = useIsMobile();
  const [guruId, setGuruId] = useState(null); // auth.uid() / profiles.id — dipakai untuk sesi_pembelajaran.guru_id
  const [guruTableId, setGuruTableId] = useState(null); // guru.id — dipakai untuk filter jadwal_les.guru_id

  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [studentsError, setStudentsError] = useState('');

  // Jadwal les milik guru ini, dipakai untuk auto-isi Kelas saat siswa dipilih (info saja, tidak disimpan)
  const [jadwalLes, setJadwalLes] = useState([]);
  const [loadingJadwal, setLoadingJadwal] = useState(true);
  const [kelasTampil, setKelasTampil] = useState('');

  const [entries, setEntries] = useState([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [entriesError, setEntriesError] = useState('');

  // Form state
  const [siswa, setSiswa] = useState('');
  const [tanggal, setTanggal] = useState('');
  const [materi, setMateri] = useState('');
  const [catatan, setCatatan] = useState('');
  const [buktiFiles, setBuktiFiles] = useState([]); // { file, name, type, size }
  const [errors, setErrors] = useState({});
  const [justAdded, setJustAdded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Filter state
  const [filterSiswa, setFilterSiswa] = useState('Semua Siswa');
  const [filterBulan, setFilterBulan] = useState('Semua Bulan');
  const [search, setSearch] = useState('');
  const [openMenuId, setOpenMenuId] = useState(null);

  // Ambil guru yang sedang login
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setGuruId(data?.user?.id || null);
    });
  }, []);

  // Cari guru.id lewat profile_id (pola wajib: jadwal_les.guru_id -> guru.id, BUKAN profiles.id langsung)
  useEffect(() => {
    if (!guruId) return;
    const loadGuruTableId = async () => {
      const { data, error } = await supabase
        .from('guru')
        .select('id')
        .eq('profile_id', guruId)
        .maybeSingle();
      if (!error) setGuruTableId(data?.id || null);
    };
    loadGuruTableId();
  }, [guruId]);

  // Ambil jadwal les milik guru ini — sumber data untuk auto-isi Kelas saat siswa dipilih
  useEffect(() => {
    if (!guruTableId) return;
    const loadJadwal = async () => {
      setLoadingJadwal(true);
      const { data, error } = await supabase
        .from('jadwal_les')
        .select('kelas, siswa_id, siswa_ids')
        .eq('guru_id', guruTableId);
      if (!error) setJadwalLes(data || []);
      setLoadingJadwal(false);
    };
    loadJadwal();
  }, [guruTableId]);

  // Kumpulkan kelas unik (dari jadwal_les.kelas) untuk siswa yang sedang dipilih di form
  const getKelasOptionsForSiswa = useCallback(
    (siswaId) => {
      if (!siswaId) return [];
      const set = new Set();
      jadwalLes.forEach((j) => {
        const cocok = j.siswa_id === siswaId || (Array.isArray(j.siswa_ids) && j.siswa_ids.includes(siswaId));
        if (cocok && j.kelas) set.add(j.kelas);
      });
      return Array.from(set);
    },
    [jadwalLes]
  );

  const kelasOptionsForSiswa = getKelasOptionsForSiswa(siswa);

  // Auto-isi Kelas tiap kali siswa terpilih berubah (atau data jadwal selesai dimuat)
  useEffect(() => {
    if (kelasOptionsForSiswa.length > 0) {
      setKelasTampil((prev) => (kelasOptionsForSiswa.includes(prev) ? prev : kelasOptionsForSiswa[0]));
    } else {
      setKelasTampil('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siswa, jadwalLes]);

  // Ambil daftar siswa dari tabel profiles
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

  // Ambil riwayat sesi pembelajaran, join ke nama siswa
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
    setMateri('');
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
      // Folder pertama harus UUID milik user yang login, sesuai policy
      // folder-based RLS umum di Supabase Storage:
      // (storage.foldername(name))[1] = auth.uid()
      const path = `${guruId}/${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, item.file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    return urls;
  };

  const handleSubmit = async () => {
    const newErrors = {};
    if (!siswa) newErrors.siswa = 'Pilih siswa terlebih dahulu';
    if (!tanggal) newErrors.tanggal = 'Isi tanggal pertemuan';
    if (!materi.trim()) newErrors.materi = 'Isi judul materi ajar';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSaving(true);
    setSaveError('');
    try {
      const buktiUrls = await uploadBuktiFiles();

      const { error: insertError } = await supabase.from(TABLE).insert({
        siswa_id: siswa,
        guru_id: guruId,
        tanggal,
        judul_materi: materi.trim(),
        catatan: catatan.trim() || null,
        bukti_urls: buktiUrls,
        status: 'Menunggu',
      });
      if (insertError) throw insertError;

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
      window.alert('Gagal menghapus: ' + error.message);
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

  const inputStyle = (hasError) => ({
    width: '100%',
    padding: '10px 12px',
    borderRadius: '10px',
    border: `1.5px solid ${hasError ? C.red : C.border}`,
    fontSize: '0.9rem',
    color: C.dark,
    fontFamily: 'inherit',
    background: C.white,
    outline: 'none',
    boxSizing: 'border-box',
  });

  const labelStyle = {
    display: 'block',
    fontSize: '0.8rem',
    fontWeight: 600,
    color: C.gray,
    marginBottom: '6px',
  };

  const darkInputStyle = (hasError) => ({
    width: '100%',
    padding: '10px 12px',
    borderRadius: '9px',
    border: `1.5px solid ${hasError ? D.danger : D.fieldBorder}`,
    fontSize: '0.9rem',
    color: D.text,
    fontFamily: 'inherit',
    background: D.field,
    outline: 'none',
    boxSizing: 'border-box',
  });

  const darkLabelStyle = {
    display: 'block',
    fontSize: '0.78rem',
    fontWeight: 600,
    color: D.textMuted,
    marginBottom: '6px',
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', fontFamily: 'inherit' }}>
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
        {/* Header bar */}
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
          <span style={{ color: D.gold, fontWeight: 800, fontSize: '1rem', letterSpacing: '0.03em' }}>
            INPUT GURU
          </span>
          <span style={{ color: D.textMuted, fontSize: '0.85rem', fontWeight: 500 }}>
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

              <div style={{ marginTop: '1.1rem' }}>
                <label style={darkLabelStyle}>Kelas</label>
                {!siswa ? (
                  <div style={{ ...darkInputStyle(false), color: D.textFaint, cursor: 'not-allowed' }}>
                    Pilih siswa terlebih dahulu
                  </div>
                ) : loadingJadwal ? (
                  <div style={{ ...darkInputStyle(false), color: D.textFaint }}>Memuat kelas...</div>
                ) : kelasOptionsForSiswa.length === 0 ? (
                  <div style={{ ...darkInputStyle(false), color: D.textFaint }}>
                    Kelas tidak ditemukan di jadwal
                  </div>
                ) : kelasOptionsForSiswa.length === 1 ? (
                  <div style={darkInputStyle(false)}>{kelasOptionsForSiswa[0]}</div>
                ) : (
                  <select
                    value={kelasTampil}
                    onChange={(e) => setKelasTampil(e.target.value)}
                    style={{ ...darkInputStyle(false), cursor: 'pointer' }}
                  >
                    {kelasOptionsForSiswa.map((k) => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                )}
                <div style={{ fontSize: '0.7rem', color: D.textFaint, marginTop: '4px' }}>
                  Otomatis dari jadwal les siswa ini — info saja, tidak disimpan.
                </div>
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
                <label style={darkLabelStyle}>Judul Materi Ajar</label>
                <input
                  type="text"
                  placeholder="cth. Fungsi Kuadrat"
                  value={materi}
                  onChange={(e) => setMateri(e.target.value)}
                  style={darkInputStyle(errors.materi)}
                />
                {errors.materi && <div style={{ color: D.danger, fontSize: '0.75rem', marginTop: '4px' }}>{errors.materi}</div>}
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
                  padding: '1.75rem 1rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ fontSize: '1.6rem', color: D.gold, marginBottom: '6px' }}>⬆</div>
                <div style={{ color: D.text, fontSize: '0.88rem', fontWeight: 500 }}>
                  Drag &amp; Drop file di sini
                </div>
                <div style={{ color: D.textFaint, fontSize: '0.78rem', marginTop: '2px' }}>
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
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: D.textMuted, fontSize: '1rem', padding: '4px' }}
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
              <span style={{ color: '#7fbf9e', fontSize: '0.85rem', fontWeight: 600, textAlign: isMobile ? 'center' : 'left' }}>
                ✓ Pertemuan berhasil dicatat
              </span>
            )}
            <button
              onClick={resetForm}
              disabled={saving}
              style={{ background: 'none', border: `1.5px solid ${D.fieldBorder}`, padding: '10px 20px', borderRadius: '10px', cursor: 'pointer', color: D.textMuted, fontWeight: '500' }}
            >
              Batal
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              style={{ background: D.gold, border: 'none', padding: '10px 26px', borderRadius: '10px', cursor: saving ? 'default' : 'pointer', color: '#241d0d', fontWeight: '700', opacity: saving ? 0.7 : 1 }}
            >
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </div>
      </div>

      {/* Tabel Riwayat */}
      <div style={{ background: C.white, borderRadius: '16px', border: `1.5px solid ${C.border}`, padding: isMobile ? '1.1rem' : '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: isMobile ? '1rem' : '1.15rem', fontWeight: '700', color: C.dark, margin: 0 }}>Riwayat Absensi &amp; Materi</h2>
          <span style={{ fontSize: '0.8rem', color: C.gray }}>
            {filteredEntries.length} dari {entries.length} pertemuan
          </span>
        </div>

        {/* Filters */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div>
            <label style={{ ...labelStyle, fontSize: '0.72rem' }}>Nama Siswa</label>
            <select value={filterSiswa} onChange={(e) => setFilterSiswa(e.target.value)} style={{ ...inputStyle(false), cursor: 'pointer', fontSize: '0.85rem' }}>
              <option>Semua Siswa</option>
              {students.map((s) => (
                <option key={s.id} value={s.full_name}>{s.full_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ ...labelStyle, fontSize: '0.72rem' }}>Bulan</label>
            <select value={filterBulan} onChange={(e) => setFilterBulan(e.target.value)} style={{ ...inputStyle(false), cursor: 'pointer', fontSize: '0.85rem' }}>
              {bulanOptions.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ ...labelStyle, fontSize: '0.72rem' }}>Cari</label>
            <input
              type="text"
              placeholder="Cari materi atau catatan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ ...inputStyle(false), fontSize: '0.85rem' }}
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
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.gray, fontSize: '1.1rem', padding: '0 4px', flexShrink: 0 }}
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
                        <button style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', color: C.dark, fontSize: '0.82rem' }}>
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', color: C.red, fontSize: '0.82rem' }}
                        >
                          Hapus
                        </button>
                      </div>
                    )}
                  </div>

                  <div style={{ fontSize: '0.85rem', fontWeight: 500, color: C.dark }}>{item.judul_materi}</div>
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
                              width: '24px', height: '24px', borderRadius: '6px',
                              background: fileTypeFromUrl(url) === 'pdf' ? '#e0574f' : '#3f7ea6',
                              color: '#fff', fontSize: '0.55rem', fontWeight: 700,
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
                                width: '22px',
                                height: '22px',
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
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.gray, fontSize: '1.1rem', padding: '0 6px' }}
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
                            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', color: C.dark, fontSize: '0.82rem' }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', color: C.red, fontSize: '0.82rem' }}
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

export default TeacherAbsensiMateri;