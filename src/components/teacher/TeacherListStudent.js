import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';

const C = {
  gold: '#b4964b',
  green: '#2d6a4f',
  dark: '#171411',
  gray: '#444242',
  grayLight: '#8a8782',
  cream: '#f7f6f0',
  white: '#ffffff',
  border: '#e0ddd6',
  goldBg: 'rgba(180,150,75,0.10)',
  goldLight: 'rgba(180,150,75,0.06)',
};

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

// Kartu siswa untuk tampilan mobile (menggantikan baris tabel)
const StudentCard = ({ s }) => (
  <div
    style={{
      background: C.white,
      border: `1.5px solid ${C.border}`,
      borderRadius: '14px',
      padding: '1rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
      <div style={{ fontWeight: '700', color: C.dark, fontSize: '1rem' }}>{s.nama}</div>
      <span style={{ background: C.goldBg, color: C.gold, padding: '2px 10px', borderRadius: '12px', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
        {s.status ?? 'Belum tersedia'}
      </span>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: '6px', columnGap: '8px', fontSize: '0.85rem' }}>
      <div style={{ color: C.grayLight }}>Kelas</div>
      <div style={{ color: C.dark, textAlign: 'right' }}>{s.kelas}</div>

      <div style={{ color: C.grayLight }}>Privat/Group</div>
      <div style={{ color: C.dark, textAlign: 'right' }}>{s.jenisKelas}</div>

      <div style={{ color: C.grayLight }}>Jenis Paket</div>
      <div style={{ color: C.dark, textAlign: 'right' }}>{s.paket}</div>

      <div style={{ color: C.grayLight }}>Kehadiran</div>
      <div style={{ color: C.dark, textAlign: 'right' }}>{s.kehadiran ?? 'Belum tersedia'}</div>
    </div>

    <div style={{ borderTop: `1px solid ${C.border}`, marginTop: '4px', paddingTop: '8px', fontSize: '0.8rem', color: C.gray, wordBreak: 'break-word' }}>
      📧 {s.kontak}
    </div>
  </div>
);

const TeacherListStudent = () => {
  const [search, setSearch] = useState('');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const isMobile = useIsMobile();

  // Ambil semua siswa yang diajar oleh guru yang sedang login,
  // digabung dari jadwal_les (privat: siswa_id, group: siswa_ids[])
  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setErrorMsg('Sesi tidak ditemukan. Silakan login ulang.');
      setLoading(false);
      return;
    }

    // 1a. Cari dulu guru.id yang sesuai dengan user login ini
    //     (jadwal_les.guru_id menunjuk ke guru.id, BUKAN ke profiles.id/auth.uid() langsung)
    const { data: guruRow, error: guruError } = await supabase
      .from('guru')
      .select('id')
      .eq('profile_id', user.id)
      .maybeSingle();

    if (guruError) {
      console.error(guruError);
      setErrorMsg('Gagal memuat data guru.');
      setLoading(false);
      return;
    }

    if (!guruRow) {
      setErrorMsg('Akun ini belum terhubung ke data guru (tabel guru).');
      setStudents([]);
      setLoading(false);
      return;
    }

    // 1b. Ambil semua jadwal les milik guru ini (pakai guru.id, bukan user.id)
    const { data: jadwalData, error: jadwalError } = await supabase
      .from('jadwal_les')
      .select('id, kelas, jenis, tipe, siswa_id, siswa_ids')
      .eq('guru_id', guruRow.id);

    if (jadwalError) {
      console.error(jadwalError);
      setErrorMsg('Gagal memuat data jadwal siswa.');
      setLoading(false);
      return;
    }

    // 2. Pecah setiap baris jadwal jadi entry per-siswa (privat = 1 siswa, group = banyak siswa)
    const entries = [];
    (jadwalData || []).forEach((row) => {
      const base = { kelas: row.kelas, jenis: row.jenis || 'Private', paket: row.tipe };
      if (row.siswa_id) {
        entries.push({ siswaId: row.siswa_id, ...base });
      }
      (row.siswa_ids || []).forEach((sid) => {
        entries.push({ siswaId: sid, ...base });
      });
    });

    // Dedupe kombinasi siswa + kelas + jenis + paket (hindari baris ganda kalau ada 2 jadwal hari berbeda utk kelas yg sama)
    const uniqueMap = new Map();
    entries.forEach((e) => {
      const key = `${e.siswaId}-${e.kelas}-${e.jenis}-${e.paket}`;
      if (!uniqueMap.has(key)) uniqueMap.set(key, e);
    });
    const uniqueEntries = Array.from(uniqueMap.values());

    const siswaIds = [...new Set(uniqueEntries.map((e) => e.siswaId))];

    if (siswaIds.length === 0) {
      setStudents([]);
      setLoading(false);
      return;
    }

    // 3. Ambil data profil (nama, email) untuk siswa-siswa tsb
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', siswaIds);

    if (profilesError) {
      console.error(profilesError);
      setErrorMsg('Gagal memuat data profil siswa.');
      setLoading(false);
      return;
    }

    const profileMap = new Map((profilesData || []).map((p) => [p.id, p]));

    // 4. Gabungkan jadi baris tabel
    const mapped = uniqueEntries.map((e, idx) => {
      const profile = profileMap.get(e.siswaId);
      return {
        no: idx + 1,
        siswaId: e.siswaId,
        nama: profile?.full_name || 'Nama tidak ditemukan',
        kelas: e.kelas,
        jenisKelas: e.jenis, // Private / Group
        paket: e.paket || '-',
        kontak: profile?.email || '-', // TODO: tambahkan nomor HP kalau tersedia di tabel lain
        kehadiran: null, // TODO: belum ada sumber data kehadiran di database
        status: null, // TODO: belum ada sumber data status aktif/tidak les
      };
    });

    setStudents(mapped);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const filteredStudents = students.filter((s) =>
    s.nama.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', fontFamily: 'inherit' }}>
      {/* Header */}
      <div style={{ marginBottom: isMobile ? '1rem' : '1.5rem' }}>
        <h1 style={{ fontSize: isMobile ? '1.35rem' : '1.75rem', fontWeight: '700', color: C.dark, margin: '0 0 0.25rem 0' }}>Siswa</h1>
        <p style={{ fontSize: '0.9rem', color: C.gray, margin: 0 }}>Daftar siswa yang sedang Anda ajarkan dan informasi penting terkait mereka.</p>
      </div>

      {errorMsg && (
        <div style={{ background: 'rgba(179,66,63,0.08)', color: '#b3423f', padding: '0.75rem 1rem', borderRadius: '10px', marginBottom: '1rem', fontSize: '0.88rem' }}>
          {errorMsg}
        </div>
      )}

      {/* Daftar Siswa */}
      <div style={{ background: C.white, borderRadius: '16px', border: `1.5px solid ${C.border}`, padding: isMobile ? '1rem' : '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', color: C.dark }}>Daftar Siswa</h3>
        <input
          type="text"
          placeholder="Cari nama siswa..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: '8px',
            border: `1.5px solid ${C.border}`,
            fontSize: '16px', // 16px agar tidak memicu zoom otomatis di iOS
            marginBottom: '1rem',
            boxSizing: 'border-box',
            fontFamily: 'inherit',
          }}
        />

        {loading ? (
          <div style={{ padding: '2rem 0', textAlign: 'center', color: C.grayLight }}>Memuat data siswa...</div>
        ) : filteredStudents.length === 0 ? (
          <div style={{ padding: '2rem 0', textAlign: 'center', color: C.grayLight }}>Belum ada siswa yang terdaftar di jadwal Anda.</div>
        ) : isMobile ? (
          // Tampilan kartu untuk layar kecil
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {filteredStudents.map((s) => (
              <StudentCard key={`${s.siswaId}-${s.no}`} s={s} />
            ))}
          </div>
        ) : (
          // Tampilan tabel untuk layar besar
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: C.cream }}>
                  <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>No</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Nama Siswa</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Kelas</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Privat/Group</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Jenis Paket</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Kontak</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Kehadiran</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((s) => (
                  <tr key={`${s.siswaId}-${s.no}`} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: '8px 10px' }}>{s.no}</td>
                    <td style={{ padding: '8px 10px', fontWeight: '500' }}>{s.nama}</td>
                    <td style={{ padding: '8px 10px' }}>{s.kelas}</td>
                    <td style={{ padding: '8px 10px' }}>{s.jenisKelas}</td>
                    <td style={{ padding: '8px 10px' }}>{s.paket}</td>
                    <td style={{ padding: '8px 10px', fontSize: '0.8rem' }}>{s.kontak}</td>
                    <td style={{ padding: '8px 10px', color: C.grayLight }}>
                      {s.kehadiran ?? 'Belum tersedia'}
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <span style={{ background: C.goldBg, color: C.gold, padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>
                        {s.status ?? 'Belum tersedia'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: C.gray }}>
          Menampilkan {filteredStudents.length} dari {students.length} siswa
        </div>
      </div>
    </div>
  );
};

export default TeacherListStudent;