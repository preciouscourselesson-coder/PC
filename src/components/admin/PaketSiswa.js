// src/components/admin/PaketSiswa.js
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import FormTambahSiswa from './FormTambahSiswa';

// ============================================================
// PALET WARNA
// ============================================================
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
  blueBg: 'rgba(63,126,166,0.12)',
  dark: '#171411',
  gray: '#726d66',
  grayBg: 'rgba(114,109,102,0.12)',
  grayLight: '#a8a29a',
  cream: '#f7f6f0',
  white: '#ffffff',
  border: '#e6e2d8',
};

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
  green: '#7fbf9e',
  blue: '#4f8fdb',
  danger: '#e0574f',
};

const STATUS_META = {
  Aktif: { bg: C.greenBg, fg: C.green, dot: C.green },
  'Akan Berakhir': { bg: C.amberBg, fg: C.amber, dot: C.amber },
  Berakhir: { bg: C.grayBg, fg: C.gray, dot: C.gray },
  Selesai: { bg: C.grayBg, fg: C.gray, dot: C.gray },
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================
const formatRupiah = (value) => {
  const num = Number(value) || 0;
  return 'Rp' + num.toLocaleString('id-ID');
};

const BULAN_SINGKAT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

const formatTanggal = (isoDate) => {
  if (!isoDate) return '-';
  const [y, m, d] = isoDate.split('-');
  const bulan = BULAN_SINGKAT[parseInt(m, 10) - 1] || m;
  return `${d} ${bulan} ${y}`;
};

const generateSiswaId = (createdAt, index) => {
  if (!createdAt) return `SIS-${String(index + 1).padStart(4, '0')}`;
  const d = new Date(createdAt);
  const y = String(d.getFullYear()).slice(2);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `SIS-${y}${m}${day}${String(index + 1).padStart(2, '0')}`;
};

const inputStyle = (hasError) => ({
  width: '100%',
  padding: '9px 12px',
  borderRadius: '10px',
  border: `1.5px solid ${hasError ? C.red : C.border}`,
  fontSize: '0.85rem',
  color: C.dark,
  fontFamily: 'inherit',
  background: C.white,
  outline: 'none',
  boxSizing: 'border-box',
});

const labelStyle = {
  display: 'block',
  fontSize: '0.72rem',
  fontWeight: 600,
  color: C.gray,
  marginBottom: '6px',
};

const iconBtnStyle = (bg, fg) => ({
  width: '26px',
  height: '26px',
  borderRadius: '50%',
  border: 'none',
  background: bg,
  color: fg,
  fontSize: '0.75rem',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
});

const PAGE_SIZE = 8;

// ============================================================
// KOMPONEN UTAMA
// ============================================================
const PaketSiswa = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paketList, setPaketList] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null); // untuk edit

  const [search, setSearch] = useState('');
  const [filterKelas, setFilterKelas] = useState('Semua');
  const [filterStatus, setFilterStatus] = useState('Semua');
  const [page, setPage] = useState(1);

  // Role & user info
  const [userRole, setUserRole] = useState('');
  const [guruId, setGuruId] = useState(null);
  const [guruNama, setGuruNama] = useState('');

  // Ambil role dan guru ID
  useEffect(() => {
    const fetchUser = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id;
      if (!uid) return;

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', uid)
        .maybeSingle();

      if (!profileError && profile) {
        setUserRole(profile.role);
      }

      if (profile?.role === 'teacher') {
        const { data: guru, error: guruError } = await supabase
          .from('guru')
          .select('id, nama')
          .eq('profile_id', uid)
          .maybeSingle();
        if (!guruError && guru) {
          setGuruId(guru.id);
          setGuruNama(guru.nama);
        }
      }
    };
    fetchUser();
  }, []);

  // Ambil data paket siswa
  const loadPaketSiswa = useCallback(async () => {
    setLoading(true);
    setError('');

    if (userRole === 'teacher' && !guruId) {
      setLoading(false);
      return;
    }

    try {
      let query = supabase.from('paket_siswa').select(`
        *,
        siswa:profiles!paket_siswa_siswa_id_fkey (id, full_name, kelas, gender, created_at),
        pricelist:pricelist!paket_siswa_pricelist_id_fkey (
          id, program, jumlah_pertemuan, durasi, pengajar,
          harga_privat, harga_2siswa, harga_3siswa, harga_4siswa
        )
      `);

      if (userRole === 'teacher' && guruId) {
        query = query.eq('guru_id', guruId);
      }

      const { data, error: queryError } = await query.order('created_at', { ascending: false });

      if (queryError) throw queryError;

      const processed = (data || []).map((item, index) => {
        const siswa = item.siswa;
        const pricelist = item.pricelist || {};
        const siswaId = generateSiswaId(siswa?.created_at, index);
        return {
          ...item,
          siswa_nama: siswa?.full_name || 'Tidak Diketahui',
          siswa_id_display: siswaId,
          kelas_siswa: siswa?.kelas || '-',
          paket: pricelist.program || 'Paket Reguler',
          mapel: 'Matematika', // FIXME: ambil dari data asli
          program: 'Regular', // FIXME: ambil dari data asli
          jenis: 'Privat', // FIXME: ambil dari data asli
          harga: pricelist.harga_privat || 0,
          pricelist: pricelist,
          total_pertemuan: item.total_pertemuan,
          sisa_pertemuan: item.sisa_pertemuan,
          tanggal_mulai: item.tanggal_mulai,
          tanggal_berakhir: item.tanggal_berakhir,
          status: item.status,
        };
      });

      setPaketList(processed);
    } catch (err) {
      console.error('Error loading paket siswa:', err);
      setError('Gagal memuat data paket siswa: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [userRole, guruId]);

  useEffect(() => {
    if (userRole) loadPaketSiswa();
  }, [userRole, loadPaketSiswa]);

  // Filter
  const filtered = paketList.filter((item) => {
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const match =
        item.siswa_nama.toLowerCase().includes(q) ||
        item.siswa_id_display.toLowerCase().includes(q) ||
        item.paket.toLowerCase().includes(q) ||
        item.mapel.toLowerCase().includes(q);
      if (!match) return false;
    }
    if (filterKelas !== 'Semua' && item.kelas_siswa !== filterKelas) return false;
    if (filterStatus !== 'Semua' && item.status !== filterStatus) return false;
    return true;
  });

  // Paginasi
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const rangeStart = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(safePage * PAGE_SIZE, filtered.length);

  useEffect(() => {
    setPage(1);
  }, [search, filterKelas, filterStatus]);

  const selectedItem = paketList.find((item) => item.id === selectedId) || null;

  // ========== CRUD HANDLERS ==========
  const handleEdit = (item) => {
    setEditingItem(item);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Yakin ingin menghapus paket siswa ini?')) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('paket_siswa').delete().eq('id', id);
      if (error) throw error;
      await loadPaketSiswa();
      if (selectedId === id) setSelectedId(null);
    } catch (err) {
      alert('Gagal menghapus: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleModalSuccess = () => {
    loadPaketSiswa();
    setShowModal(false);
    setEditingItem(null);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingItem(null);
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', fontFamily: 'inherit' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: C.dark, margin: 0 }}>Paket Siswa</h1>
          <p style={{ fontSize: '0.85rem', color: C.gray, margin: '4px 0 0' }}>
            {userRole === 'admin'
              ? 'Daftar semua paket siswa'
              : guruNama
              ? `Daftar paket les untuk siswa ${guruNama}`
              : 'Daftar paket les'}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{
            background: C.gold,
            border: 'none',
            padding: '10px 20px',
            borderRadius: '10px',
            cursor: 'pointer',
            color: '#fff',
            fontWeight: 700,
          }}
        >
          + Tambah Siswa
        </button>
      </div>

      {/* Tabel */}
      <div
        style={{
          background: C.white,
          borderRadius: '16px',
          border: `1.5px solid ${C.border}`,
          padding: '1.5rem',
          marginBottom: '1.5rem',
        }}
      >
        {/* Filter */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '0.75rem',
            marginBottom: '1.25rem',
          }}
        >
          <div>
            <label style={labelStyle}>Cari</label>
            <input
              type="text"
              placeholder="Cari nama siswa, paket, atau mapel..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={inputStyle(false)}
            />
          </div>
          <div>
            <label style={labelStyle}>Kelas</label>
            <select
              value={filterKelas}
              onChange={(e) => setFilterKelas(e.target.value)}
              style={{ ...inputStyle(false), cursor: 'pointer' }}
            >
              <option>Semua</option>
              <option>VII</option>
              <option>VIII</option>
              <option>IX</option>
              <option>X</option>
              <option>XI</option>
              <option>XII</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ ...inputStyle(false), cursor: 'pointer' }}
            >
              <option>Semua</option>
              <option>Aktif</option>
              <option>Akan Berakhir</option>
              <option>Berakhir</option>
              <option>Selesai</option>
            </select>
          </div>
        </div>

        {error && <div style={{ color: C.red, marginBottom: '1rem' }}>{error}</div>}

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: C.cream }}>
                <th
                  style={{
                    padding: '10px',
                    textAlign: 'left',
                    borderBottom: `1px solid ${C.border}`,
                    borderRadius: '8px 0 0 0',
                  }}
                >
                  No
                </th>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Siswa</th>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Kelas</th>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Paket</th>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Mapel</th>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Program</th>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Jenis</th>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Sisa Pertemuan</th>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Berlaku Sampai</th>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Status</th>
                <th
                  style={{
                    padding: '10px',
                    textAlign: 'left',
                    borderBottom: `1px solid ${C.border}`,
                    borderRadius: '0 8px 0 0',
                  }}
                >
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={11} style={{ padding: '2rem', textAlign: 'center', color: C.grayLight }}>
                    Memuat data...
                  </td>
                </tr>
              )}
              {!loading && pageItems.length === 0 && (
                <tr>
                  <td colSpan={11} style={{ padding: '2rem', textAlign: 'center', color: C.grayLight }}>
                    {search || filterKelas !== 'Semua' || filterStatus !== 'Semua'
                      ? 'Tidak ada hasil'
                      : 'Belum ada paket siswa'}
                  </td>
                </tr>
              )}
              {!loading &&
                pageItems.map((item, idx) => {
                  const st = STATUS_META[item.status] || STATUS_META.Aktif;
                  const displayNumber = rangeStart + idx;
                  return (
                    <tr key={item.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: '10px', color: C.gray }}>{displayNumber}</td>
                      <td style={{ padding: '10px', fontWeight: 600 }}>
                        <div>{item.siswa_nama}</div>
                        <div style={{ fontSize: '0.7rem', color: C.grayLight }}>{item.siswa_id_display}</div>
                      </td>
                      <td style={{ padding: '10px' }}>{item.kelas_siswa}</td>
                      <td style={{ padding: '10px', fontWeight: 600 }}>{item.paket}</td>
                      <td style={{ padding: '10px' }}>{item.mapel}</td>
                      <td style={{ padding: '10px' }}>{item.program}</td>
                      <td style={{ padding: '10px' }}>
                        <span
                          style={{
                            background: C.blueBg,
                            color: C.blue,
                            padding: '2px 10px',
                            borderRadius: '999px',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                          }}
                        >
                          {item.jenis}
                        </span>
                      </td>
                      <td style={{ padding: '10px' }}>
                        {item.sisa_pertemuan} / {item.total_pertemuan}
                      </td>
                      <td style={{ padding: '10px' }}>{formatTanggal(item.tanggal_berakhir)}</td>
                      <td style={{ padding: '10px' }}>
                        <span
                          style={{
                            background: st.bg,
                            color: st.fg,
                            padding: '4px 12px',
                            borderRadius: '999px',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                          }}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td style={{ padding: '10px' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            title="Lihat detail"
                            onClick={() => setSelectedId(item.id)}
                            style={iconBtnStyle(C.blueBg, C.blue)}
                          >
                            &#128065;
                          </button>
                          <button
                            title="Edit"
                            onClick={() => handleEdit(item)}
                            style={iconBtnStyle(C.amberBg, C.amber)}
                          >
                            &#9998;
                          </button>
                          <button
                            title="Hapus"
                            onClick={() => handleDelete(item.id)}
                            style={iconBtnStyle(C.redBg, C.red)}
                          >
                            &#128465;
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
            marginTop: '1.1rem',
          }}
        >
          <span style={{ fontSize: '0.8rem', color: C.gray }}>
            Menampilkan {rangeStart}-{rangeEnd} dari {filtered.length} data
          </span>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              style={{
                ...iconBtnStyle(C.cream, C.dark),
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                opacity: safePage === 1 ? 0.5 : 1,
              }}
            >
              &#8249;
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  background: p === safePage ? C.gold : C.cream,
                  color: p === safePage ? C.white : C.dark,
                  fontWeight: 600,
                }}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              style={{
                ...iconBtnStyle(C.cream, C.dark),
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                opacity: safePage === totalPages ? 0.5 : 1,
              }}
            >
              &#8250;
            </button>
          </div>
        </div>
      </div>

      {/* Detail Paket Siswa */}
      <div
        style={{
          background: D.bg,
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 12px 32px rgba(0,0,0,0.28)',
        }}
      >
        <div
          style={{
            padding: '1.1rem 1.5rem',
            background: D.bgSoft,
            borderBottom: `1px solid ${D.gold}`,
          }}
        >
          <span style={{ color: D.gold, fontWeight: 800, fontSize: '0.98rem' }}>DETAIL PAKET SISWA</span>
        </div>
        <div style={{ padding: '1.5rem' }}>
          {!selectedItem ? (
            <div style={{ color: D.textFaint, textAlign: 'center', padding: '2rem 0' }}>
              Klik ikon &#128065; pada salah satu baris untuk melihat detail paket siswa di sini.
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ color: D.text, fontSize: '1.1rem', fontWeight: 800 }}>
                    {selectedItem.siswa_nama}
                  </div>
                  <div style={{ color: D.textMuted, fontSize: '0.8rem' }}>
                    {selectedItem.siswa_id_display}
                  </div>
                </div>
                <div style={{ color: D.textMuted }}>{selectedItem.kelas_siswa}</div>
                <span
                  style={{
                    background: STATUS_META[selectedItem.status]?.bg,
                    color: STATUS_META[selectedItem.status]?.fg,
                    padding: '3px 14px',
                    borderRadius: '999px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                  }}
                >
                  {selectedItem.status}
                </span>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                  gap: '1.5rem',
                  marginTop: '1.25rem',
                }}
              >
                <div>
                  <div style={{ color: D.gold, fontSize: '0.8rem', fontWeight: 700, marginBottom: '10px' }}>
                    Informasi Paket
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                    <div style={{ color: D.textMuted }}>
                      Paket <span style={{ float: 'right', color: D.text }}>{selectedItem.paket}</span>
                    </div>
                    <div style={{ color: D.textMuted }}>
                      Program <span style={{ float: 'right', color: D.text }}>{selectedItem.program}</span>
                    </div>
                    <div style={{ color: D.textMuted }}>
                      Mapel <span style={{ float: 'right', color: D.text }}>{selectedItem.mapel}</span>
                    </div>
                    <div style={{ color: D.textMuted }}>
                      Jenis <span style={{ float: 'right', color: D.text }}>{selectedItem.jenis}</span>
                    </div>
                    <div style={{ color: D.textMuted }}>
                      Total Pertemuan <span style={{ float: 'right', color: D.text }}>{selectedItem.total_pertemuan}</span>
                    </div>
                    <div style={{ color: D.textMuted }}>
                      Sisa Pertemuan{' '}
                      <span style={{ float: 'right', color: D.gold, fontWeight: 700 }}>
                        {selectedItem.sisa_pertemuan}
                      </span>
                    </div>
                    <div style={{ color: D.textMuted }}>
                      Tanggal Mulai{' '}
                      <span style={{ float: 'right', color: D.text }}>
                        {formatTanggal(selectedItem.tanggal_mulai)}
                      </span>
                    </div>
                    <div style={{ color: D.textMuted }}>
                      Tanggal Berakhir{' '}
                      <span style={{ float: 'right', color: D.text }}>
                        {formatTanggal(selectedItem.tanggal_berakhir)}
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <div style={{ color: D.gold, fontSize: '0.8rem', fontWeight: 700, marginBottom: '10px' }}>
                    Pembayaran
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                    <div style={{ color: D.textMuted }}>
                      Total Harga{' '}
                      <span style={{ float: 'right', color: D.gold, fontWeight: 700, fontSize: '1rem' }}>
                        {formatRupiah(selectedItem.harga)}
                      </span>
                    </div>
                    {selectedItem.pricelist && (
                      <div
                        style={{
                          marginTop: '8px',
                          paddingTop: '8px',
                          borderTop: `1px solid ${D.fieldBorder}`,
                        }}
                      >
                        <div style={{ fontSize: '0.7rem', color: D.textFaint }}>Detail Pricelist:</div>
                        <div style={{ fontSize: '0.75rem', color: D.textMuted }}>
                          {selectedItem.pricelist.jumlah_pertemuan} &middot; {selectedItem.pricelist.durasi} &middot;{' '}
                          {selectedItem.pricelist.pengajar}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div
                style={{
                  marginTop: '1.5rem',
                  paddingTop: '1rem',
                  borderTop: `1px solid ${D.fieldBorder}`,
                  display: 'flex',
                  gap: '12px',
                }}
              >
                <button
                  onClick={() => handleEdit(selectedItem)}
                  style={{
                    background: D.goldSoft,
                    border: `1px solid ${D.gold}`,
                    color: D.gold,
                    padding: '8px 20px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  &#9998; Edit Paket
                </button>
                <button
                  onClick={() => alert('Fitur pembayaran akan segera hadir')}
                  style={{
                    background: 'none',
                    border: `1px solid ${D.fieldBorder}`,
                    color: D.textMuted,
                    padding: '8px 20px',
                    borderRadius: '8px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  &#128176; Pembayaran
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal Tambah/Edit Siswa */}
      <FormTambahSiswa
        isOpen={showModal}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        userRole={userRole}
        guruId={guruId}
        editingItem={editingItem}
      />
    </div>
  );
};

export default PaketSiswa;