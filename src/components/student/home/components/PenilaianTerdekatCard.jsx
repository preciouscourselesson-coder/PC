import React from 'react';
import { C, MAPEL_TUGAS_LIST } from '../constants';
import { getCardStyle, linkBtn } from '../utils/styles';

export const PenilaianTerdekatCard = ({
  ujianTerdekatList,
  loading,
  isMobile,
  onAdd,
  onEdit,
  confirmDeleteTugasId,
  setConfirmDeleteTugasId,
  deletingTugasId,
  onDelete,
}) => (
  <div style={getCardStyle(isMobile)}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
      <h3 style={{ margin: 0, color: C.dark }}>Penilaian/Tugas Terdekat</h3>
      <button style={linkBtn} onClick={onAdd}>
        + Tambah
      </button>
    </div>

    {loading ? (
      <p style={{ fontSize: '0.85rem', color: C.gray }}>Memuat...</p>
    ) : ujianTerdekatList.length === 0 ? (
      <p style={{ fontSize: '0.85rem', color: C.gray }}>Belum ada penilaian/tugas terjadwal.</p>
    ) : (
      ujianTerdekatList.map((item, idx) => (
        <div
          key={item.id}
          style={{ padding: '0.75rem 0', borderBottom: idx < ujianTerdekatList.length - 1 ? `1px solid ${C.border}` : 'none' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '4px 8px' }}>
            <div style={{ flex: '1 1 180px', minWidth: 0 }}>
              <div style={{ fontWeight: '600', color: C.dark, wordBreak: 'break-word' }}>{item.judul_bab}</div>
              <div style={{ fontSize: '0.85rem', color: C.gray, wordBreak: 'break-word' }}>
                {MAPEL_TUGAS_LIST.find((m) => m.value === item.mapel)?.label || item.mapel}
                {item.nama_guru_sekolah ? ` - ${item.nama_guru_sekolah}` : ''}
              </div>
              {item.nama_siswa && <div style={{ fontSize: '0.8rem', color: C.gray }}>Siswa: {item.nama_siswa}</div>}
              {item.catatan_link && (
                <div style={{ fontSize: '0.78rem', wordBreak: 'break-word' }}>
                  <a href={item.catatan_link} target="_blank" rel="noopener noreferrer" style={{ color: C.gold }}>
                    Lihat link materi ujian
                  </a>
                </div>
              )}
              {item.catatan_gambar_url && (
                <a href={item.catatan_gambar_url} target="_blank" rel="noopener noreferrer">
                  <img
                    src={item.catatan_gambar_url}
                    alt="Catatan"
                    style={{ marginTop: '4px', width: '56px', height: '56px', objectFit: 'cover', borderRadius: '6px', border: `1px solid ${C.border}` }}
                  />
                </a>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
              <span style={{ fontSize: '0.8rem', color: C.gray, whiteSpace: 'nowrap' }}>
                {new Date(item.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: isMobile ? 'short' : 'long', year: 'numeric' })}
              </span>
              {confirmDeleteTugasId === item.id ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                  <span style={{ fontSize: '0.72rem', color: C.dark }}>Yakin hapus?</span>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button
                      onClick={() => onDelete(item)}
                      disabled={deletingTugasId === item.id}
                      style={{ background: 'none', border: 'none', color: C.red, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', padding: '2px 4px', opacity: deletingTugasId === item.id ? 0.6 : 1 }}
                    >
                      {deletingTugasId === item.id ? 'Menghapus...' : 'Ya, Hapus'}
                    </button>
                    <button
                      onClick={() => setConfirmDeleteTugasId(null)}
                      disabled={deletingTugasId === item.id}
                      style={{ background: 'none', border: 'none', color: C.gray, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', padding: '2px 4px' }}
                    >
                      Batal
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => onEdit(item)}
                    style={{ background: 'none', border: 'none', color: C.gold, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', padding: '2px 4px' }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setConfirmDeleteTugasId(item.id)}
                    style={{ background: 'none', border: 'none', color: C.red, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', padding: '2px 4px' }}
                  >
                    Hapus
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ))
    )}
  </div>
);
