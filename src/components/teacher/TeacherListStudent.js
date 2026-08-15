import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { checkedUpdate } from '../../utils/supabaseUpdateGuard';
import { syncStudentFolders } from '../../utils/studentFolderSync';

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

// Badge status Aktif/Off — murni tampilan, tidak bisa diklik/diubah manual,
// karena statusnya otomatis mengikuti ada/tidaknya jadwal aktif di jadwal_les.
const StatusBadge = ({ aktif }) => (
  <span
    style={{
      background: aktif ? 'rgba(45,106,79,0.10)' : 'rgba(179,66,63,0.10)',
      color: aktif ? C.green : '#b3423f',
      padding: '2px 10px',
      borderRadius: '12px',
      fontSize: '0.75rem',
      whiteSpace: 'nowrap',
      fontWeight: 600,
    }}
  >
    {aktif ? 'Aktif' : 'Off'}
  </span>
);

// Kartu siswa untuk tampilan mobile (menggantikan baris tabel)
const StudentCard = ({ s, onDelete }) => (
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
      <StatusBadge aktif={s.aktif} />
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: '6px', columnGap: '8px', fontSize: '0.85rem' }}>
      <div style={{ color: C.grayLight }}>Kelas</div>
      <div style={{ color: C.dark, textAlign: 'right' }}>{s.kelas}</div>

      <div style={{ color: C.grayLight }}>Privat/Group</div>
      <div style={{ color: C.dark, textAlign: 'right' }}>{s.jenisKelas}</div>

      <div style={{ color: C.grayLight }}>Metode</div>
      <div style={{ color: C.dark, textAlign: 'right' }}>{s.metode}</div>
    </div>

    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '4px' }}>
      <button
        onClick={() => onDelete(s)}
        style={{
          background: 'rgba(179,66,63,0.08)',
          border: 'none',
          color: '#b3423f',
          padding: '8px 14px',
          borderRadius: '40px',
          fontWeight: 'bold',
          cursor: 'pointer',
          fontSize: '0.8rem',
          fontFamily: 'inherit',
        }}
      >
        🗑️ Hapus
      </button>
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
  // digabung dari jadwal_les (privat: siswa_id, group: siswa_ids[]).
  // Status Aktif/Off TIDAK lagi disimpan manual — melainkan diturunkan langsung
  // dari kondisi jadwal_les milik guru ini: kalau siswa masih punya jadwal yang
  // masih berlaku (reguler, atau jadwal sementara yang tanggalnya belum lewat),
  // statusnya "Aktif". Kalau semua jadwalnya sudah lewat/tidak ada, "Off".
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

    // 1b. Ambil semua jadwal les milik guru ini (pakai guru.id, bukan user.id).
    // is_temporary & tanggal_temporary dipakai untuk menentukan apakah jadwal
    // ini masih "berlaku" (dipakai untuk status Aktif/Off).
    const { data: jadwalData, error: jadwalError } = await supabase
      .from('jadwal_les')
      .select('id, kelas, jenis, tipe, siswa_id, siswa_ids, is_temporary, tanggal_temporary')
      .eq('guru_id', guruRow.id);

    if (jadwalError) {
      console.error(jadwalError);
      setErrorMsg('Gagal memuat data jadwal siswa.');
      setLoading(false);
      return;
    }

    // Jadwal reguler (is_temporary = false) dianggap selalu masih berlaku
    // selama barisnya masih ada di jadwal_les. Jadwal sementara (is_temporary = true)
    // hanya dianggap masih berlaku kalau tanggal_temporary >= hari ini (atau kosong).
    const todayStr = new Date().toISOString().slice(0, 10);
    const isRowActive = (row) => {
      if (!row.is_temporary) return true;
      if (!row.tanggal_temporary) return true;
      return row.tanggal_temporary >= todayStr;
    };

    // 2. Pecah setiap baris jadwal jadi entry per-siswa (privat = 1 siswa, group = banyak siswa)
    // Setiap entry menyimpan sumbernya (jadwalId + apakah dari kolom group)
    // supaya nanti bisa dipakai untuk "hapus siswa dari jadwal ini", dan status
    // aktif/off baris jadwal tsb.
    const entries = [];
    (jadwalData || []).forEach((row) => {
      const base = {
        kelas: row.kelas,
        jenis: row.jenis || 'Private', // Privat / Group
        metode: row.tipe || '-',       // Online / Offline / Hybrid
        aktif: isRowActive(row),
      };
      if (row.siswa_id) {
        entries.push({ siswaId: row.siswa_id, ...base, source: { jadwalId: row.id, isGroup: false } });
      }
      (row.siswa_ids || []).forEach((sid) => {
        entries.push({ siswaId: sid, ...base, source: { jadwalId: row.id, isGroup: true } });
      });
    });

    // Dedupe kombinasi siswa + kelas + jenis + metode (hindari baris ganda kalau ada 2 jadwal
    // hari berbeda utk kelas yg sama), tapi tetap kumpulkan semua sumber jadwal_les yang
    // berkontribusi ke baris ini, dan gabungkan status aktifnya (aktif kalau SALAH SATU
    // jadwal sumbernya masih berlaku).
    const uniqueMap = new Map();
    entries.forEach((e) => {
      const key = `${e.siswaId}-${e.kelas}-${e.jenis}-${e.metode}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, { ...e, sources: [e.source] });
      } else {
        const existing = uniqueMap.get(key);
        existing.sources.push(e.source);
        existing.aktif = existing.aktif || e.aktif;
      }
    });
    const uniqueEntries = Array.from(uniqueMap.values());

    const siswaIds = [...new Set(uniqueEntries.map((e) => e.siswaId))];

    if (siswaIds.length === 0) {
      setStudents([]);
      setLoading(false);
      return;
    }

    // 3. Ambil data profil (nama) untuk siswa-siswa tsb
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name')
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
        metode: e.metode,    // Online / Offline / Hybrid
        aktif: e.aktif,      // true -> "Aktif", false -> "Off"
        sources: e.sources,  // asal baris jadwal_les, dipakai untuk fitur hapus
      };
    });

    setStudents(mapped);
    setLoading(false);

    // Sinkronkan folder otomatis per-siswa: folder milik siswa yang sudah
    // tidak ada lagi di daftar ini (mis. baru saja dihapus dari jadwal)
    // langsung dihapus di sini juga, tidak perlu menunggu guru membuka
    // halaman Arsip Materi dulu. Siswa baru yang namanya bentrok dengan
    // folder lain sengaja dilewati dulu (onDuplicateConfirm tidak diisi) --
    // itu akan ditanyakan ke guru saat membuka halaman Arsip Materi.
    syncStudentFolders(user.id).catch((err) => console.error('Gagal sinkronisasi folder siswa:', err));
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const filteredStudents = students.filter((s) =>
    s.nama.toLowerCase().includes(search.toLowerCase())
  );

  // ─── Hapus siswa dari daftar (melepas siswa dari jadwal_les guru ini,
  // BUKAN menghapus akun siswanya) ──────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const removeStudentFromSchedule = async (source, siswaId) => {
    if (!source.isGroup) {
      // Jadwal privat: kosongkan siswa_id (kolomnya memang nullable untuk kasus ini)
      const { error } = await checkedUpdate(
        supabase
          .from('jadwal_les')
          .update({ siswa_id: null })
          .eq('id', source.jadwalId)
          .eq('siswa_id', siswaId)
      );
      if (error) throw error;
      return;
    }

    // Jadwal group: ambil array siswa_ids terkini lalu keluarkan siswa ini
    const { data: row, error: fetchErr } = await supabase
      .from('jadwal_les')
      .select('siswa_ids')
      .eq('id', source.jadwalId)
      .single();
    if (fetchErr) throw fetchErr;

    const updatedIds = (row?.siswa_ids || []).filter((id) => id !== siswaId);
    const { error: updateErr } = await checkedUpdate(
      supabase
        .from('jadwal_les')
        .update({ siswa_ids: updatedIds })
        .eq('id', source.jadwalId)
    );
    if (updateErr) throw updateErr;
  };

  const handleConfirmDeleteStudent = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setErrorMsg('');
    try {
      for (const source of deleteTarget.sources) {
        await removeStudentFromSchedule(source, deleteTarget.siswaId);
      }
      setDeleteTarget(null);
      await fetchStudents();
    } catch (err) {
      console.error(err);
      setErrorMsg('Gagal menghapus siswa dari jadwal. Coba lagi.');
    } finally {
      setDeleting(false);
    }
  };

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
              <StudentCard
                key={`${s.siswaId}-${s.no}`}
                s={s}
                onDelete={setDeleteTarget}
              />
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
                  <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Online/Offline/Hybrid</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Status</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', borderBottom: `1px solid ${C.border}` }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((s) => (
                  <tr key={`${s.siswaId}-${s.no}`} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: '8px 10px' }}>{s.no}</td>
                    <td style={{ padding: '8px 10px', fontWeight: '500' }}>{s.nama}</td>
                    <td style={{ padding: '8px 10px' }}>{s.kelas}</td>
                    <td style={{ padding: '8px 10px' }}>{s.jenisKelas}</td>
                    <td style={{ padding: '8px 10px' }}>{s.metode}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <StatusBadge aktif={s.aktif} />
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                      <button
                        onClick={() => setDeleteTarget(s)}
                        style={{
                          background: 'rgba(179,66,63,0.08)', border: 'none', color: '#b3423f', padding: '6px 14px',
                          borderRadius: '40px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'inherit',
                        }}
                      >
                        🗑️ Hapus
                      </button>
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

      {deleteTarget && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 200, padding: '1rem',
          }}
        >
          <div style={{ background: C.white, borderRadius: '16px', padding: '1.5rem', maxWidth: '400px', width: '100%' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: C.dark }}>Hapus siswa dari daftar?</h3>
            <p style={{ fontSize: '0.9rem', color: C.gray, margin: '0 0 1.25rem 0', lineHeight: 1.5 }}>
              <strong>{deleteTarget.nama}</strong> akan dilepas dari jadwal kelas{' '}
              <strong>{deleteTarget.kelas}</strong>. Akun siswa ini tidak akan dihapus — hanya
              keterkaitannya dengan jadwal Anda yang dilepas.
            </p>
            {errorMsg && (
              <p style={{ color: '#b3423f', fontSize: '0.8rem', margin: '0 0 0.75rem 0' }}>{errorMsg}</p>
            )}
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                style={{
                  background: 'none', border: `1.5px solid ${C.border}`, color: C.gray,
                  padding: '9px 18px', borderRadius: '40px', fontWeight: 'bold', cursor: deleting ? 'not-allowed' : 'pointer',
                  fontSize: '0.85rem', fontFamily: 'inherit', opacity: deleting ? 0.6 : 1,
                }}
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDeleteStudent}
                disabled={deleting}
                style={{
                  background: '#b3423f', border: 'none', color: 'white',
                  padding: '9px 18px', borderRadius: '40px', fontWeight: 'bold', cursor: deleting ? 'not-allowed' : 'pointer',
                  fontSize: '0.85rem', fontFamily: 'inherit', opacity: deleting ? 0.6 : 1,
                }}
              >
                {deleting ? 'Menghapus...' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherListStudent;