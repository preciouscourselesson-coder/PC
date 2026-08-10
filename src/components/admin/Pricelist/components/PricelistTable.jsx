import React from 'react';
import { C, STATUS_META } from '../constants';
import { formatRupiah, formatTanggalDisplay } from '../utils/format';
import { iconBtnStyle } from '../styles';

const PricelistTable = ({ pageItems, loadingItems, rangeStart, onView, onEdit, onDeleteRequest }) => {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
        <thead>
          <tr style={{ background: C.cream }}>
            <th rowSpan={2} style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}`, borderRadius: '8px 0 0 0' }}>No.</th>
            <th rowSpan={2} style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Kelas</th>
            <th rowSpan={2} style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Program</th>
            <th rowSpan={2} style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}`, minWidth: '150px' }}>Pertemuan</th>
            <th rowSpan={2} style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Durasi</th>
            <th rowSpan={2} style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Pengajar</th>
            <th colSpan={4} style={{ padding: '8px 10px', textAlign: 'center', borderBottom: `1px solid ${C.border}` }}>Harga (Rupiah)</th>
            <th rowSpan={2} style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Status</th>
            <th rowSpan={2} style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Tgl Berlaku</th>
            <th rowSpan={2} style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}`, borderRadius: '0 8px 0 0' }}>Aksi</th>
          </tr>
          <tr style={{ background: C.cream }}>
            <th style={{ padding: '6px 10px', textAlign: 'right', borderBottom: `1px solid ${C.border}`, fontWeight: 600, color: C.gray }}>Privat</th>
            <th style={{ padding: '6px 10px', textAlign: 'right', borderBottom: `1px solid ${C.border}`, fontWeight: 600, color: C.gray }}>2 Siswa</th>
            <th style={{ padding: '6px 10px', textAlign: 'right', borderBottom: `1px solid ${C.border}`, fontWeight: 600, color: C.gray }}>3 Siswa</th>
            <th style={{ padding: '6px 10px', textAlign: 'right', borderBottom: `1px solid ${C.border}`, fontWeight: 600, color: C.gray }}>4 Siswa</th>
          </tr>
        </thead>
        <tbody>
          {loadingItems && (
            <tr>
              <td colSpan={12} style={{ padding: '2rem', textAlign: 'center', color: C.grayLight }}>Memuat pricelist...</td>
            </tr>
          )}
          {!loadingItems && pageItems.map((item, idx) => {
            const st = STATUS_META[item.status] || STATUS_META.Nonaktif;
            return (
              <tr key={item.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                <td style={{ padding: '10px', color: C.gray }}>{rangeStart + idx}</td>
                <td style={{ padding: '10px', fontWeight: 500 }}>{item.kelas}</td>
                <td style={{ padding: '10px', fontWeight: 600 }}>{item.program}</td>
                <td style={{ padding: '10px', color: C.gray }}>{item.jumlah_pertemuan}</td>
                <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>{item.durasi}</td>
                <td style={{ padding: '10px' }}>{item.pengajar}</td>
                <td style={{ padding: '10px', textAlign: 'right', whiteSpace: 'nowrap' }}>{formatRupiah(item.harga_privat)}</td>
                <td style={{ padding: '10px', textAlign: 'right', whiteSpace: 'nowrap' }}>{item.harga_2siswa != null ? formatRupiah(item.harga_2siswa) : '-'}</td>
                <td style={{ padding: '10px', textAlign: 'right', whiteSpace: 'nowrap' }}>{item.harga_3siswa != null ? formatRupiah(item.harga_3siswa) : '-'}</td>
                <td style={{ padding: '10px', textAlign: 'right', whiteSpace: 'nowrap' }}>{item.harga_4siswa != null ? formatRupiah(item.harga_4siswa) : '-'}</td>
                <td style={{ padding: '10px' }}>
                  <span style={{ background: st.bg, color: st.fg, padding: '4px 12px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {item.status}
                  </span>
                </td>
                <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>{formatTanggalDisplay(item.tanggal_berlaku)}</td>
                <td style={{ padding: '10px' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button title="Lihat detail" onClick={() => onView(item)} style={iconBtnStyle(C.blueBg, C.blue)}>&#128065;</button>
                    <button title="Edit" onClick={() => onEdit(item)} style={iconBtnStyle(C.amberBg, C.amber)}>&#9998;</button>
                    <button title="Hapus" onClick={() => onDeleteRequest(item)} style={iconBtnStyle(C.redBg, C.red)}>&#128465;</button>
                  </div>
                </td>
              </tr>
            );
          })}
          {!loadingItems && pageItems.length === 0 && (
            <tr>
              <td colSpan={12} style={{ padding: '2rem', textAlign: 'center', color: C.grayLight }}>
                Belum ada pricelist yang cocok. Tambahkan lewat form di bawah.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default PricelistTable;
