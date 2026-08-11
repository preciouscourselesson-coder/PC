// src/components/admin/adminAbsensi/mini-status-bar.js
import React from 'react';
import { C } from '../../shared/Theme';

const MiniStatusBar = ({ counts }) => {
  const total = (counts.Menunggu || 0) + (counts.Disetujui || 0) + (counts.Ditolak || 0);
  if (total === 0) return <span style={{ color: C.grayLight, fontSize: '0.75rem' }}>Belum ada data</span>;
  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
      {counts.Disetujui > 0 && (
        <span style={{ background: C.greenBg, color: C.green, borderRadius: '999px', padding: '2px 8px', fontSize: '0.7rem', fontWeight: 700 }}>
          {counts.Disetujui} Disetujui
        </span>
      )}
      {counts.Menunggu > 0 && (
        <span style={{ background: C.amberBg, color: C.amber, borderRadius: '999px', padding: '2px 8px', fontSize: '0.7rem', fontWeight: 700 }}>
          {counts.Menunggu} Menunggu
        </span>
      )}
      {counts.Ditolak > 0 && (
        <span style={{ background: C.redBg, color: C.red, borderRadius: '999px', padding: '2px 8px', fontSize: '0.7rem', fontWeight: 700 }}>
          {counts.Ditolak} Ditolak
        </span>
      )}
    </div>
  );
};

export default MiniStatusBar;
