import React from 'react';
import { C, MATERI_FILE_ACCEPT } from '../constants';
import { formatFileSize } from '../utils/format';
import { buttonKirim } from '../utils/styles';

export const MateriRequestForm = ({
  isMobile,
  guruOptions,
  materiForm,
  setMateriForm,
  materiFile,
  submittingMateri,
  onFileChange,
  onRemoveFile,
  onSubmit,
}) => {
  const fieldStyle = { padding: '8px 10px', borderRadius: '8px', border: `1px solid ${C.border}`, background: C.white, fontSize: isMobile ? '16px' : '0.85rem', width: '100%', boxSizing: 'border-box' };

  return (
    <div style={{ background: C.cream, borderRadius: '12px', padding: '1rem' }}>
      <h4 style={{ margin: '0 0 0.5rem 0', color: C.dark }}>Minta Materi</h4>
      <p style={{ fontSize: '0.8rem', color: C.gray, marginBottom: '0.75rem' }}>Ajukan permintaan materi yang ingin dipelajari.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: C.dark }}>Kirim ke Guru</label>
        <select value={materiForm.guruId} onChange={(e) => setMateriForm({ ...materiForm, guruId: e.target.value })} style={fieldStyle}>
          <option value="">-- Pilih Guru --</option>
          {guruOptions.map((g) => (
            <option key={g.id} value={g.id}>
              {g.nama}
            </option>
          ))}
        </select>

        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: C.dark }}>Judul Materi</label>
        <input
          type="text"
          placeholder="Contoh: Integral Tak Tentu"
          value={materiForm.judul}
          onChange={(e) => setMateriForm({ ...materiForm, judul: e.target.value })}
          style={fieldStyle}
        />

        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: C.dark }}>Deskripsi (opsional)</label>
        <textarea
          placeholder="Jelaskan kesulitan atau poin yang ingin dipelajari..."
          value={materiForm.deskripsi}
          onChange={(e) => setMateriForm({ ...materiForm, deskripsi: e.target.value })}
          rows={2}
          style={{ ...fieldStyle, resize: 'vertical', fontFamily: 'inherit' }}
        />

        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: C.dark }}>Lampiran File (opsional)</label>
        {!materiFile ? (
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '10px',
              borderRadius: '8px',
              border: `1.5px dashed ${C.border}`,
              background: C.white,
              fontSize: isMobile ? '0.85rem' : '0.8rem',
              color: C.gray,
              cursor: 'pointer',
              textAlign: 'center',
              width: '100%',
              boxSizing: 'border-box',
            }}
          >
            📎 Pilih File (maks. 10MB)
            <input type="file" accept={MATERI_FILE_ACCEPT} onChange={onFileChange} style={{ display: 'none' }} />
          </label>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '8px 10px', borderRadius: '8px', border: `1px solid ${C.border}`, background: C.white }}>
            <span style={{ fontSize: '0.78rem', color: C.dark, wordBreak: 'break-word' }}>
              📄 {materiFile.name} <span style={{ color: C.grayLight }}>({formatFileSize(materiFile.size)})</span>
            </span>
            <button type="button" onClick={onRemoveFile} style={{ background: 'none', border: 'none', color: C.red, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
              Hapus
            </button>
          </div>
        )}

        <button onClick={onSubmit} disabled={submittingMateri} style={{ ...buttonKirim, width: '100%', marginTop: '0.5rem', opacity: submittingMateri ? 0.6 : 1 }}>
          {submittingMateri ? 'Mengirim...' : 'Kirim'}
        </button>
      </div>
    </div>
  );
};
