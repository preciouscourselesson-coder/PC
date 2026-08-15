import React from 'react';
import { C } from '../constants';

const STATUS_MAP = {
  menunggu_persetujuan: { label: 'Menunggu Persetujuan', bg: C.goldBg, color: C.gold },
  disetujui_siswa: { label: 'Menunggu Siswa Lain', bg: C.goldBg, color: C.gold },
  disetujui_menunggu_admin: { label: 'Disetujui, Menunggu Admin', bg: C.greenBg, color: C.green },
  ditolak: { label: 'Ditolak', bg: C.redBg, color: C.red },
  disetujui_admin: { label: 'Disetujui Admin', bg: C.greenBg, color: C.green },
  ditolak_admin: { label: 'Ditolak Admin', bg: C.redBg, color: C.red },
};

export const StatusPill = ({ status }) => {
  const s = STATUS_MAP[status] || { label: status, bg: C.cream, color: C.gray };
  return (
    <span
      style={{
        fontSize: '0.72rem',
        fontWeight: 600,
        padding: '2px 8px',
        borderRadius: '999px',
        background: s.bg,
        color: s.color,
      }}
    >
      {s.label}
    </span>
  );
};
