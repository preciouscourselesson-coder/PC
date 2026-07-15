// StudentAbsent.js (dengan header dihapus)
import React, { useState, useEffect, useCallback } from 'react';
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

const TABLE = 'sesi_pembelajaran';

const StudentAbsent = () => {
  const [studentProfile, setStudentProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [entries, setEntries] = useState([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [entriesError, setEntriesError] = useState('');

  const [filterBulan, setFilterBulan] = useState('Semua Bulan');
  const [search, setSearch] = useState('');

  const [confirming, setConfirming] = useState({});
  const [actionMessage, setActionMessage] = useState({});

  // Ambil data siswa yang login
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

  // Ambil riwayat pertemuan untuk siswa ini (tanpa join)
  const loadEntries = useCallback(async () => {
    if (!studentProfile) return;
    setLoadingEntries(true);
    setEntriesError('');

    try {
      const { data: sesiData, error: sesiError } = await supabase
        .from('sesi_pembelajaran')
        .select('id, tanggal, judul_materi, catatan, bukti_urls, status, guru_id')
        .eq('siswa_id', studentProfile.id)
        .order('tanggal', { ascending: false });

      if (sesiError) throw sesiError;

      if (!sesiData || sesiData.length === 0) {
        setEntries([]);
        setLoadingEntries(false);
        return;
      }

      const guruIds = [...new Set(sesiData.map(s => s.guru_id).filter(Boolean))];

      let guruMap = {};
      if (guruIds.length > 0) {
        const { data: guruProfiles, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', guruIds);

        if (!profileError) {
          guruMap = guruProfiles.reduce((acc, p) => {
            acc[p.id] = p.full_name;
            return acc;
          }, {});
        }
      }

      const entriesWithGuru = sesiData.map(s => ({
        ...s,
        profiles: {
          full_name: guruMap[s.guru_id] || 'Guru tidak ditemukan'
        }
      }));

      setEntries(entriesWithGuru);
    } catch (err) {
      setEntriesError('Gagal memuat riwayat: ' + err.message);
    } finally {
      setLoadingEntries(false);
    }
  }, [studentProfile]);

  useEffect(() => {
    if (studentProfile) {
      loadEntries();
    }
  }, [studentProfile, loadEntries]);

  const bulanOptions = ['Semua Bulan', ...Array.from(new Set(entries.map((e) => bulanFromIso(e.tanggal))))];

  const filteredEntries = entries.filter((e) => {
    if (filterBulan !== 'Semua Bulan' && bulanFromIso(e.tanggal) !== filterBulan) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      if (!e.judul_materi.toLowerCase().includes(q) && !(e.catatan || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // ─── Konfirmasi (Terima) ──────────────────────────────────────────────
  const handleKonfirmasi = async (id) => {
    setConfirming((prev) => ({ ...prev, [id]: true }));
    try {
      const { error } = await supabase
        .from(TABLE)
        .update({ status: 'Disetujui' })
        .eq('id', id)
        .eq('siswa_id', studentProfile.id)
        .eq('status', 'Menunggu');

      if (error) throw error;

      setEntries((prev) =>
        prev.map((e) =>
          e.id === id ? { ...e, status: 'Disetujui' } : e
        )
      );
      setActionMessage({ [id]: { type: 'success', text: 'Pertemuan telah dikonfirmasi.' } });
      setTimeout(() => setActionMessage({}), 3000);
    } catch (err) {
      setActionMessage({ [id]: { type: 'error', text: 'Gagal konfirmasi: ' + err.message } });
      setTimeout(() => setActionMessage({}), 3000);
    } finally {
      setConfirming((prev) => ({ ...prev, [id]: false }));
    }
  };

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
      {/* Tabel Riwayat (tanpa header terpisah) */}
      <div style={{ background: C.white, borderRadius: '16px', border: `1.5px solid ${C.border}`, padding: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: '700', color: C.dark, margin: 0 }}>Riwayat Absensi &amp; Materi</h2>
          <span style={{ fontSize: '0.8rem', color: C.gray }}>
            {filteredEntries.length} dari {entries.length} pertemuan
          </span>
        </div>

        {/* Filters */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
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

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: C.cream }}>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}`, borderRadius: '8px 0 0 0' }}>No.</th>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Tanggal</th>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Guru</th>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Materi</th>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Catatan Guru</th>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Bukti</th>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Status</th>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Tindak Lanjut</th>
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
                const namaGuru = item.profiles?.full_name || 'Guru tidak ditemukan';
                const isMenunggu = item.status === 'Menunggu';
                const isConfirmed = item.status === 'Disetujui';

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
                            background: avatarColor(namaGuru),
                            color: C.white,
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {initials(namaGuru)}
                        </span>
                        <span style={{ fontWeight: 500 }}>{namaGuru}</span>
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
                    <td style={{ padding: '10px', minWidth: '150px' }}>
                      {isConfirmed ? (
                        <span style={{ color: C.green, fontSize: '0.8rem' }}>✓ Sudah dikonfirmasi</span>
                      ) : isMenunggu ? (
                        <div>
                          <button
                            onClick={() => handleKonfirmasi(item.id)}
                            disabled={confirming[item.id]}
                            style={{
                              background: confirming[item.id] ? C.grayLight : C.green,
                              border: 'none',
                              padding: '6px 14px',
                              borderRadius: '6px',
                              cursor: confirming[item.id] ? 'default' : 'pointer',
                              color: '#fff',
                              fontWeight: 600,
                              fontSize: '0.8rem',
                              opacity: confirming[item.id] ? 0.6 : 1,
                            }}
                          >
                            {confirming[item.id] ? '...' : '✓ Terima'}
                          </button>
                          {actionMessage[item.id] && (
                            <div style={{ marginTop: '4px', fontSize: '0.75rem', color: actionMessage[item.id].type === 'error' ? C.red : C.green }}>
                              {actionMessage[item.id].text}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: C.gray, fontSize: '0.8rem' }}>Tidak perlu tindakan</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!loadingEntries && filteredEntries.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: C.grayLight }}>
                    Belum ada pertemuan yang tercatat untuk Anda.
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

export default StudentAbsent;