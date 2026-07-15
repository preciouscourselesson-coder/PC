import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

// ─── Warna ───────────────────────────────────────────────────────────────────
const C = {
  gold:    '#b4964b',
  green:   '#2d6a4f',
  dark:    '#171411',
  gray:    '#444242',
  cream:   '#f7f6f0',
  white:   '#ffffff',
  border:  '#e0ddd6',
  goldBg:  'rgba(180,150,75,0.08)',
  red:     '#e74c3c',
  lightRed: '#fff0f0',
  orange:  '#ff9800',
  orangeBg: 'rgba(255,152,0,0.10)',
};

// ─── Komponen Badge ─────────────────────────────────────────────────────────

const StatusBadge = ({ status }) => {
  const colors = {
    baru: { bg: '#e8f5e9', text: '#2e7d32' },
    diproses: { bg: '#fff3e0', text: '#e65100' },
    selesai: { bg: '#e3f2fd', text: '#0d47a1' },
  };
  const style = colors[status] || colors.baru;
  return (
    <span style={{
      background: style.bg,
      color: style.text,
      padding: '4px 12px',
      borderRadius: '40px',
      fontSize: '0.8rem',
      fontWeight: 'bold',
      display: 'inline-block',
    }}>
      {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Baru'}
    </span>
  );
};

const WaStatusBadge = ({ status }) => {
  const map = {
    belum: { label: 'Belum', bg: '#f5f5f5', text: '#888' },
    diproses: { label: 'Diproses', bg: C.orangeBg, text: C.orange },
    selesai_join: { label: '✅ Join', bg: C.greenBg || 'rgba(45,106,79,0.12)', text: C.green },
    selesai_tidak: { label: '❌ Tidak Join', bg: '#ffebee', text: C.red },
  };
  const s = map[status] || map.belum;
  return (
    <span style={{
      background: s.bg,
      color: s.text,
      padding: '4px 12px',
      borderRadius: '40px',
      fontSize: '0.75rem',
      fontWeight: 'bold',
      display: 'inline-block',
    }}>
      {s.label}
    </span>
  );
};

const FilterChip = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    style={{
      padding: '6px 16px',
      borderRadius: '40px',
      fontSize: '0.85rem',
      fontWeight: active ? 'bold' : 'normal',
      cursor: 'pointer',
      fontFamily: 'inherit',
      border: `1.5px solid ${active ? C.gold : C.border}`,
      background: active ? C.gold : C.white,
      color: active ? C.white : C.gray,
      transition: 'all 0.2s',
    }}
  >
    {label}
  </button>
);

// ─── Halaman Admin ──────────────────────────────────────────────────────────

const AdminConsulPage = () => {
  const [konsultasiList, setKonsultasiList] = useState([]);
  const [filteredList, setFilteredList] = useState([]);
  const [filterStatus, setFilterStatus] = useState('semua');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [catatan, setCatatan] = useState('');
  const [statusBaru, setStatusBaru] = useState('');
  const [waStatus, setWaStatus] = useState('belum');
  const [waCatatan, setWaCatatan] = useState('');
  const [updating, setUpdating] = useState(false);

  // ─── Ambil data ───────────────────────────────────────────────────────────
  const fetchData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const { data, error } = await supabase
        .from('konsultasi')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Bersihkan data: pastikan status memiliki nilai yang valid
      const cleanedData = (data || []).map(item => {
        if (!['baru', 'diproses', 'selesai'].includes(item.status_konsultasi)) {
          item.status_konsultasi = 'baru';
        }
        if (!['belum', 'diproses', 'selesai_join', 'selesai_tidak'].includes(item.wa_status)) {
          item.wa_status = 'belum';
        }
        return item;
      });

      setKonsultasiList(cleanedData);
      setFilteredList(cleanedData);
    } catch (err) {
      console.error('Error fetching konsultasi:', err);
      setErrorMsg('Gagal memuat data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ─── Filter ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (filterStatus === 'semua') {
      setFilteredList(konsultasiList);
    } else {
      setFilteredList(konsultasiList.filter(item => item.status_konsultasi === filterStatus));
    }
  }, [filterStatus, konsultasiList]);

  // ─── Detail ───────────────────────────────────────────────────────────────
  const openDetail = (id) => {
    const item = konsultasiList.find(k => k.id === id);
    if (item) {
      setDetailData(item);
      setCatatan(item.catatan || '');
      setStatusBaru(item.status_konsultasi || 'baru');
      setWaStatus(item.wa_status || 'belum');
      setWaCatatan(item.wa_catatan || '');
      setShowDetail(true);
      setSelectedId(id);
      setErrorMsg('');
    }
  };

  const closeDetail = () => {
    setShowDetail(false);
    setDetailData(null);
    setSelectedId(null);
    setErrorMsg('');
  };

  // ─── Update status & catatan ──────────────────────────────────────────────
  const handleUpdate = async () => {
    if (!selectedId) {
      setErrorMsg('ID tidak valid.');
      return;
    }
    setUpdating(true);
    setErrorMsg('');

    const updateData = {
      status_konsultasi: statusBaru,
      catatan: catatan,
      wa_status: waStatus,
      wa_catatan: waCatatan,
    };

    try {
      const { error } = await supabase
        .from('konsultasi')
        .update(updateData)
        .eq('id', selectedId);

      if (error) throw error;

      // Update local state
      const updatedList = konsultasiList.map(item =>
        item.id === selectedId ? { ...item, ...updateData } : item
      );
      setKonsultasiList(updatedList);
      setFilteredList(prev =>
        prev.map(item =>
          item.id === selectedId ? { ...item, ...updateData } : item
        )
      );
      setDetailData(prev => ({ ...prev, ...updateData }));
      alert('✅ Data berhasil diperbarui!');
      closeDetail();
    } catch (err) {
      console.error('❌ Error updating:', err);
      setErrorMsg('Gagal memperbarui: ' + err.message);
    } finally {
      setUpdating(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 style={{ fontSize: '1.8rem', color: C.dark, margin: 0 }}>
          📋 Daftar Konsultasi
        </h1>
        <button
          onClick={fetchData}
          style={{
            background: C.green,
            border: 'none',
            color: 'white',
            padding: '8px 20px',
            borderRadius: '40px',
            fontWeight: 'bold',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          ↻ Refresh
        </button>
      </div>

      {errorMsg && (
        <div style={{
          background: C.lightRed,
          color: C.red,
          padding: '12px 16px',
          borderRadius: '10px',
          marginBottom: '1rem',
          border: `1px solid ${C.red}`,
        }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Filter */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <FilterChip label="Semua" active={filterStatus === 'semua'} onClick={() => setFilterStatus('semua')} />
        <FilterChip label="Baru" active={filterStatus === 'baru'} onClick={() => setFilterStatus('baru')} />
        <FilterChip label="Diproses" active={filterStatus === 'diproses'} onClick={() => setFilterStatus('diproses')} />
        <FilterChip label="Selesai" active={filterStatus === 'selesai'} onClick={() => setFilterStatus('selesai')} />
      </div>

      {/* Tabel */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: C.gray }}>⏳ Memuat data...</div>
      ) : filteredList.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: C.gray, background: C.white, borderRadius: '24px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
          <p>Tidak ada konsultasi dengan status ini.</p>
        </div>
      ) : (
        <div style={{
          background: C.white,
          borderRadius: '24px',
          overflow: 'hidden',
          boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead style={{ background: C.cream, borderBottom: `1px solid ${C.border}` }}>
                <tr>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 'bold', color: C.gray }}>Nama</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 'bold', color: C.gray }}>WhatsApp</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 'bold', color: C.gray }}>Jenjang</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 'bold', color: C.gray }}>Status Konsultasi</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 'bold', color: C.gray }}>Proses WA</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 'bold', color: C.gray }}>Tanggal</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 'bold', color: C.gray }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((item) => (
                  <tr key={item.id} style={{ borderBottom: `1px solid ${C.border}`, transition: 'background 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.background = C.goldBg}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '12px 16px', fontWeight: 'bold', color: C.dark }}>{item.nama}</td>
                    <td style={{ padding: '12px 16px', color: C.gray }}>{item.whatsapp}</td>
                    <td style={{ padding: '12px 16px', color: C.gray }}>{item.jenjang || '-'}</td>
                    <td style={{ padding: '12px 16px' }}><StatusBadge status={item.status_konsultasi || 'baru'} /></td>
                    <td style={{ padding: '12px 16px' }}><WaStatusBadge status={item.wa_status || 'belum'} /></td>
                    <td style={{ padding: '12px 16px', color: C.gray, fontSize: '0.8rem' }}>
                      {item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID') : '-'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <button
                        onClick={() => openDetail(item.id)}
                        style={{
                          background: C.gold,
                          border: 'none',
                          color: 'white',
                          padding: '6px 14px',
                          borderRadius: '40px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          fontFamily: 'inherit',
                        }}
                      >
                        Detail
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Detail */}
      {showDetail && detailData && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
        }} onClick={closeDetail}>
          <div style={{
            background: C.white,
            borderRadius: '24px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '2rem',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            position: 'relative',
          }} onClick={e => e.stopPropagation()}>
            <button
              onClick={closeDetail}
              style={{
                position: 'absolute',
                top: '12px',
                right: '16px',
                background: 'none',
                border: 'none',
                fontSize: '1.8rem',
                cursor: 'pointer',
                color: C.gray,
              }}
            >
              ✕
            </button>

            <h2 style={{ marginTop: 0, color: C.dark, borderBottom: `2px solid ${C.gold}`, paddingBottom: '0.5rem' }}>
              Detail Konsultasi
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '1.5rem' }}>
              <div><strong>Nama:</strong> {detailData.nama}</div>
              <div><strong>WhatsApp:</strong> {detailData.whatsapp}</div>
              <div><strong>Email:</strong> {detailData.email || '-'}</div>
              <div><strong>Jenjang:</strong> {detailData.jenjang || '-'}</div>
              <div><strong>Sekolah:</strong> {detailData.sekolah || '-'}</div>
              <div><strong>Kelas:</strong> {detailData.kelas || '-'}</div>
              <div><strong>Status Konsultasi:</strong> <StatusBadge status={detailData.status_konsultasi || 'baru'} /></div>
              <div><strong>Proses WA:</strong> <WaStatusBadge status={detailData.wa_status || 'belum'} /></div>
              <div><strong>Tujuan:</strong> {(detailData.tujuan || []).join(', ') || '-'}</div>
              <div><strong>Mata Pelajaran:</strong> {(detailData.mapel || []).join(', ') || '-'}</div>
              <div><strong>Kesulitan:</strong> {detailData.kesulitan || '-'}</div>
              <div><strong>Metode:</strong> {detailData.metode || '-'}</div>
              <div><strong>Hari:</strong> {(detailData.hari || []).join(', ') || '-'}</div>
              <div><strong>Jam:</strong> {(detailData.jam || []).join(', ') || '-'}</div>
              <div><strong>Budget:</strong> {detailData.budget || '-'}</div>
              <div><strong>Tanggal Daftar:</strong> {detailData.created_at ? new Date(detailData.created_at).toLocaleString('id-ID') : '-'}</div>
            </div>

            <hr style={{ border: `1px solid ${C.border}`, margin: '1rem 0' }} />

            {/* Status Konsultasi */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px', color: C.dark }}>Status Konsultasi</label>
              <select
                value={statusBaru}
                onChange={e => setStatusBaru(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: `1.5px solid ${C.border}`,
                  fontSize: '0.92rem',
                  fontFamily: 'inherit',
                  background: C.white,
                  outline: 'none',
                }}
              >
                <option value="baru">Baru</option>
                <option value="diproses">Diproses</option>
                <option value="selesai">Selesai</option>
              </select>
            </div>

            {/* Status Proses WA */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px', color: C.dark }}>Status Proses WhatsApp</label>
              <select
                value={waStatus}
                onChange={e => setWaStatus(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: `1.5px solid ${C.border}`,
                  fontSize: '0.92rem',
                  fontFamily: 'inherit',
                  background: C.white,
                  outline: 'none',
                }}
              >
                <option value="belum">Belum diproses</option>
                <option value="diproses">Sedang diproses via WA</option>
                <option value="selesai_join">✅ Selesai - Siswa bergabung</option>
                <option value="selesai_tidak">❌ Selesai - Siswa tidak bergabung</option>
              </select>
            </div>

            {/* Catatan Umum */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px', color: C.dark }}>Catatan Umum</label>
              <textarea
                value={catatan}
                onChange={e => setCatatan(e.target.value)}
                rows={3}
                placeholder="Catatan umum untuk tindak lanjut..."
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: `1.5px solid ${C.border}`,
                  fontSize: '0.92rem',
                  fontFamily: 'inherit',
                  background: C.white,
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
            </div>

            {/* Catatan Hasil WA */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px', color: C.dark }}>Catatan Hasil WA</label>
              <textarea
                value={waCatatan}
                onChange={e => setWaCatatan(e.target.value)}
                rows={3}
                placeholder="Tulis hasil komunikasi WhatsApp (misal: respon siswa, keputusan, dll.)"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: `1.5px solid ${C.border}`,
                  fontSize: '0.92rem',
                  fontFamily: 'inherit',
                  background: C.white,
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
            </div>

            {errorMsg && (
              <div style={{
                background: C.lightRed,
                color: C.red,
                padding: '8px 12px',
                borderRadius: '8px',
                marginBottom: '1rem',
                fontSize: '0.9rem',
              }}>
                ⚠️ {errorMsg}
              </div>
            )}

            <button
              onClick={handleUpdate}
              disabled={updating}
              style={{
                width: '100%',
                background: updating ? '#ccc' : C.gold,
                border: 'none',
                color: 'white',
                padding: '12px',
                borderRadius: '40px',
                fontWeight: 'bold',
                fontSize: '1rem',
                cursor: updating ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                transition: 'background 0.2s',
              }}
            >
              {updating ? '⏳ Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminConsulPage;