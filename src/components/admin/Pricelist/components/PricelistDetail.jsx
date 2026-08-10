import React from 'react';
import { D, STATUS_OPTIONS, STATUS_META } from '../constants';
import { formatRupiah, formatTanggalDisplay, formatTanggalWaktu } from '../utils/format';

const PricelistDetail = ({ selectedItem, riwayat, loadingRiwayat, onDuplikasi }) => {
  return (
    <div style={{ background: D.bg, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 12px 32px rgba(0,0,0,0.28)' }}>
      <div style={{ padding: '1.1rem 1.5rem', background: D.bgSoft, borderBottom: `1px solid ${D.gold}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: D.gold, fontWeight: 800, fontSize: '0.98rem', letterSpacing: '0.02em' }}>DETAIL PRICELIST</span>
        {selectedItem && (
          <button
            onClick={() => onDuplikasi(selectedItem)}
            style={{ background: D.goldSoft, border: `1px solid ${D.gold}`, color: D.gold, padding: '6px 14px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
          >
            &#10697; Duplikasi
          </button>
        )}
      </div>

      <div style={{ padding: '1.5rem' }}>
        {!selectedItem ? (
          <div style={{ color: D.textFaint, fontSize: '0.85rem', textAlign: 'center', padding: '2rem 0' }}>
            Klik ikon &#128065; pada salah satu baris tabel untuk melihat detail pricelist di sini.
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ color: D.text, fontSize: '1.1rem', fontWeight: 800 }}>{selectedItem.program}</span>
              <span style={{
                background: STATUS_META[selectedItem.status]?.bg, color: STATUS_META[selectedItem.status]?.fg,
                padding: '3px 12px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700,
              }}>
                {selectedItem.status}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginTop: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                <div style={{ color: D.textMuted }}>&#127979; Jenjang <span style={{ float: 'right', color: D.text }}>{selectedItem.kelas}</span></div>
                <div style={{ color: D.textMuted }}>&#128218; Program <span style={{ float: 'right', color: D.text }}>{selectedItem.program}</span></div>
                <div style={{ color: D.textMuted }}>&#128197; Pertemuan <span style={{ float: 'right', color: D.text, textAlign: 'right' }}>{selectedItem.jumlah_pertemuan}</span></div>
                <div style={{ color: D.textMuted }}>&#9201; Durasi <span style={{ float: 'right', color: D.text }}>{selectedItem.durasi}</span></div>
                <div style={{ color: D.textMuted }}>&#128100; Pengajar <span style={{ float: 'right', color: D.text }}>{selectedItem.pengajar}</span></div>
                <div style={{ color: D.textMuted }}>&#128198; Tgl Berlaku <span style={{ float: 'right', color: D.text }}>{formatTanggalDisplay(selectedItem.tanggal_berlaku)}</span></div>
              </div>

              <div>
                <div style={{ color: D.gold, fontSize: '0.8rem', fontWeight: 700, marginBottom: '8px' }}>Harga (Rupiah)</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: D.textMuted }}>Privat</span><span style={{ color: D.gold, fontWeight: 700 }}>{formatRupiah(selectedItem.harga_privat)}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: D.textMuted }}>2 Siswa</span><span style={{ color: D.gold, fontWeight: 700 }}>{selectedItem.harga_2siswa != null ? formatRupiah(selectedItem.harga_2siswa) : '-'}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: D.textMuted }}>3 Siswa</span><span style={{ color: D.gold, fontWeight: 700 }}>{selectedItem.harga_3siswa != null ? formatRupiah(selectedItem.harga_3siswa) : '-'}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: D.textMuted }}>4 Siswa</span><span style={{ color: D.gold, fontWeight: 700 }}>{selectedItem.harga_4siswa != null ? formatRupiah(selectedItem.harga_4siswa) : '-'}</span></div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '1.5rem' }}>
              <div style={{ color: D.gold, fontSize: '0.8rem', fontWeight: 700, marginBottom: '8px' }}>Riwayat Perubahan</div>
              {loadingRiwayat ? (
                <div style={{ color: D.textFaint, fontSize: '0.8rem' }}>Memuat riwayat...</div>
              ) : riwayat.length === 0 ? (
                <div style={{ color: D.textFaint, fontSize: '0.8rem' }}>Belum ada riwayat perubahan.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '220px', overflowY: 'auto' }}>
                  {riwayat.map((r) => (
                    <div key={r.id} style={{ borderLeft: `2px solid ${D.gold}`, paddingLeft: '10px' }}>
                      <div style={{ fontSize: '0.75rem', color: D.textMuted }}>
                        {formatTanggalWaktu(r.created_at)} &middot; <span style={{ color: D.text }}>{r.admin_nama || 'Admin'}</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: D.text, marginTop: '2px' }}>{r.perubahan}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: `1px solid ${D.fieldBorder}`, display: 'flex', gap: '14px', flexWrap: 'wrap', fontSize: '0.72rem', color: D.textFaint }}>
              <span>Keterangan Status:</span>
              {STATUS_OPTIONS.map((s) => (
                <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: STATUS_META[s].dot, display: 'inline-block' }} />
                  {s}
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PricelistDetail;
