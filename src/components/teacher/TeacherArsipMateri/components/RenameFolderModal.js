import React, { useState } from 'react';
import { C } from '../../../shared/Theme';

// Modal ganti nama folder — dipakai baik untuk folder manual maupun folder
// otomatis milik siswa (folder otomatis tetap boleh diganti nama karena
// keterkaitannya ke siswa disimpan lewat siswa_id, bukan lewat nama).
export const RenameFolderModal = ({ target, isMobile, saving, onSave, onClose }) => {
  const [nama, setNama] = useState(target?.nama || '');
  const [error, setError] = useState('');

  const submit = async () => {
    if (!nama.trim()) { setError('Nama folder wajib diisi.'); return; }
    setError('');
    try {
      await onSave(nama.trim());
    } catch (err) {
      setError(err.message || 'Gagal mengubah nama folder.');
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex',
      alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', zIndex: 200, padding: '1rem',
    }}>
      <div style={{
        background: C.white, padding: isMobile ? '1.3rem' : '1.4rem', width: isMobile ? '100%' : '320px',
        maxWidth: isMobile ? '100%' : '90vw', borderRadius: isMobile ? '18px 18px 0 0' : '16px', boxSizing: 'border-box',
      }}>
        <div style={{ fontWeight: 'bold', fontSize: '1.05rem', marginBottom: '4px', color: C.dark }}>Ganti Nama Folder</div>
        {target?.siswa_id && (
          <div style={{ fontSize: '0.76rem', color: C.gray, marginBottom: '10px' }}>
            📌 Folder ini tetap terhubung ke siswa yang sama walau namanya diganti.
          </div>
        )}
        <input
          autoFocus
          value={nama}
          onChange={e => setNama(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: `1.5px solid ${C.border}`, boxSizing: 'border-box', fontFamily: 'inherit', fontSize: '16px', marginTop: '6px' }}
        />
        {error && <div style={{ color: C.red, fontSize: '0.78rem', marginTop: '6px' }}>{error}</div>}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button onClick={onClose} style={{ padding: '9px 16px', borderRadius: '9px', border: `1.5px solid ${C.border}`, background: 'none', cursor: 'pointer', fontFamily: 'inherit', flex: isMobile ? 1 : 'initial' }}>
            Batal
          </button>
          <button
            onClick={submit}
            disabled={saving}
            style={{ padding: '9px 16px', borderRadius: '9px', border: 'none', background: C.gold, color: C.white, fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit', flex: isMobile ? 1 : 'initial' }}
          >
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  );
};
