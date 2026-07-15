// StudentArsip.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  blue: '#3f7ea6',
  blueBg: 'rgba(63,126,166,0.10)',
  dark: '#171411',
  gray: '#726d66',
  grayLight: '#a8a29a',
  cream: '#f7f6f0',
  white: '#ffffff',
  border: '#e6e2d8',
};

const TABLE = 'bank_soal_siswa';
const BUCKET = 'bank-soal';
const MAX_SIZE_MB = 10;
const jenisOptions = ['Ulangan', 'Penugasan'];

const jenisStyle = (jenis) =>
  jenis === 'Ulangan' ? { bg: C.blueBg, fg: C.blue } : { bg: C.amberBg, fg: C.amber };

const fileTypeFromUrl = (url = '') => {
  const ext = url.toLowerCase().split('.').pop();
  if (ext === 'pdf') return 'pdf';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'img';
  if (['doc', 'docx'].includes(ext)) return 'doc';
  return 'file';
};

const fileBadgeColor = (type) => {
  if (type === 'pdf') return '#e0574f';
  if (type === 'img') return '#3f7ea6';
  if (type === 'doc') return '#2d6a4f';
  return '#726d66';
};

const formatTanggalDisplay = (isoDatetime) => {
  if (!isoDatetime) return '-';
  const d = new Date(isoDatetime);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const sanitizeFileName = (name = '') => name.replace(/[^a-zA-Z0-9._-]/g, '_');

const StudentArsip = () => {
  const [studentProfile, setStudentProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [entries, setEntries] = useState([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [entriesError, setEntriesError] = useState('');

  // Form upload
  const [jenis, setJenis] = useState('Ulangan');
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

  // Filter riwayat
  const [filterJenis, setFilterJenis] = useState('Semua');
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState({});

  // ─── Ambil profil siswa yang login ─────────────────────────────────────
  useEffect(() => {
    const loadProfile = async () => {
      setLoadingProfile(true);
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        setLoadingProfile(false);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('id', userData.user.id)
        .eq('role', 'student')
        .maybeSingle();

      if (error) {
        console.error('Gagal ambil profil siswa:', error.message);
      } else {
        setStudentProfile(data);
      }
      setLoadingProfile(false);
    };
    loadProfile();
  }, []);

  // ─── Ambil riwayat upload siswa ini ────────────────────────────────────
  const loadEntries = useCallback(async () => {
    if (!studentProfile) return;
    setLoadingEntries(true);
    setEntriesError('');

    try {
      const { data, error } = await supabase
        .from(TABLE)
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

  useEffect(() => {
    if (studentProfile) loadEntries();
  }, [studentProfile, loadEntries]);

  // ─── Form helpers ───────────────────────────────────────────────────────
  const resetForm = () => {
    setJenis('Ulangan');
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
        .from(BUCKET)
        .upload(path, file, { cacheControl: '3600', upsert: false });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const fileUrl = publicUrlData?.publicUrl;
      if (!fileUrl) throw new Error('Gagal mendapatkan URL file setelah upload.');

      const { data: inserted, error: insertError } = await supabase
        .from(TABLE)
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
      // Hapus file di storage dulu (best-effort, tidak menggagalkan proses
      // kalau ternyata file sudah tidak ada / gagal dihapus)
      try {
        const marker = `/${BUCKET}/`;
        const idx = item.file_url.indexOf(marker);
        if (idx !== -1) {
          const path = decodeURIComponent(item.file_url.slice(idx + marker.length));
          await supabase.storage.from(BUCKET).remove([path]);
        }
      } catch (storageErr) {
        console.warn('Gagal hapus file di storage:', storageErr.message);
      }

      const { error } = await supabase
        .from(TABLE)
        .delete()
        .eq('id', item.id)
        .eq('siswa_id', studentProfile.id);

      if (error) throw error;

      setEntries((prev) => prev.filter((e) => e.id !== item.id));
    } catch (err) {
      alert('Gagal menghapus: ' + err.message);
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

  // ─── Styles ─────────────────────────────────────────────────────────────
  const card = {
    background: C.white,
    borderRadius: '16px',
    border: `1.5px solid ${C.border}`,
    padding: '1.75rem',
    marginBottom: '1.5rem',
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.8rem',
    fontWeight: 600,
    color: C.gray,
    marginBottom: '6px',
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '10px',
    border: `1.5px solid ${C.border}`,
    fontSize: '0.9rem',
    color: C.dark,
    fontFamily: 'inherit',
    background: C.white,
    outline: 'none',
    boxSizing: 'border-box',
  };

  if (loadingProfile) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem', textAlign: 'center', color: C.gray }}>
        Memuat profil siswa...
      </div>
    );
  }

  if (!studentProfile) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem', textAlign: 'center', color: C.red }}>
        Anda tidak terdaftar sebagai siswa. Silakan hubungi admin.
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', fontFamily: 'inherit' }}>
      {/* Form Upload */}
      <div style={card}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: C.dark, margin: '0 0 1.25rem' }}>
          Upload Ulangan / Penugasan
        </h2>

        <form onSubmit={handleSubmit}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              marginBottom: '1rem',
            }}
          >
            <div>
              <label style={labelStyle}>Jenis</label>
              <select value={jenis} onChange={(e) => setJenis(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                {jenisOptions.map((j) => (
                  <option key={j} value={j}>{j}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Bab</label>
              <input
                type="text"
                list="bab-suggestions"
                value={bab}
                onChange={(e) => setBab(e.target.value)}
                placeholder="cth. Fungsi Kuadrat"
                style={inputStyle}
              />
              <datalist id="bab-suggestions">
                {babSuggestions.map((b) => (
                  <option key={b} value={b} />
                ))}
              </datalist>
            </div>

            <div>
              <label style={labelStyle}>Sub Bab (opsional)</label>
              <input
                type="text"
                value={subBab}
                onChange={(e) => setSubBab(e.target.value)}
                placeholder="cth. Menentukan Titik Puncak"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Judul</label>
              <input
                type="text"
                value={judul}
                onChange={(e) => setJudul(e.target.value)}
                placeholder="cth. Ulangan Harian 1"
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Deskripsi (opsional)</label>
            <textarea
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              placeholder="Catatan tambahan tentang file ini..."
              rows={3}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>File</label>
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              style={{
                border: `2px dashed ${dragActive ? C.gold : C.border}`,
                borderRadius: '12px',
                padding: '1.5rem',
                textAlign: 'center',
                cursor: 'pointer',
                background: dragActive ? C.amberBg : C.cream,
                transition: 'background 0.15s, border-color 0.15s',
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                onChange={(e) => handleFileSelect(e.target.files?.[0])}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                style={{ display: 'none' }}
              />
              {file ? (
                <div style={{ color: C.dark, fontWeight: 600, fontSize: '0.9rem' }}>
                  📎 {file.name}
                  <div style={{ fontWeight: 400, color: C.gray, fontSize: '0.78rem', marginTop: '4px' }}>
                    Klik untuk ganti file
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ color: C.gold, fontSize: '1.3rem', marginBottom: '4px' }}>⬆</div>
                  <div style={{ color: C.dark, fontWeight: 600, fontSize: '0.9rem' }}>Drag &amp; Drop file di sini</div>
                  <div style={{ color: C.gray, fontSize: '0.78rem', marginTop: '2px' }}>
                    atau klik untuk memilih file (PDF, gambar, atau Word, maks {MAX_SIZE_MB}MB)
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
            <button
              type="submit"
              disabled={submitting}
              style={{
                background: submitting ? C.grayLight : C.gold,
                border: 'none',
                padding: '10px 24px',
                borderRadius: '10px',
                cursor: submitting ? 'default' : 'pointer',
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.9rem',
              }}
            >
              {submitting ? 'Mengupload...' : 'Upload'}
            </button>
          </div>
        </form>
      </div>

      {/* Riwayat Upload */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: C.dark, margin: 0 }}>Riwayat Upload Saya</h2>
          <span style={{ fontSize: '0.8rem', color: C.gray }}>
            {filteredEntries.length} dari {entries.length} file
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div>
            <label style={{ ...labelStyle, fontSize: '0.72rem' }}>Jenis</label>
            <select value={filterJenis} onChange={(e) => setFilterJenis(e.target.value)} style={{ ...inputStyle, cursor: 'pointer', fontSize: '0.85rem' }}>
              <option value="Semua">Semua</option>
              {jenisOptions.map((j) => (
                <option key={j} value={j}>{j}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ ...labelStyle, fontSize: '0.72rem' }}>Cari</label>
            <input
              type="text"
              placeholder="Cari judul, bab, atau deskripsi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ ...inputStyle, fontSize: '0.85rem' }}
            />
          </div>
        </div>

        {entriesError && (
          <div style={{ color: C.red, fontSize: '0.85rem', marginBottom: '1rem' }}>{entriesError}</div>
        )}

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: C.cream }}>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Tanggal</th>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Jenis</th>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Bab / Sub Bab</th>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Judul</th>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>File</th>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loadingEntries && (
                <tr>
                  <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: C.grayLight }}>
                    Memuat riwayat...
                  </td>
                </tr>
              )}
              {!loadingEntries && filteredEntries.map((item) => {
                const js = jenisStyle(item.jenis);
                const ftype = fileTypeFromUrl(item.file_url);
                return (
                  <tr key={item.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: '10px', whiteSpace: 'nowrap', color: C.gray }}>
                      {formatTanggalDisplay(item.created_at)}
                    </td>
                    <td style={{ padding: '10px' }}>
                      <span
                        style={{
                          background: js.bg,
                          color: js.fg,
                          padding: '4px 12px',
                          borderRadius: '999px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {item.jenis}
                      </span>
                    </td>
                    <td style={{ padding: '10px', minWidth: '160px' }}>
                      <div style={{ fontWeight: 600, color: C.dark }}>{item.bab}</div>
                      {item.sub_bab && (
                        <div style={{ color: C.gray, fontSize: '0.78rem' }}>{item.sub_bab}</div>
                      )}
                    </td>
                    <td style={{ padding: '10px', minWidth: '160px' }}>
                      <div style={{ fontWeight: 500, color: C.dark }}>{item.judul}</div>
                      {item.deskripsi && (
                        <div style={{ color: C.gray, fontSize: '0.78rem' }}>{item.deskripsi}</div>
                      )}
                    </td>
                    <td style={{ padding: '10px' }}>
                      <a
                        href={item.file_url}
                        target="_blank"
                        rel="noreferrer"
                        title={item.file_name}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '30px',
                          height: '30px',
                          borderRadius: '8px',
                          background: fileBadgeColor(ftype),
                          color: '#fff',
                          fontSize: '0.6rem',
                          fontWeight: 700,
                          textDecoration: 'none',
                        }}
                      >
                        {ftype.toUpperCase()}
                      </a>
                    </td>
                    <td style={{ padding: '10px' }}>
                      <button
                        onClick={() => handleDelete(item)}
                        disabled={deleting[item.id]}
                        style={{
                          background: 'transparent',
                          border: `1.5px solid ${C.red}`,
                          color: C.red,
                          padding: '5px 12px',
                          borderRadius: '6px',
                          cursor: deleting[item.id] ? 'default' : 'pointer',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          opacity: deleting[item.id] ? 0.6 : 1,
                        }}
                      >
                        {deleting[item.id] ? '...' : 'Hapus'}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!loadingEntries && filteredEntries.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: C.grayLight }}>
                    Belum ada file yang diupload.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StudentArsip;