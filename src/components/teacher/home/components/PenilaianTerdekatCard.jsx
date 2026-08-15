import React from 'react';
import { C, MAPEL_TUGAS_LIST } from '../constants';
import { getCardStyle } from '../utils/styles';

export const PenilaianTerdekatCard = ({
  ujianTerdekatList,
  loading,
  isMobile,
  confirmDeleteUjianId,
  setConfirmDeleteUjianId,
  deletingUjianId,
  onDelete,
}) => (
  <div style={getCardStyle(isMobile)}>
    <h3 style={{ margin: '0 0 1rem 0', color: C.dark, fontSize: isMobile ? '1.1rem' : '1.17rem' }}>Penilaian/Tugas Terdekat (dari Siswa)</h3>
    {loading ? (
      <p style={{ fontSize: '0.85rem', color: C.gray }}>Memuat...</p>
    ) : ujianTerdekatList.length === 0 ? (
      <p style={{ fontSize: '0.85rem', color: C.gray }}>Belum ada penilaian/tugas dari siswa.</p>
    ) : (
      ujianTerdekatList.map((item, idx) => (
        <div key={item.id} style={{ padding: '0.75rem 0', borderBottom: idx < ujianTerdekatList.length - 1 ? `1px solid ${C.border}` : 'none' }}>
          <div
            style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: isMobile ? '0.25rem' : 0,
            }}
          >
            <div>
              <div style={{ fontWeight: '600', color: C.dark, fontSize: isMobile ? '1rem' : '0.9rem' }}>{item.judul_bab || item.materi}</div>
              <div style={{ fontSize: '0.85rem', color: C.gray }}>
                {item.mapel ? MAPEL_TUGAS_LIST.find((m) => m.value === item.mapel)?.label || item.mapel : item.id_mapel?.nama}
                {item.id_bab?.nama ? ` - ${item.id_bab.nama}` : ''}
              </div>
              <div style={{ fontSize: '0.8rem', color: C.gray }}>Dari siswa: {item.nama_siswa || 'Tidak diketahui'}</div>
              {item.nama_guru_sekolah && (
                <div style={{ fontSize: '0.8rem', color: C.gray }}>Guru pengajar di sekolah: {item.nama_guru_sekolah}</div>
              )}
              {(item.deskripsi || item.catatan_link) && (
                <div style={{ fontSize: '0.78rem', color: C.gray, fontStyle: 'italic' }}>
                  {item.deskripsi}
                  {item.catatan_link && (
                    <>
                      {item.deskripsi ? ' - ' : ''}
                      <a href={item.catatan_link} target="_blank" rel="noopener noreferrer" style={{ color: C.gold }}>
                        Lihat link materi ujian
                      </a>
                    </>
                  )}
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
                {new Date(item.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
              {confirmDeleteUjianId === item.id ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                  <span style={{ fontSize: '0.72rem', color: C.dark }}>Yakin hapus?</span>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button
                      onClick={() => onDelete(item)}
                      disabled={deletingUjianId === item.id}
                      style={{ background: 'none', border: 'none', color: C.red, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', padding: '2px 4px', opacity: deletingUjianId === item.id ? 0.6 : 1 }}
                    >
                      {deletingUjianId === item.id ? 'Menghapus...' : 'Ya, Hapus'}
                    </button>
                    <button
                      onClick={() => setConfirmDeleteUjianId(null)}
                      disabled={deletingUjianId === item.id}
                      style={{ background: 'none', border: 'none', color: C.gray, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', padding: '2px 4px' }}
                    >
                      Batal
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDeleteUjianId(item.id)}
                  style={{ background: 'none', border: 'none', color: C.red, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', padding: '2px 4px' }}
                >
                  Hapus
                </button>
              )}
            </div>
          </div>
        </div>
      ))
    )}
  </div>
);
