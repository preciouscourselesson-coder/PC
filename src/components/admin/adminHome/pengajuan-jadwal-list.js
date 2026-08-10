// src/components/admin/adminHome/PengajuanJadwalList.js
import React from 'react';
import { C } from '../../Theme';
import { asalJadwalStr, baruJadwalStr } from './admin-home-helpers';

const PengajuanJadwalList = ({ pengajuanJadwal, respondingPengajuanId, onRespond }) => {
  if (pengajuanJadwal.length === 0) return null;

  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: C.dark, marginBottom: '0.5rem' }}>
        Permintaan Menunggu Persetujuan Anda ({pengajuanJadwal.length})
      </div>
      {pengajuanJadwal.map((p) => (
        <div key={p.id} style={{ padding: '0.6rem 0', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
            <div>
              <div style={{ fontWeight: '600', color: C.dark, fontSize: '0.85rem' }}>
                {p.nama_pengaju || (p.diajukan_oleh === 'guru' ? 'Guru' : 'Siswa')}
                <span style={{ fontWeight: 400, color: C.gray, fontSize: '0.75rem', marginLeft: '6px' }}>
                  (diajukan oleh {p.diajukan_oleh})
                </span>
              </div>
              <div style={{ fontSize: '0.8rem', color: C.gray, marginTop: '2px' }}>
                <span style={{ textDecoration: 'line-through', opacity: 0.7 }}>{asalJadwalStr(p)}</span>
                {' → '}
                <span style={{ fontWeight: 600, color: C.dark }}>{baruJadwalStr(p)}</span>
              </div>
              {p.is_temporary_baru && p.tanggal_temporary_baru ? (
                <div style={{ fontSize: '0.72rem', color: C.gold, fontWeight: 600, marginTop: '2px' }}>
                  Khusus tanggal {new Date(p.tanggal_temporary_baru).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} saja
                </div>
              ) : (
                <div style={{ fontSize: '0.72rem', color: C.green, fontWeight: 600, marginTop: '2px' }}>
                  Perubahan permanen
                </div>
              )}
              {p.alasan && (
                <div style={{ fontSize: '0.78rem', color: C.gray, fontStyle: 'italic', marginTop: '2px' }}>
                  "{p.alasan}"
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
              <button
                onClick={() => onRespond(p, true)}
                disabled={respondingPengajuanId === p.id}
                style={{
                  background: C.green,
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '5px 10px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: respondingPengajuanId === p.id ? 'default' : 'pointer',
                  opacity: respondingPengajuanId === p.id ? 0.6 : 1,
                  whiteSpace: 'nowrap',
                }}
              >
                {respondingPengajuanId === p.id ? '...' : 'Setujui'}
              </button>
              <button
                onClick={() => onRespond(p, false)}
                disabled={respondingPengajuanId === p.id}
                style={{
                  background: 'transparent',
                  color: C.red,
                  border: `1.5px solid ${C.red}`,
                  borderRadius: '6px',
                  padding: '5px 10px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: respondingPengajuanId === p.id ? 'default' : 'pointer',
                  opacity: respondingPengajuanId === p.id ? 0.6 : 1,
                  whiteSpace: 'nowrap',
                }}
              >
                Tolak
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PengajuanJadwalList;
