import React from 'react';
import { C } from '../constants';
import { getModalOverlayStyle, getModalContentStyle, getButtonBatal, getButtonKirim } from '../utils/styles';

export const KirimMateriModal = ({ show, isMobile, materiArsip, materiRequestHook, onClose, onSubmit }) => {
  if (!show) return null;
  const { kirimMateriMode, setKirimMateriMode, selectedMateriId, setSelectedMateriId, kirimBaruForm, setKirimBaruForm, kirimMateriNote, setKirimMateriNote, kirimMateriSubmitting } =
    materiRequestHook;
  const buttonBatal = getButtonBatal(isMobile);
  const buttonKirim = getButtonKirim(isMobile);

  return (
    <div style={getModalOverlayStyle(isMobile)}>
      <div style={getModalContentStyle(isMobile)}>
        <h3 style={{ margin: '0 0 0.75rem 0', color: C.dark, fontSize: isMobile ? '1.2rem' : '1.17rem' }}>Kirim Materi</h3>

        <div style={{ display: 'flex', gap: '6px', background: C.cream, padding: '4px', borderRadius: '10px', marginBottom: '0.75rem' }}>
          {[
            { v: 'arsip', l: 'Pilih dari Arsip' },
            { v: 'baru', l: 'Upload Materi Baru' },
          ].map((opt) => (
            <button
              key={opt.v}
              type="button"
              onClick={() => setKirimMateriMode(opt.v)}
              style={{
                flex: 1,
                padding: '8px 10px',
                borderRadius: '7px',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: isMobile ? '0.85rem' : '0.82rem',
                fontWeight: kirimMateriMode === opt.v ? 'bold' : 'normal',
                background: kirimMateriMode === opt.v ? C.white : 'transparent',
                color: kirimMateriMode === opt.v ? C.dark : C.gray,
              }}
            >
              {opt.l}
            </button>
          ))}
        </div>

        {kirimMateriMode === 'arsip' ? (
          <>
            <p style={{ fontSize: '0.85rem', color: C.gray, margin: '0 0 0.5rem 0' }}>Pilih materi yang sudah pernah Anda unggah untuk dikirim ke siswa.</p>
            <label style={{ fontSize: isMobile ? '0.95rem' : '0.85rem', color: C.gray }}>Pilih Materi</label>
            <select
              value={selectedMateriId}
              onChange={(e) => setSelectedMateriId(e.target.value)}
              style={{ padding: isMobile ? '12px' : '8px', borderRadius: '8px', border: `1px solid ${C.border}`, fontSize: isMobile ? '16px' : '0.9rem' }}
            >
              <option value="">-- Pilih Materi --</option>
              {materiArsip.length === 0 && (
                <option value="" disabled>
                  Belum ada materi di arsip.
                </option>
              )}
              {materiArsip.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nama}
                  {m.mapel ? ` - ${m.mapel}` : ''}
                  {m.bab ? ` (${m.bab})` : ''}
                </option>
              ))}
            </select>
          </>
        ) : (
          <>
            <p style={{ fontSize: '0.85rem', color: C.gray, margin: '0 0 0.5rem 0' }}>
              File/link ini akan otomatis tersimpan juga di Arsip Materi (kategori "Dari Request").
            </p>
            <label style={{ fontSize: isMobile ? '0.95rem' : '0.85rem', color: C.gray }}>Judul Materi</label>
            <input
              type="text"
              value={kirimBaruForm.judul}
              onChange={(e) => setKirimBaruForm({ ...kirimBaruForm, judul: e.target.value })}
              style={{ padding: isMobile ? '12px' : '8px', borderRadius: '8px', border: `1px solid ${C.border}`, fontSize: isMobile ? '16px' : '0.9rem' }}
            />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: isMobile ? '0.95rem' : '0.85rem', color: C.gray }}>Mapel (opsional)</label>
                <input
                  type="text"
                  value={kirimBaruForm.mapel}
                  onChange={(e) => setKirimBaruForm({ ...kirimBaruForm, mapel: e.target.value })}
                  style={{ width: '100%', padding: isMobile ? '12px' : '8px', borderRadius: '8px', border: `1px solid ${C.border}`, fontSize: isMobile ? '16px' : '0.9rem', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: isMobile ? '0.95rem' : '0.85rem', color: C.gray }}>Bab (opsional)</label>
                <input
                  type="text"
                  value={kirimBaruForm.bab}
                  onChange={(e) => setKirimBaruForm({ ...kirimBaruForm, bab: e.target.value })}
                  style={{ width: '100%', padding: isMobile ? '12px' : '8px', borderRadius: '8px', border: `1px solid ${C.border}`, fontSize: isMobile ? '16px' : '0.9rem', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '6px', background: C.cream, padding: '4px', borderRadius: '10px', marginTop: '0.4rem' }}>
              {[
                { v: 'File', l: '📁 Unggah File' },
                { v: 'Link', l: '🔗 Tautan (Link)' },
              ].map((opt) => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setKirimBaruForm({ ...kirimBaruForm, bentuk: opt.v })}
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    borderRadius: '7px',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontSize: isMobile ? '0.85rem' : '0.82rem',
                    fontWeight: kirimBaruForm.bentuk === opt.v ? 'bold' : 'normal',
                    background: kirimBaruForm.bentuk === opt.v ? C.white : 'transparent',
                    color: kirimBaruForm.bentuk === opt.v ? C.dark : C.gray,
                  }}
                >
                  {opt.l}
                </button>
              ))}
            </div>

            {kirimBaruForm.bentuk === 'File' ? (
              <input
                type="file"
                onChange={(e) => setKirimBaruForm({ ...kirimBaruForm, file: e.target.files?.[0] || null })}
                style={{ fontSize: isMobile ? '0.9rem' : '0.85rem' }}
              />
            ) : (
              <input
                type="url"
                placeholder="https://..."
                value={kirimBaruForm.link}
                onChange={(e) => setKirimBaruForm({ ...kirimBaruForm, link: e.target.value })}
                style={{ padding: isMobile ? '12px' : '8px', borderRadius: '8px', border: `1px solid ${C.border}`, fontSize: isMobile ? '16px' : '0.9rem' }}
              />
            )}
          </>
        )}

        <label style={{ fontSize: isMobile ? '0.95rem' : '0.85rem', color: C.gray, marginTop: '0.5rem' }}>Catatan (opsional)</label>
        <textarea
          value={kirimMateriNote}
          onChange={(e) => setKirimMateriNote(e.target.value)}
          rows={2}
          placeholder="Tambahkan catatan untuk siswa"
          style={{ padding: '8px', borderRadius: '8px', border: `1px solid ${C.border}`, resize: 'vertical', fontFamily: 'inherit', fontSize: isMobile ? '16px' : '0.85rem' }}
        />
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={buttonBatal} disabled={kirimMateriSubmitting}>
            Batal
          </button>
          <button onClick={onSubmit} disabled={kirimMateriSubmitting} style={{ ...buttonKirim, background: C.green, opacity: kirimMateriSubmitting ? 0.6 : 1 }}>
            {kirimMateriSubmitting ? 'Mengirim...' : 'Kirim'}
          </button>
        </div>
      </div>
    </div>
  );
};
