import React from 'react';
import { C } from '../constants';
import { waktuLalu } from '../utils/format';
import { getCardStyle, getButtonSecondary, getButtonBatal, getButtonKirim } from '../utils/styles';

export const MateriRequestSection = ({ isMobile, materiRequestList, loading, materiRequestHook }) => {
  const buttonSecondary = getButtonSecondary(isMobile);
  const buttonBatal = getButtonBatal(isMobile);
  const buttonKirim = getButtonKirim(isMobile);
  const pendingList = materiRequestList.filter((m) => m.status !== 'selesai');

  return (
    <div style={getCardStyle(isMobile)}>
      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'flex-start' : 'center',
          gap: isMobile ? '0.5rem' : 0,
          marginBottom: '1rem',
        }}
      >
        <h3 style={{ margin: 0, color: C.dark, fontSize: isMobile ? '1rem' : '1.17rem' }}>
          Materi Request ({materiRequestList.filter((m) => m.status !== 'selesai' && m.status !== 'ditolak').length})
        </h3>
        <span style={{ fontSize: isMobile ? '0.78rem' : '0.8rem', color: C.gray }}>
          Untuk mengunggah materi baru (bukan menjawab request), buka menu <strong>Arsip Materi</strong>.
        </span>
      </div>
      {loading ? (
        <p style={{ fontSize: '0.85rem', color: C.gray }}>Memuat...</p>
      ) : pendingList.length === 0 ? (
        <p style={{ fontSize: '0.85rem', color: C.gray }}>Belum ada permintaan materi dari siswa.</p>
      ) : (
        pendingList.map((item, idx, arr) => (
          <div key={item.id} style={{ padding: '0.75rem 0', borderBottom: idx < arr.length - 1 ? `1px solid ${C.border}` : 'none' }}>
            <div
              style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: isMobile ? '0.6rem' : 0,
              }}
            >
              <div>
                <div style={{ fontWeight: '600', color: C.dark, fontSize: isMobile ? '1rem' : '0.9rem' }}>{item.judul_materi}</div>
                <div style={{ fontSize: '0.85rem', color: C.gray }}>
                  {item.siswa_nama || 'Siswa'}
                  {item.kelas ? ` - ${item.kelas}` : ''}
                </div>
                {item.deskripsi && <div style={{ fontSize: '0.78rem', color: C.gray, fontStyle: 'italic' }}>{item.deskripsi}</div>}
                <div style={{ fontSize: '0.75rem', color: C.gray }}>{waktuLalu(item.created_at)}</div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                {item.status === 'selesai' ? (
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '2px 8px', borderRadius: '999px', background: C.greenBg, color: C.green, whiteSpace: 'nowrap' }}>
                    Selesai
                  </span>
                ) : item.status === 'ditolak' ? (
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '2px 8px', borderRadius: '999px', background: C.redBg, color: C.red, whiteSpace: 'nowrap' }}>
                    Ditolak
                  </span>
                ) : (
                  <>
                    <button style={{ ...buttonSecondary, background: C.gold, color: C.white, border: 'none' }} onClick={() => materiRequestHook.openKirimMateri(item.id)}>
                      Kirim Materi
                    </button>
                    <button style={{ ...buttonSecondary, color: C.green }} onClick={() => materiRequestHook.openMateriRespond(item.id, 'selesai')}>
                      Tandai Selesai
                    </button>
                    <button style={{ ...buttonSecondary, color: C.red }} onClick={() => materiRequestHook.openMateriRespond(item.id, 'ditolak')}>
                      Tolak
                    </button>
                  </>
                )}
              </div>
            </div>

            {item.catatan_guru && (item.status === 'selesai' || item.status === 'ditolak') && (
              <div style={{ marginTop: '0.4rem', fontSize: '0.78rem', color: C.gray, background: C.cream, borderRadius: '8px', padding: '0.5rem 0.7rem' }}>
                💬 {item.catatan_guru}
              </div>
            )}

            {materiRequestHook.materiRespondId === item.id && (
              <div style={{ marginTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.78rem', color: C.gray }}>
                  {materiRequestHook.materiRespondAksi === 'selesai' ? 'Catatan (opsional)' : 'Alasan penolakan'}
                </label>
                <textarea
                  value={materiRequestHook.materiCatatan}
                  onChange={(e) => materiRequestHook.setMateriCatatan(e.target.value)}
                  rows={2}
                  placeholder={
                    materiRequestHook.materiRespondAksi === 'selesai' ? 'Contoh: Materi sudah diunggah di bab terkait.' : 'Contoh: Materi ini belum sesuai kurikulum saat ini.'
                  }
                  style={{ padding: '8px', borderRadius: '8px', border: `1px solid ${C.border}`, fontSize: isMobile ? '16px' : '0.85rem', resize: 'vertical', fontFamily: 'inherit' }}
                />
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <button onClick={materiRequestHook.cancelMateriRespond} style={buttonBatal} disabled={materiRequestHook.materiResponding}>
                    Batal
                  </button>
                  <button
                    onClick={materiRequestHook.submitMateriRespond}
                    disabled={materiRequestHook.materiResponding || (materiRequestHook.materiRespondAksi === 'ditolak' && !materiRequestHook.materiCatatan.trim())}
                    style={{
                      ...buttonKirim,
                      background: materiRequestHook.materiRespondAksi === 'ditolak' ? C.red : C.green,
                      opacity: materiRequestHook.materiResponding || (materiRequestHook.materiRespondAksi === 'ditolak' && !materiRequestHook.materiCatatan.trim()) ? 0.6 : 1,
                    }}
                  >
                    {materiRequestHook.materiResponding
                      ? 'Menyimpan...'
                      : materiRequestHook.materiRespondAksi === 'selesai'
                      ? 'Simpan'
                      : 'Tolak Permintaan'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};
