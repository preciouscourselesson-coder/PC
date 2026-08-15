import React from 'react';
import { C } from '../constants';
import { formatJam } from '../utils/format';

export const PerubahanInfo = ({ p }) => {
  const asal = p.jadwal_les;
  const asalStr = asal ? `${asal.hari} ${formatJam(asal.jam_mulai)}-${formatJam(asal.jam_selesai)}` : 'jadwal asal tidak ditemukan';
  const baruStr = `${p.hari_baru || '-'} ${formatJam(p.jam_mulai_baru)}-${formatJam(p.jam_selesai_baru)}`;
  return (
    <>
      <div style={{ fontSize: '0.78rem', color: C.gray }}>
        <span style={{ textDecoration: 'line-through', opacity: 0.7 }}>{asalStr}</span>
        {' → '}
        <span style={{ fontWeight: 600, color: C.dark }}>{baruStr}</span>
      </div>
      {p.is_temporary_baru && p.tanggal_temporary_baru ? (
        <div style={{ fontSize: '0.72rem', color: C.gold, fontWeight: 600, marginTop: '2px' }}>
          Khusus tanggal {new Date(p.tanggal_temporary_baru).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} saja
          (jadwal rutin minggu lain tidak berubah)
        </div>
      ) : (
        <div style={{ fontSize: '0.72rem', color: C.green, fontWeight: 600, marginTop: '2px' }}>Perubahan permanen pada jadwal rutin</div>
      )}
    </>
  );
};
