// src/components/admin/adminAbsensi/rekap-siswa-modal.js
import React from 'react';
import { C } from '../../shared/Theme';
import logo from '../../../Resource/PC_Horisontal.png';
import { formatTanggalDisplay, bulanFromIso, statusStyle } from './admin-absensi-helpers';
import { selectStyle } from './admin-absensi-styles';

const RekapSiswaModal = ({
  show, onClose,
  studentList,
  rekapSiswaId, setRekapSiswaId,
  rekapBulan, setRekapBulan,
  onLoadRekap, loadingRekap,
  rekapData, groupedByGuru, siswaName,
  onDownloadPdf,
  rekapRef,
}) => {
  if (!show) return null;
  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 200, padding: '1rem',
      }}
    >
      <div
        style={{
          background: C.white, borderRadius: '16px', padding: '1.75rem',
          maxWidth: '850px', width: '100%', maxHeight: '90vh', overflowY: 'auto',
          boxShadow: '0 12px 32px rgba(0,0,0,0.2)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: C.dark }}>📊 Rekap Pertemuan Siswa</h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={onDownloadPdf}
              disabled={rekapData.length === 0}
              style={{
                padding: '6px 14px', borderRadius: '8px', border: 'none',
                background: C.green, color: C.white, fontWeight: 'bold',
                cursor: rekapData.length === 0 ? 'default' : 'pointer',
                opacity: rekapData.length === 0 ? 0.5 : 1,
                fontFamily: 'inherit', fontSize: '0.8rem',
              }}
            >
              📄 PDF
            </button>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: C.gray }}
            >
              ✕
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          <select value={rekapSiswaId} onChange={(e) => setRekapSiswaId(e.target.value)} style={selectStyle}>
            <option value="">-- Pilih Siswa --</option>
            {studentList.map((s) => (
              <option key={s.id} value={s.id}>{s.full_name}</option>
            ))}
          </select>

          <input
            type="month"
            value={rekapBulan}
            onChange={(e) => setRekapBulan(e.target.value)}
            style={{ ...selectStyle, cursor: 'text' }}
          />

          <button
            onClick={onLoadRekap}
            disabled={loadingRekap}
            style={{
              padding: '9px 20px', borderRadius: '8px', border: 'none',
              background: C.gold, color: C.white, fontWeight: 'bold',
              cursor: loadingRekap ? 'default' : 'pointer', opacity: loadingRekap ? 0.6 : 1,
              fontFamily: 'inherit', fontSize: '0.85rem',
            }}
          >
            {loadingRekap ? 'Memuat...' : 'Tampilkan'}
          </button>
        </div>

        {rekapData.length === 0 && !loadingRekap && (
          <div style={{ textAlign: 'center', color: C.grayLight, padding: '1.5rem 0' }}>
            Belum ada data untuk siswa dan bulan ini.
          </div>
        )}

        {rekapData.length > 0 && (
          <div id="rekap-print" ref={rekapRef}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', borderBottom: `2px solid ${C.gold}`, paddingBottom: '0.5rem' }}>
              <img src={logo} alt="Precious Course" style={{ height: '40px' }} />
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: C.dark }}>Rekap Pertemuan</div>
                <div style={{ fontSize: '0.8rem', color: C.gray }}>{siswaName} — {bulanFromIso(rekapBulan + '-01')}</div>
              </div>
            </div>

            {groupedByGuru.map((group, idx) => (
              <div key={idx} style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontWeight: 'bold', fontSize: '1rem', color: C.goldDark, borderBottom: `1px solid ${C.gold}`, paddingBottom: '4px', marginBottom: '8px' }}>
                  👨‍🏫 {group.guru_name}
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ background: C.cream }}>
                        <th style={{ padding: '6px 8px', borderBottom: `1px solid ${C.border}`, textAlign: 'left' }}>No.</th>
                        <th style={{ padding: '6px 8px', borderBottom: `1px solid ${C.border}`, textAlign: 'left' }}>Tanggal</th>
                        <th style={{ padding: '6px 8px', borderBottom: `1px solid ${C.border}`, textAlign: 'left' }}>Materi</th>
                        <th style={{ padding: '6px 8px', borderBottom: `1px solid ${C.border}`, textAlign: 'left' }}>Catatan</th>
                        <th style={{ padding: '6px 8px', borderBottom: `1px solid ${C.border}`, textAlign: 'left' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.items.map((item, idx2) => {
                        const st = statusStyle(item.status);
                        return (
                          <tr key={idx2} style={{ borderBottom: `1px solid ${C.border}` }}>
                            <td style={{ padding: '6px 8px' }}>{idx2 + 1}</td>
                            <td style={{ padding: '6px 8px' }}>{formatTanggalDisplay(item.tanggal)}</td>
                            <td style={{ padding: '6px 8px', fontWeight: 500 }}>{item.judul_materi}</td>
                            <td style={{ padding: '6px 8px', color: C.gray }}>{item.catatan || '-'}</td>
                            <td style={{ padding: '6px 8px' }}>
                              <span style={{ background: st.bg, color: st.fg, padding: '2px 10px', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 600 }}>
                                {item.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      <tr style={{ background: C.cream }}>
                        <td colSpan={5} style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 'bold' }}>
                          Total dengan {group.guru_name}: {group.items.length} pertemuan
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

            <div style={{ marginTop: '1rem', fontSize: '0.7rem', color: C.grayLight, textAlign: 'center', borderTop: `1px solid ${C.border}`, paddingTop: '0.5rem' }}>
              Total seluruh pertemuan: {rekapData.length} • Dicetak dari Precious Course • {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RekapSiswaModal;
