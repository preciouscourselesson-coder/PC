import React, { useState, useEffect, useCallback, useMemo } from 'react';
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

const TABLE = 'sesi_pembelajaran';
const GURU_TABLE = 'guru';
const MOBILE_BREAKPOINT = 768;

// ---------- Helpers (selaras dengan TeacherAbsensiMateri.js) ----------

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

// ---------- Komponen kecil ----------

const StatCard = ({ label, value, fg, bg }) => (
  <div
    style={{
      background: bg || C.cream,
      borderRadius: '14px',
      padding: '1rem 1.1rem',
      flex: '1 1 150px',
      border: `1px solid ${C.border}`,
    }}
  >
    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: C.gray, marginBottom: '6px' }}>{label}</div>
    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: fg || C.dark }}>{value}</div>
  </div>
);

const MiniStatusBar = ({ counts }) => {
  const total = (counts.Menunggu || 0) + (counts.Disetujui || 0) + (counts.Ditolak || 0);
  if (total === 0) return <span style={{ color: C.grayLight, fontSize: '0.75rem' }}>Belum ada data</span>;
  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
      {counts.Disetujui > 0 && (
        <span style={{ background: C.greenBg, color: C.green, borderRadius: '999px', padding: '2px 8px', fontSize: '0.7rem', fontWeight: 700 }}>
          {counts.Disetujui} Disetujui
        </span>
      )}
      {counts.Menunggu > 0 && (
        <span style={{ background: C.amberBg, color: C.amber, borderRadius: '999px', padding: '2px 8px', fontSize: '0.7rem', fontWeight: 700 }}>
          {counts.Menunggu} Menunggu
        </span>
      )}
      {counts.Ditolak > 0 && (
        <span style={{ background: C.redBg, color: C.red, borderRadius: '999px', padding: '2px 8px', fontSize: '0.7rem', fontWeight: 700 }}>
          {counts.Ditolak} Ditolak
        </span>
      )}
    </div>
  );
};

const AdminAbsensi = () => {
  const isMobile = useIsMobile();

  const [entries, setEntries] = useState([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [entriesError, setEntriesError] = useState('');

  const [guruList, setGuruList] = useState([]); // [{id (=profiles.id), full_name}]
  const [studentList, setStudentList] = useState([]); // [{id, full_name}]
  const [loadingMasters, setLoadingMasters] = useState(true);

  const [filterGuru, setFilterGuru] = useState('Semua Guru');
  const [filterSiswa, setFilterSiswa] = useState('Semua Siswa');
  const [filterBulan, setFilterBulan] = useState('Semua Bulan');
  const [filterStatus, setFilterStatus] = useState('Semua Status');
  const [search, setSearch] = useState('');
  const [openMenuId, setOpenMenuId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [rekapTab, setRekapTab] = useState('guru'); // 'guru' | 'siswa'

  // Ambil daftar guru (lewat tabel guru -> profiles, konsisten dgn pola jadwal_les)
  useEffect(() => {
    const loadMasters = async () => {
      setLoadingMasters(true);
      const [guruRes, siswaRes] = await Promise.all([
        supabase.from(GURU_TABLE).select('id, profile_id, profiles:profiles!profile_id(full_name)'),
        supabase.from('profiles').select('id, full_name').eq('role', 'student').order('full_name', { ascending: true }),
      ]);
      if (!guruRes.error) {
        const list = (guruRes.data || [])
          .map((g) => ({ id: g.profile_id, full_name: g.profiles?.full_name || 'Guru tanpa nama' }))
          .sort((a, b) => a.full_name.localeCompare(b.full_name));
        setGuruList(list);
      }
      if (!siswaRes.error) setStudentList(siswaRes.data || []);
      setLoadingMasters(false);
    };
    loadMasters();
  }, []);

  // Ambil seluruh sesi pembelajaran, join nama siswa & nama guru
  const loadEntries = useCallback(async () => {
    setLoadingEntries(true);
    setEntriesError('');
    const { data, error } = await supabase
      .from(TABLE)
      .select(
        'id, tanggal, judul_materi, catatan, bukti_urls, status, siswa_id, guru_id, siswa:profiles!sesi_pembelajaran_siswa_id_fkey(full_name), guruProfile:profiles!sesi_pembelajaran_guru_id_fkey(full_name)'
      )
      .order('tanggal', { ascending: false });

    if (error) {
      setEntriesError('Gagal memuat data pertemuan: ' + error.message);
    } else {
      setEntries(data || []);
    }
    setLoadingEntries(false);
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  // ---------- Rekap per guru & per siswa ----------

  const rekapPerGuru = useMemo(() => {
    const map = new Map();
    guruList.forEach((g) => map.set(g.id, { id: g.id, nama: g.full_name, total: 0, Menunggu: 0, Disetujui: 0, Ditolak: 0 }));
    entries.forEach((e) => {
      const key = e.guru_id;
      if (!map.has(key)) {
        map.set(key, { id: key, nama: e.guruProfile?.full_name || 'Guru tidak dikenal', total: 0, Menunggu: 0, Disetujui: 0, Ditolak: 0 });
      }
      const row = map.get(key);
      row.total += 1;
      row[e.status] = (row[e.status] || 0) + 1;
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [entries, guruList]);

  const rekapPerSiswa = useMemo(() => {
    const map = new Map();
    studentList.forEach((s) => map.set(s.id, { id: s.id, nama: s.full_name, total: 0, Menunggu: 0, Disetujui: 0, Ditolak: 0 }));
    entries.forEach((e) => {
      const key = e.siswa_id;
      if (!map.has(key)) {
        map.set(key, { id: key, nama: e.siswa?.full_name || 'Siswa tidak dikenal', total: 0, Menunggu: 0, Disetujui: 0, Ditolak: 0 });
      }
      const row = map.get(key);
      row.total += 1;
      row[e.status] = (row[e.status] || 0) + 1;
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [entries, studentList]);

  // ---------- Statistik ringkas ----------

  const totalPertemuan = entries.length;
  const totalMenunggu = entries.filter((e) => e.status === 'Menunggu').length;
  const totalDisetujui = entries.filter((e) => e.status === 'Disetujui').length;
  const totalDitolak = entries.filter((e) => e.status === 'Ditolak').length;
  const guruAktifCount = rekapPerGuru.filter((g) => g.total > 0).length;
  const siswaAktifCount = rekapPerSiswa.filter((s) => s.total > 0).length;

  const bulanOptions = ['Semua Bulan', ...Array.from(new Set(entries.map((e) => bulanFromIso(e.tanggal)))).filter(Boolean)];

  // ---------- Filter tabel detail ----------

  const filteredEntries = entries.filter((e) => {
    const namaSiswa = e.siswa?.full_name || '';
    const namaGuru = e.guruProfile?.full_name || '';
    if (filterGuru !== 'Semua Guru' && e.guru_id !== filterGuru) return false;
    if (filterSiswa !== 'Semua Siswa' && e.siswa_id !== filterSiswa) return false;
    if (filterBulan !== 'Semua Bulan' && bulanFromIso(e.tanggal) !== filterBulan) return false;
    if (filterStatus !== 'Semua Status' && e.status !== filterStatus) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      if (
        !e.judul_materi.toLowerCase().includes(q) &&
        !(e.catatan || '').toLowerCase().includes(q) &&
        !namaSiswa.toLowerCase().includes(q) &&
        !namaGuru.toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  // ---------- Aksi admin: ubah status ----------

  const handleUpdateStatus = async (id, newStatus) => {
    setOpenMenuId(null);
    setUpdatingId(id);
    const prevEntries = entries;
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, status: newStatus } : e)));
    const { error } = await supabase.from(TABLE).update({ status: newStatus }).eq('id', id);
    if (error) {
      setEntries(prevEntries);
      window.alert('Gagal mengubah status: ' + error.message);
    }
    setUpdatingId(null);
  };

  const selectStyle = {
    padding: '9px 12px',
    borderRadius: '9px',
    border: `1.5px solid ${C.border}`,
    fontSize: '0.85rem',
    color: C.dark,
    background: C.white,
    cursor: 'pointer',
    outline: 'none',
  };

  const rekapRows = rekapTab === 'guru' ? rekapPerGuru : rekapPerSiswa;

  return (
    <div style={{ maxWidth: '1300px', margin: '0 auto', fontFamily: 'inherit' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: C.dark }}>Monitoring Pertemuan</h2>
        <p style={{ margin: '4px 0 0', color: C.gray, fontSize: '0.88rem' }}>
          Pantau pertemuan yang dilaporkan oleh setiap guru dan yang diikuti tiap siswa.
        </p>
      </div>

      {/* Statistik ringkas */}
      <div style={{ display: 'flex', gap: '0.9rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <StatCard label="Total Pertemuan" value={totalPertemuan} />
        <StatCard label="Guru Aktif" value={guruAktifCount} fg={C.goldDark} />
        <StatCard label="Siswa Aktif" value={siswaAktifCount} fg={C.blue} bg={C.blueBg} />
        <StatCard label="Menunggu Persetujuan" value={totalMenunggu} fg={C.amber} bg={C.amberBg} />
        <StatCard label="Disetujui" value={totalDisetujui} fg={C.green} bg={C.greenBg} />
        <StatCard label="Ditolak" value={totalDitolak} fg={C.red} bg={C.redBg} />
      </div>

      {entriesError && (
        <div style={{ background: C.redBg, color: C.red, padding: '10px 14px', borderRadius: '10px', marginBottom: '1rem', fontSize: '0.85rem' }}>
          {entriesError}
        </div>
      )}

      {/* Rekap per Guru / per Siswa */}
      <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '14px', marginBottom: '1.5rem', overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}` }}>
          <button
            onClick={() => setRekapTab('guru')}
            style={{
              flex: 1,
              padding: '0.85rem',
              border: 'none',
              cursor: 'pointer',
              background: rekapTab === 'guru' ? C.cream : C.white,
              color: rekapTab === 'guru' ? C.dark : C.gray,
              fontWeight: 700,
              fontSize: '0.85rem',
            }}
          >
            Rekap per Guru
          </button>
          <button
            onClick={() => setRekapTab('siswa')}
            style={{
              flex: 1,
              padding: '0.85rem',
              border: 'none',
              cursor: 'pointer',
              background: rekapTab === 'siswa' ? C.cream : C.white,
              color: rekapTab === 'siswa' ? C.dark : C.gray,
              fontWeight: 700,
              fontSize: '0.85rem',
            }}
          >
            Rekap per Siswa
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: C.cream }}>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>
                  {rekapTab === 'guru' ? 'Nama Guru' : 'Nama Siswa'}
                </th>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Total Pertemuan</th>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Rincian Status</th>
              </tr>
            </thead>
            <tbody>
              {loadingMasters || loadingEntries ? (
                <tr>
                  <td colSpan={3} style={{ padding: '1.5rem', textAlign: 'center', color: C.grayLight }}>
                    Memuat rekap...
                  </td>
                </tr>
              ) : rekapRows.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ padding: '1.5rem', textAlign: 'center', color: C.grayLight }}>
                    Belum ada data.
                  </td>
                </tr>
              ) : (
                rekapRows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => (rekapTab === 'guru' ? setFilterGuru(row.id) : setFilterSiswa(row.id))}
                    style={{ borderBottom: `1px solid ${C.border}`, cursor: 'pointer' }}
                  >
                    <td style={{ padding: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            width: '26px', height: '26px', borderRadius: '50%',
                            background: avatarColor(row.nama), color: C.white,
                            fontSize: '0.65rem', fontWeight: 700,
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          }}
                        >
                          {initials(row.nama)}
                        </span>
                        <span style={{ fontWeight: 600 }}>{row.nama}</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px', fontWeight: 700 }}>{row.total}</td>
                    <td style={{ padding: '10px' }}>
                      <MiniStatusBar counts={row} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Filter bar */}
      <div
        style={{
          display: 'flex',
          gap: '0.7rem',
          flexWrap: 'wrap',
          alignItems: 'center',
          marginBottom: '1rem',
          background: C.white,
          border: `1px solid ${C.border}`,
          borderRadius: '12px',
          padding: '0.85rem',
        }}
      >
        <select value={filterGuru} onChange={(e) => setFilterGuru(e.target.value)} style={selectStyle}>
          <option value="Semua Guru">Semua Guru</option>
          {guruList.map((g) => (
            <option key={g.id} value={g.id}>{g.full_name}</option>
          ))}
        </select>

        <select value={filterSiswa} onChange={(e) => setFilterSiswa(e.target.value)} style={selectStyle}>
          <option value="Semua Siswa">Semua Siswa</option>
          {studentList.map((s) => (
            <option key={s.id} value={s.id}>{s.full_name}</option>
          ))}
        </select>

        <select value={filterBulan} onChange={(e) => setFilterBulan(e.target.value)} style={selectStyle}>
          {bulanOptions.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>

        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={selectStyle}>
          <option value="Semua Status">Semua Status</option>
          <option value="Menunggu">Menunggu</option>
          <option value="Disetujui">Disetujui</option>
          <option value="Ditolak">Ditolak</option>
        </select>

        <input
          type="text"
          placeholder="Cari judul materi, catatan, nama..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...selectStyle, cursor: 'text', flex: '1 1 220px', minWidth: '200px' }}
        />

        {(filterGuru !== 'Semua Guru' || filterSiswa !== 'Semua Siswa' || filterBulan !== 'Semua Bulan' || filterStatus !== 'Semua Status' || search) && (
          <button
            onClick={() => {
              setFilterGuru('Semua Guru');
              setFilterSiswa('Semua Siswa');
              setFilterBulan('Semua Bulan');
              setFilterStatus('Semua Status');
              setSearch('');
            }}
            style={{ ...selectStyle, background: C.cream, fontWeight: 700 }}
          >
            Reset Filter
          </button>
        )}
      </div>

      {/* Tabel / kartu detail pertemuan */}
      <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '14px', overflow: 'hidden' }}>
        {isMobile ? (
          <div style={{ padding: '0.75rem' }}>
            {loadingEntries && <div style={{ padding: '2rem', textAlign: 'center', color: C.grayLight }}>Memuat data...</div>}
            {!loadingEntries && filteredEntries.length === 0 && (
              <div style={{ padding: '2rem', textAlign: 'center', color: C.grayLight }}>Belum ada pertemuan yang cocok dengan filter ini.</div>
            )}
            {!loadingEntries && filteredEntries.map((item) => {
              const st = statusStyle(item.status);
              const namaSiswa = item.siswa?.full_name || 'Siswa tidak ditemukan';
              const namaGuru = item.guruProfile?.full_name || 'Guru tidak ditemukan';
              return (
                <div key={item.id} style={{ border: `1px solid ${C.border}`, borderRadius: '12px', padding: '0.9rem', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <div style={{ fontWeight: 700, color: C.dark }}>{item.judul_materi}</div>
                      <div style={{ fontSize: '0.75rem', color: C.gray, marginTop: '2px' }}>{formatTanggalDisplay(item.tanggal)}</div>
                    </div>
                    <span style={{ background: st.bg, color: st.fg, padding: '3px 10px', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700 }}>
                      {item.status}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.8rem', color: C.gray, marginBottom: '8px' }}>
                    <span><strong style={{ color: C.dark }}>Guru:</strong> {namaGuru}</span>
                    <span><strong style={{ color: C.dark }}>Siswa:</strong> {namaSiswa}</span>
                    {item.catatan && <span><strong style={{ color: C.dark }}>Catatan:</strong> {item.catatan}</span>}
                  </div>

                  {item.bukti_urls && item.bukti_urls.length > 0 && (
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
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

                  {item.status === 'Menunggu' && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        disabled={updatingId === item.id}
                        onClick={() => handleUpdateStatus(item.id, 'Disetujui')}
                        style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', background: C.green, color: C.white, fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}
                      >
                        Setujui
                      </button>
                      <button
                        disabled={updatingId === item.id}
                        onClick={() => handleUpdateStatus(item.id, 'Ditolak')}
                        style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', background: C.red, color: C.white, fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}
                      >
                        Tolak
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: C.cream }}>
                  <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>No.</th>
                  <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Tanggal</th>
                  <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Guru</th>
                  <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Siswa</th>
                  <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Judul Materi Ajar</th>
                  <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Bukti</th>
                  <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Status</th>
                  <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loadingEntries && (
                  <tr>
                    <td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: C.grayLight }}>Memuat data pertemuan...</td>
                  </tr>
                )}
                {!loadingEntries && filteredEntries.map((item, idx) => {
                  const st = statusStyle(item.status);
                  const namaSiswa = item.siswa?.full_name || 'Siswa tidak ditemukan';
                  const namaGuru = item.guruProfile?.full_name || 'Guru tidak ditemukan';
                  return (
                    <tr key={item.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: '10px', color: C.gray }}>{idx + 1}</td>
                      <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>{formatTanggalDisplay(item.tanggal)}</td>
                      <td style={{ padding: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              width: '24px', height: '24px', borderRadius: '50%',
                              background: avatarColor(namaGuru), color: C.white,
                              fontSize: '0.6rem', fontWeight: 700,
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            }}
                          >
                            {initials(namaGuru)}
                          </span>
                          <span>{namaGuru}</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              width: '24px', height: '24px', borderRadius: '50%',
                              background: avatarColor(namaSiswa), color: C.white,
                              fontSize: '0.6rem', fontWeight: 700,
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            }}
                          >
                            {initials(namaSiswa)}
                          </span>
                          <span>{namaSiswa}</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px', fontWeight: '500', minWidth: '160px' }}>{item.judul_materi}</td>
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
                                  width: '22px', height: '22px', borderRadius: '6px',
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
                      </td>
                      <td style={{ padding: '10px' }}>
                        <span style={{ background: st.bg, color: st.fg, padding: '4px 12px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {item.status}
                        </span>
                      </td>
                      <td style={{ padding: '10px', position: 'relative' }}>
                        {item.status === 'Menunggu' ? (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              disabled={updatingId === item.id}
                              onClick={() => handleUpdateStatus(item.id, 'Disetujui')}
                              title="Setujui"
                              style={{ width: '28px', height: '28px', borderRadius: '7px', border: 'none', background: C.greenBg, color: C.green, cursor: 'pointer', fontWeight: 700 }}
                            >
                              ✓
                            </button>
                            <button
                              disabled={updatingId === item.id}
                              onClick={() => handleUpdateStatus(item.id, 'Ditolak')}
                              title="Tolak"
                              style={{ width: '28px', height: '28px', borderRadius: '7px', border: 'none', background: C.redBg, color: C.red, cursor: 'pointer', fontWeight: 700 }}
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.gray, fontSize: '1.1rem', padding: '0 6px' }}
                          >
                            ⋮
                          </button>
                        )}
                        {openMenuId === item.id && (
                          <div
                            style={{
                              position: 'absolute', right: 0, top: '30px', background: C.white,
                              border: `1px solid ${C.border}`, borderRadius: '8px',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.08)', zIndex: 10, minWidth: '140px',
                            }}
                          >
                            <button
                              onClick={() => handleUpdateStatus(item.id, 'Menunggu')}
                              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', color: C.dark, fontSize: '0.82rem' }}
                            >
                              Set ke Menunggu
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

export default AdminAbsensi;