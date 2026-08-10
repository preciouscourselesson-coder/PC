// src/components/admin/adminAbsensi/rekap-summary-table.js
import React from 'react';
import { C } from '../../Theme';
import { initials, avatarColor } from './admin-absensi-helpers';
import MiniStatusBar from './mini-status-bar';

// Props:
// - rekapTab: 'guru' | 'siswa'
// - onChangeTab(tab)
// - rows: array baris (rekapPerGuru atau rekapPerSiswa, dipilih oleh parent)
// - loading: boolean
// - onRowClick(row): dipanggil saat baris diklik (untuk set filter)
const RekapSummaryTable = ({ rekapTab, onChangeTab, rows, loading, onRowClick }) => (
  <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '14px', marginBottom: '1.5rem', overflow: 'hidden' }}>
    <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}` }}>
      <button
        onClick={() => onChangeTab('guru')}
        style={{
          flex: 1,
          padding: '0.85rem',
          border: 'none',
          cursor: 'pointer',
          background: rekapTab === 'guru' ? C.cream : C.white,
          color: rekapTab === 'guru' ? C.dark : C.gray,
          fontWeight: 700,
          fontSize: '0.85rem',
        }}
      >
        Rekap per Guru
      </button>
      <button
        onClick={() => onChangeTab('siswa')}
        style={{
          flex: 1,
          padding: '0.85rem',
          border: 'none',
          cursor: 'pointer',
          background: rekapTab === 'siswa' ? C.cream : C.white,
          color: rekapTab === 'siswa' ? C.dark : C.gray,
          fontWeight: 700,
          fontSize: '0.85rem',
        }}
      >
        Rekap per Siswa
      </button>
    </div>

    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
        <thead>
          <tr style={{ background: C.cream }}>
            <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>
              {rekapTab === 'guru' ? 'Nama Guru' : 'Nama Siswa'}
            </th>
            <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Total Pertemuan</th>
            <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Rincian Status</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={3} style={{ padding: '1.5rem', textAlign: 'center', color: C.grayLight }}>
                Memuat rekap...
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={3} style={{ padding: '1.5rem', textAlign: 'center', color: C.grayLight }}>
                Belum ada data.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={row.id}
                onClick={() => onRowClick(row)}
                style={{ borderBottom: `1px solid ${C.border}`, cursor: 'pointer' }}
              >
                <td style={{ padding: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        width: '26px', height: '26px', borderRadius: '50%',
                        background: avatarColor(row.nama), color: C.white,
                        fontSize: '0.65rem', fontWeight: 700,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}
                    >
                      {initials(row.nama)}
                    </span>
                    <span style={{ fontWeight: 600 }}>{row.nama}</span>
                  </div>
                </td>
                <td style={{ padding: '10px', fontWeight: 700 }}>{row.total}</td>
                <td style={{ padding: '10px' }}>
                  <MiniStatusBar counts={row} />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  </div>
);

export default RekapSummaryTable;
