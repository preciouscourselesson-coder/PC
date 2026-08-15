import React from 'react';
import { C } from '../constants';
import { waktuLalu } from '../utils/format';

export const MateriRequestList = ({ materiRequestList, loading, guruOptions }) => {
  if (loading) return <p style={{ fontSize: '0.85rem', color: C.gray }}>Memuat...</p>;
  if (materiRequestList.length === 0) return <p style={{ fontSize: '0.85rem', color: C.gray }}>Belum ada permintaan materi.</p>;

  return materiRequestList.map((item, idx) => (
    <div key={item.id} style={{ padding: '0.75rem 0', borderBottom: idx < materiRequestList.length - 1 ? `1px solid ${C.border}` : 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '6px 10px' }}>
        <div style={{ flex: '1 1 160px', minWidth: 0 }}>
          <div style={{ fontWeight: '600', color: C.dark, wordBreak: 'break-word' }}>{item.judul_materi}</div>
          <div style={{ fontSize: '0.85rem', color: C.gray, wordBreak: 'break-word' }}>
            Untuk guru: {guruOptions.find((g) => g.id === item.guru_id)?.nama || '...'}
          </div>
          {item.deskripsi && <div style={{ fontSize: '0.78rem', color: C.gray, fontStyle: 'italic', wordBreak: 'break-word' }}>{item.deskripsi}</div>}
          {item.file_url && (
            <a
              href={item.file_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: '0.78rem', color: C.gold, fontWeight: 600, textDecoration: 'none', wordBreak: 'break-word', display: 'inline-block', marginTop: '2px' }}
            >
              📎 {item.file_name || 'Lihat File'}
            </a>
          )}
          <div style={{ fontSize: '0.75rem', color: C.gray }}>{waktuLalu(item.created_at)}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', maxWidth: '220px' }}>
          {item.status === 'selesai' ? (
            <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '2px 8px', borderRadius: '999px', background: C.greenBg, color: C.green, whiteSpace: 'nowrap' }}>
              ✅ Selesai
            </span>
          ) : item.status === 'ditolak' ? (
            <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '2px 8px', borderRadius: '999px', background: C.redBg, color: C.red, whiteSpace: 'nowrap' }}>
              ❌ Ditolak
            </span>
          ) : (
            <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '2px 8px', borderRadius: '999px', background: C.goldBg, color: C.gold, whiteSpace: 'nowrap' }}>
              ⏳ Menunggu
            </span>
          )}
          {item.catatan_guru && (
            <div style={{ fontSize: '0.72rem', color: C.gray, background: C.cream, padding: '4px 8px', borderRadius: '4px', textAlign: 'right', wordBreak: 'break-word' }}>
              💬 {item.catatan_guru}
            </div>
          )}
        </div>
      </div>
    </div>
  ));
};
