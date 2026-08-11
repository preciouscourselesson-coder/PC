// src/components/admin/adminAbsensi/entries-cards-mobile.js
import React from 'react';
import { C } from '../../shared/Theme';
import { formatTanggalDisplay, statusStyle } from './admin-absensi-helpers';
import BuktiLinks from './bukti-links';

const EntriesCardsMobile = ({
  loadingEntries,
  filteredEntries,
  updatingId,
  onUpdateStatus,
  onOpenDelete,
}) => (
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
            <div style={{ marginBottom: '8px' }}>
              <BuktiLinks urls={item.bukti_urls} size={24} />
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            {item.status === 'Menunggu' && (
              <>
                <button
                  disabled={updatingId === item.id}
                  onClick={() => onUpdateStatus(item.id, 'Disetujui')}
                  style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', background: C.green, color: C.white, fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}
                >
                  Setujui
                </button>
                <button
                  disabled={updatingId === item.id}
                  onClick={() => onUpdateStatus(item.id, 'Ditolak')}
                  style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', background: C.red, color: C.white, fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}
                >
                  Tolak
                </button>
              </>
            )}
            <button
              disabled={updatingId === item.id}
              onClick={() => onOpenDelete(item.id)}
              style={{ flex: item.status === 'Menunggu' ? '0.5' : 1, padding: '8px', borderRadius: '8px', border: `1.5px solid ${C.red}`, background: C.white, color: C.red, fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}
            >
              Hapus
            </button>
          </div>
        </div>
      );
    })}
  </div>
);

export default EntriesCardsMobile;
