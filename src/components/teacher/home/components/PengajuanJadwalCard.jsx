import React from 'react';
import { C, STATUS_SISWA_SETUJU } from '../constants';
import { getAggregateStatus } from '../utils/pengajuan';
import { getCardStyle, linkBtn } from '../utils/styles';
import { StatusPill } from './StatusPill';
import { PerubahanInfo } from './PerubahanInfo';

export const PengajuanJadwalCard = ({
  isMobile,
  pengajuanMasuk,
  respondingId,
  confirmTolakId,
  setConfirmTolakId,
  onRespond,
  pengajuanSayaGrouped,
  confirmDeleteSayaId,
  setConfirmDeleteSayaId,
  deletingSayaId,
  onDeleteSaya,
}) => (
  <div style={getCardStyle(isMobile)}>
    <h3 style={{ margin: '0 0 1rem 0', color: C.dark, fontSize: isMobile ? '1.1rem' : '1.17rem' }}>Pengajuan Perubahan Jadwal</h3>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
      <div>
        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: C.dark, marginBottom: '0.5rem' }}>
          Butuh Persetujuan Anda ({pengajuanMasuk.length})
        </div>
        {pengajuanMasuk.length === 0 ? (
          <p style={{ color: C.gray, fontSize: '0.82rem', marginTop: 0 }}>Tidak ada pengajuan dari siswa.</p>
        ) : (
          pengajuanMasuk.map((p) => (
            <div key={p.id} style={{ padding: '0.6rem 0', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontSize: '0.85rem', color: C.dark, fontWeight: 600 }}>{p.nama_pengaju || 'Siswa'}</div>
              <PerubahanInfo p={p} />
              {p.alasan && <div style={{ fontSize: '0.75rem', color: C.gray, fontStyle: 'italic' }}>"{p.alasan}"</div>}
              {confirmTolakId === p.id ? (
                <div style={{ marginTop: '0.4rem' }}>
                  <div style={{ fontSize: '0.78rem', color: C.dark, marginBottom: '0.3rem' }}>Yakin ingin menolak pengajuan ini?</div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      style={{ ...linkBtn, color: C.red, fontSize: '0.8rem', opacity: respondingId === p.id ? 0.6 : 1, padding: '8px 12px' }}
                      onClick={() => onRespond(p, false)}
                      disabled={respondingId === p.id}
                    >
                      {respondingId === p.id ? 'Memproses...' : 'Ya, Tolak'}
                    </button>
                    <button
                      style={{ ...linkBtn, color: C.gray, fontSize: '0.8rem', padding: '8px 12px' }}
                      onClick={() => setConfirmTolakId(null)}
                      disabled={respondingId === p.id}
                    >
                      Batal
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem' }}>
                  <button
                    style={{ ...linkBtn, color: C.green, fontSize: '0.8rem', opacity: respondingId === p.id ? 0.6 : 1, padding: '8px 12px' }}
                    onClick={() => onRespond(p, true)}
                    disabled={respondingId === p.id}
                  >
                    {respondingId === p.id ? 'Memproses...' : 'Setujui'}
                  </button>
                  <button
                    style={{ ...linkBtn, color: C.red, fontSize: '0.8rem', opacity: respondingId === p.id ? 0.6 : 1, padding: '8px 12px' }}
                    onClick={() => setConfirmTolakId(p.id)}
                    disabled={respondingId === p.id}
                  >
                    Tolak
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div>
        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: C.dark, marginBottom: '0.5rem' }}>
          Pengajuan Saya ({pengajuanSayaGrouped.length})
        </div>
        {pengajuanSayaGrouped.length === 0 ? (
          <p style={{ color: C.gray, fontSize: '0.82rem', marginTop: 0 }}>Belum ada pengajuan.</p>
        ) : (
          pengajuanSayaGrouped.map((item) => {
            const first = item.rows[0];
            const status = getAggregateStatus(item.rows);
            const approvedCount = item.rows.filter((r) => STATUS_SISWA_SETUJU.includes(r.status)).length;
            const bisaDihapus = status === 'ditolak' || status === 'ditolak_admin';
            return (
              <div key={item.id} style={{ padding: '0.5rem 0', borderBottom: `1px solid ${C.border}` }}>
                <PerubahanInfo p={first} />
                {item.isBatch && (
                  <div style={{ fontSize: '0.72rem', color: C.gray, margin: '2px 0' }}>
                    {approvedCount}/{item.rows.length} siswa menyetujui
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <StatusPill status={status} />
                  {bisaDihapus &&
                    (confirmDeleteSayaId === item.id ? (
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.72rem', color: C.dark }}>Hapus?</span>
                        <button
                          onClick={() => onDeleteSaya(item)}
                          disabled={deletingSayaId === item.id}
                          style={{ background: 'none', border: 'none', color: C.red, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', padding: '2px 6px' }}
                        >
                          {deletingSayaId === item.id ? 'Menghapus...' : 'Ya'}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteSayaId(null)}
                          disabled={deletingSayaId === item.id}
                          style={{ background: 'none', border: 'none', color: C.gray, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', padding: '2px 6px' }}
                        >
                          Batal
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteSayaId(item.id)}
                        title="Hapus pengajuan yang ditolak"
                        style={{ background: 'none', border: 'none', color: C.red, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', padding: '2px 6px' }}
                      >
                        Hapus
                      </button>
                    ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  </div>
);
