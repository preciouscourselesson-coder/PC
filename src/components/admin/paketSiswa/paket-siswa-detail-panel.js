// src/components/admin/paketSiswa/PaketSiswaDetailPanel.js
import React from 'react';
import { D } from '../../Theme';
import { STATUS_META, getPengajarMeta, formatRupiah, formatTanggal } from './paket-siswa-helpers';

const PaketSiswaDetailPanel = ({ selectedItem, onEdit, onBayar }) => {
  return (
    <div
      style={{
        background: D.bg,
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 12px 32px rgba(0,0,0,0.28)',
      }}
    >
      <div
        style={{
          padding: '1.1rem 1.5rem',
          background: D.bgSoft,
          borderBottom: `1px solid ${D.gold}`,
        }}
      >
        <span style={{ color: D.gold, fontWeight: 800, fontSize: '0.98rem' }}>DETAIL PAKET SISWA</span>
      </div>
      <div style={{ padding: '1.5rem' }}>
        {!selectedItem ? (
          <div style={{ color: D.textFaint, textAlign: 'center', padding: '2rem 0' }}>
            Klik ikon &#128065; pada salah satu baris untuk melihat detail paket siswa di sini.
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <div>
                <div style={{ color: D.text, fontSize: '1.1rem', fontWeight: 800 }}>
                  {selectedItem.siswa_nama}
                </div>
                <div style={{ color: D.textMuted, fontSize: '0.8rem' }}>
                  {selectedItem.siswa_id_display}
                </div>
              </div>
              <div style={{ color: D.textMuted }}>{selectedItem.kelas_siswa}</div>
              <span
                style={{
                  background: STATUS_META[selectedItem.status]?.bg,
                  color: STATUS_META[selectedItem.status]?.fg,
                  padding: '3px 14px',
                  borderRadius: '999px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                }}
              >
                {selectedItem.status}
              </span>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '1.5rem',
                marginTop: '1.25rem',
              }}
            >
              <div>
                <div style={{ color: D.gold, fontSize: '0.8rem', fontWeight: 700, marginBottom: '10px' }}>
                  Informasi Paket
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                  <div style={{ color: D.textMuted }}>
                    Paket <span style={{ float: 'right', color: D.text }}>{selectedItem.paket}</span>
                  </div>
                  <div style={{ color: D.textMuted }}>
                    Jenis <span style={{ float: 'right', color: D.text }}>
                      {selectedItem.jenis}
                      {selectedItem.jenis === 'Group' && selectedItem.jumlah_siswa_group ? ` (${selectedItem.jumlah_siswa_group} orang)` : ''}
                    </span>
                  </div>
                  <div style={{ color: D.textMuted, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Tipe Pengajar</span>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: getPengajarMeta(selectedItem.pengajar).bg,
                        color: getPengajarMeta(selectedItem.pengajar).fg,
                        padding: '2px 12px',
                        borderRadius: '999px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                      }}
                    >
                      {getPengajarMeta(selectedItem.pengajar).icon} {selectedItem.pengajar || 'Belum diatur'}
                    </span>
                  </div>
                  <div style={{ color: D.textMuted }}>
                    Jumlah Pertemuan/Bulan{' '}
                    <span style={{ float: 'right', color: D.gold, fontWeight: 700 }}>
                      {selectedItem.total_pertemuan}
                    </span>
                  </div>
                  <div style={{ color: D.textMuted }}>
                    Tanggal Mulai{' '}
                    <span style={{ float: 'right', color: D.text }}>
                      {formatTanggal(selectedItem.tanggal_mulai)}
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <div style={{ color: D.gold, fontSize: '0.8rem', fontWeight: 700, marginBottom: '10px' }}>
                  Pembayaran
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                  <div style={{ color: D.textMuted }}>
                    Total Harga{' '}
                    <span style={{ float: 'right', color: D.gold, fontWeight: 700, fontSize: '1rem' }}>
                      {formatRupiah(selectedItem.harga)}
                    </span>
                  </div>
                  {selectedItem.is_harga_custom && (
                    <div
                      style={{
                        background: 'rgba(224,87,79,0.12)',
                        border: `1px solid ${D.danger}`,
                        borderRadius: '8px',
                        padding: '8px 10px',
                        fontSize: '0.72rem',
                        color: D.text,
                      }}
                    >
                      ⚠️ Harga khusus, bukan dari pricelist standar
                      <span style={{ color: D.textMuted }}>
                        {' '}(pricelist: {formatRupiah(selectedItem.harga_dari_pricelist)})
                      </span>
                      {selectedItem.catatan_harga_custom && (
                        <div style={{ color: D.textMuted, marginTop: '3px' }}>
                          {selectedItem.catatan_harga_custom}
                        </div>
                      )}
                    </div>
                  )}
                  {selectedItem.pricelist && (
                    <div
                      style={{
                        marginTop: '8px',
                        paddingTop: '8px',
                        borderTop: `1px solid ${D.fieldBorder}`,
                      }}
                    >
                      <div style={{ fontSize: '0.7rem', color: D.textFaint }}>Detail Pricelist:</div>
                      <div style={{ fontSize: '0.75rem', color: D.textMuted }}>
                        {selectedItem.pricelist.jumlah_pertemuan} &middot; {selectedItem.pricelist.durasi}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div
              style={{
                marginTop: '1.5rem',
                paddingTop: '1rem',
                borderTop: `1px solid ${D.fieldBorder}`,
                display: 'flex',
                gap: '12px',
              }}
            >
              <button
                onClick={() => onEdit(selectedItem)}
                style={{
                  background: D.goldSoft,
                  border: `1px solid ${D.gold}`,
                  color: D.gold,
                  padding: '8px 20px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                &#9998; Edit Paket
              </button>
              <button
                onClick={() => onBayar(selectedItem)}
                style={{
                  background: 'none',
                  border: `1px solid ${D.fieldBorder}`,
                  color: D.textMuted,
                  padding: '8px 20px',
                  borderRadius: '8px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                &#128176; Pembayaran
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PaketSiswaDetailPanel;