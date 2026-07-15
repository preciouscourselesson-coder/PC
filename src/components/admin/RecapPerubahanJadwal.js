import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';

const C = {
  gold: '#b4964b',
  green: '#2d6a4f',
  dark: '#171411',
  gray: '#444242',
  cream: '#f7f6f0',
  white: '#ffffff',
  border: '#e0ddd6',
  goldBg: 'rgba(180,150,75,0.10)',
  greenBg: 'rgba(45,106,79,0.12)',
  red: '#b3423a',
  redBg: '#fbeceb',
  blue: '#3f7ea6',
  blueBg: 'rgba(63,126,166,0.12)',
};

const STATUS_LABEL = {
  menunggu_persetujuan: 'Menunggu Persetujuan',
  disetujui_siswa: 'Disetujui Siswa',
  disetujui_menunggu_admin: 'Menunggu Admin',
  disetujui_admin: '✓ Disetujui Admin',
  ditolak: 'Ditolak (Siswa/Guru)',
  ditolak_admin: '✗ Ditolak Admin',
};

const STATUS_COLOR = {
  menunggu_persetujuan: { bg: C.goldBg, color: C.gold },
  disetujui_siswa: { bg: C.blueBg, color: C.blue },
  disetujui_menunggu_admin: { bg: C.goldBg, color: C.gold },
  disetujui_admin: { bg: C.greenBg, color: C.green },
  ditolak: { bg: C.redBg, color: C.red },
  ditolak_admin: { bg: C.redBg, color: C.red },
};

const formatJam = (t) => (t ? t.slice(0, 5) : '');

const formatTanggal = (iso) => {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
};

const RecapPerubahanJadwal = () => {
  const [pengajuanList, setPengajuanList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [statusFilter, setStatusFilter] = useState('semua');
  const [respondingId, setRespondingId] = useState(null);
  const [guruMap, setGuruMap] = useState({});
  const [siswaMap, setSiswaMap] = useState({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      // Ambil semua pengajuan perubahan jadwal + join jadwal_les
      const { data, error } = await supabase
        .from('pengajuan_perubahan_jadwal')
        .select('*, jadwal_les(id, hari, jam_mulai, jam_selesai, kelas, guru_id, siswa_ids)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Kumpulkan semua guru_id dan siswa_id untuk mapping nama
      const guruIds = new Set();
      const siswaIds = new Set();
      data.forEach(p => {
        if (p.jadwal_les?.guru_id) guruIds.add(p.jadwal_les.guru_id);
        if (p.siswa_id) siswaIds.add(p.siswa_id);
      });

      // Ambil nama guru
      let guruMapResult = {};
      if (guruIds.size > 0) {
        const { data: guruData } = await supabase
          .from('guru')
          .select('id, nama')
          .in('id', Array.from(guruIds));
        if (guruData) {
          guruMapResult = guruData.reduce((acc, g) => { acc[g.id] = g.nama; return acc; }, {});
        }
      }

      // Ambil nama siswa
      let siswaMapResult = {};
      if (siswaIds.size > 0) {
        const { data: siswaData } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', Array.from(siswaIds));
        if (siswaData) {
          siswaMapResult = siswaData.reduce((acc, s) => { acc[s.id] = s.full_name; return acc; }, {});
        }
      }

      setGuruMap(guruMapResult);
      setSiswaMap(siswaMapResult);
      setPengajuanList(data || []);
    } catch (err) {
      console.error(err);
      setErrorMsg('Gagal memuat data pengajuan perubahan jadwal.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRespond = async (id, setuju) => {
    setRespondingId(id);
    setErrorMsg('');
    try {
      const newStatus = setuju ? 'disetujui_admin' : 'ditolak_admin';
      const { error } = await supabase
        .from('pengajuan_perubahan_jadwal')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      // Update local state
      setPengajuanList(prev =>
        prev.map(p => (p.id === id ? { ...p, status: newStatus } : p))
      );
    } catch (err) {
      console.error(err);
      setErrorMsg('Gagal memperbarui pengajuan: ' + err.message);
    } finally {
      setRespondingId(null);
    }
  };

  const filteredList = pengajuanList.filter(p => {
    if (statusFilter === 'semua') return true;
    if (statusFilter === 'menunggu') {
      return p.status === 'menunggu_persetujuan' ||
             p.status === 'disetujui_siswa' ||
             p.status === 'disetujui_menunggu_admin';
    }
    return p.status === statusFilter;
  });

  const statusOptions = [
    { key: 'semua', label: 'Semua' },
    { key: 'menunggu', label: 'Menunggu Admin' },
    { key: 'disetujui_admin', label: 'Disetujui' },
    { key: 'ditolak_admin', label: 'Ditolak' },
    { key: 'ditolak', label: 'Ditolak (Siswa/Guru)' },
  ];

  const renderStatus = (status) => {
    const st = STATUS_COLOR[status] || { bg: C.cream, color: C.gray };
    return (
      <span
        style={{
          background: st.bg,
          color: st.color,
          padding: '4px 12px',
          borderRadius: '999px',
          fontSize: '0.75rem',
          fontWeight: '600',
          whiteSpace: 'nowrap',
        }}
      >
        {STATUS_LABEL[status] || status}
      </span>
    );
  };

  const asalJadwalStr = (p) => {
    const asal = p.jadwal_les;
    if (!asal) return 'Jadwal tidak ditemukan';
    return `${asal.hari} ${formatJam(asal.jam_mulai)}-${formatJam(asal.jam_selesai)}`;
  };

  const baruJadwalStr = (p) =>
    `${p.hari_baru || '-'} ${formatJam(p.jam_mulai_baru)}-${formatJam(p.jam_selesai_baru)}`;

  const namaPengaju = (p) => {
    if (p.diajukan_oleh === 'guru') {
      return guruMap[p.jadwal_les?.guru_id] || 'Guru';
    } else {
      return siswaMap[p.siswa_id] || 'Siswa';
    }
  };

  const isMenungguAdmin = (status) =>
    status === 'disetujui_menunggu_admin' || status === 'disetujui_siswa';

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', fontFamily: 'inherit' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: C.dark, margin: '0 0 0.25rem 0' }}>
          Perubahan Jadwal
        </h1>
        <p style={{ fontSize: '0.95rem', color: C.gray, margin: 0 }}>
          Daftar semua pengajuan perubahan jadwal dari guru dan siswa.
        </p>
      </div>

      {errorMsg && (
        <div
          style={{
            background: C.redBg,
            color: C.red,
            borderRadius: '10px',
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            fontSize: '0.85rem',
          }}
        >
          {errorMsg}
        </div>
      )}

      {loading && (
        <div
          style={{
            background: C.goldBg,
            color: C.gold,
            borderRadius: '10px',
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            fontSize: '0.85rem',
            fontWeight: '600',
          }}
        >
          Memuat data...
        </div>
      )}

      {/* Filter */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          flexWrap: 'wrap',
          marginBottom: '1.5rem',
        }}
      >
        {statusOptions.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setStatusFilter(opt.key)}
            style={{
              padding: '6px 16px',
              borderRadius: '20px',
              border:
                statusFilter === opt.key
                  ? `2px solid ${C.gold}`
                  : `1.5px solid ${C.border}`,
              background:
                statusFilter === opt.key ? C.goldBg : 'transparent',
              color: statusFilter === opt.key ? C.gold : C.gray,
              fontWeight: statusFilter === opt.key ? 'bold' : 'normal',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontFamily: 'inherit',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Tabel */}
      <div
        style={{
          background: C.white,
          borderRadius: '16px',
          border: `1.5px solid ${C.border}`,
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: C.cream }}>
                <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>
                  Pengaju
                </th>
                <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>
                  Jadwal Asal
                </th>
                <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>
                  Jadwal Baru
                </th>
                <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>
                  Alasan
                </th>
                <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>
                  Status
                </th>
                <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>
                  Diajukan
                </th>
                <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {!loading && filteredList.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: C.gray }}>
                    Tidak ada pengajuan perubahan jadwal.
                  </td>
                </tr>
              )}
              {!loading &&
                filteredList.map((p) => {
                  const isWaiting = isMenungguAdmin(p.status);
                  return (
                    <tr
                      key={p.id}
                      style={{ borderBottom: `1px solid ${C.border}` }}
                    >
                      <td style={{ padding: '10px 12px', fontWeight: '600' }}>
                        {namaPengaju(p)}
                        <span
                          style={{
                            fontSize: '0.7rem',
                            color: C.gray,
                            fontWeight: '400',
                            marginLeft: '6px',
                          }}
                        >
                          ({p.diajukan_oleh === 'guru' ? 'Guru' : 'Siswa'})
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', color: C.gray }}>
                        {asalJadwalStr(p)}
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: '500', color: C.dark }}>
                        {baruJadwalStr(p)}
                        {p.is_temporary_baru && p.tanggal_temporary_baru && (
                          <div style={{ fontSize: '0.7rem', color: C.gold }}>
                            Khusus {formatTanggal(p.tanggal_temporary_baru)}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px', color: C.gray, maxWidth: '200px' }}>
                        {p.alasan || '-'}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        {renderStatus(p.status)}
                      </td>
                      <td style={{ padding: '10px 12px', color: C.gray, fontSize: '0.8rem' }}>
                        {p.created_at
                          ? new Date(p.created_at).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '-'}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        {isWaiting ? (
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              onClick={() => handleRespond(p.id, true)}
                              disabled={respondingId === p.id}
                              style={{
                                background: C.green,
                                color: '#fff',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '5px 12px',
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                cursor:
                                  respondingId === p.id ? 'default' : 'pointer',
                                opacity: respondingId === p.id ? 0.6 : 1,
                              }}
                            >
                              {respondingId === p.id ? '...' : 'Setujui'}
                            </button>
                            <button
                              onClick={() => handleRespond(p.id, false)}
                              disabled={respondingId === p.id}
                              style={{
                                background: 'transparent',
                                color: C.red,
                                border: `1.5px solid ${C.red}`,
                                borderRadius: '6px',
                                padding: '5px 12px',
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                cursor:
                                  respondingId === p.id ? 'default' : 'pointer',
                                opacity: respondingId === p.id ? 0.6 : 1,
                              }}
                            >
                              Tolak
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: C.gray }}>
                            Selesai
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info total */}
      <div
        style={{
          marginTop: '1rem',
          fontSize: '0.85rem',
          color: C.gray,
          textAlign: 'right',
        }}
      >
        Total {pengajuanList.length} pengajuan
        {statusFilter !== 'semua' && ` (filter: ${statusFilter})`}
      </div>
    </div>
  );
};

export default RecapPerubahanJadwal;