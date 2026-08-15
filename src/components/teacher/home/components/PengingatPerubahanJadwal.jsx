import React from 'react';
import { C } from '../constants';
import { PerubahanInfo } from './PerubahanInfo';

export const PengingatPerubahanJadwal = ({
  isMobile,
  perubahanDisetujuiList,
  showAllPengingat,
  setShowAllPengingat,
  confirmDeleteRiwayatId,
  setConfirmDeleteRiwayatId,
  deletingRiwayatId,
  onDelete,
}) => (
  <div
    style={{
      background: C.goldBg,
      borderRadius: '12px',
      padding: isMobile ? '0.85rem 1rem' : '1rem 1.5rem',
      border: `1px solid ${C.gold}`,
      marginBottom: isMobile ? '1rem' : '1.5rem',
    }}
  >
    <p style={{ margin: '0 0 0.5rem 0', color: C.dark, fontSize: isMobile ? '0.85rem' : '0.95rem', fontWeight: 700 }}>
      ⚠️ Pengingat Perubahan Jadwal
    </p>
    {perubahanDisetujuiList.length === 0 ? (
      <p style={{ margin: 0, color: C.dark, fontSize: isMobile ? '0.85rem' : '0.95rem' }}>Tidak ada perubahan jadwal yang sudah disetujui saat ini.</p>
    ) : (
      <>
        {(showAllPengingat ? perubahanDisetujuiList : perubahanDisetujuiList.slice(0, 3)).map((p, idx) => (
          <div
            key={p.id}
            style={{
              padding: '0.5rem 0',
              borderTop: idx > 0 ? `1px solid ${C.gold}55` : 'none',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: '0.75rem',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ flex: '1 1 240px' }}>
              <div style={{ fontSize: isMobile ? '0.8rem' : '0.85rem', color: C.dark }}>
                {p.diajukan_oleh === 'siswa' ? p.nama_pengaju || 'Siswa' : 'Anda'} · disetujui siswa, guru, & admin
              </div>
              <PerubahanInfo p={p} />
            </div>
            {confirmDeleteRiwayatId === p.id ? (
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', color: C.dark }}>Hapus?</span>
                <button
                  onClick={() => onDelete(p)}
                  disabled={deletingRiwayatId === p.id}
                  style={{ background: 'none', border: 'none', color: C.red, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', padding: '2px 6px' }}
                >
                  {deletingRiwayatId === p.id ? 'Menghapus...' : 'Ya'}
                </button>
                <button
                  onClick={() => setConfirmDeleteRiwayatId(null)}
                  disabled={deletingRiwayatId === p.id}
                  style={{ background: 'none', border: 'none', color: C.gray, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', padding: '2px 6px' }}
                >
                  Batal
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDeleteRiwayatId(p.id)}
                title="Hapus pengingat ini"
                style={{ background: 'none', border: 'none', color: C.red, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', padding: '2px 6px', whiteSpace: 'nowrap' }}
              >
                Hapus
              </button>
            )}
          </div>
        ))}
        {perubahanDisetujuiList.length > 3 && (
          <button
            onClick={() => setShowAllPengingat((s) => !s)}
            style={{ background: 'none', border: 'none', color: C.gold, fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', padding: '6px 2px', marginTop: '0.25rem' }}
          >
            {showAllPengingat ? 'Sembunyikan' : `Tampilkan semua (${perubahanDisetujuiList.length})`}
          </button>
        )}
      </>
    )}
  </div>
);
