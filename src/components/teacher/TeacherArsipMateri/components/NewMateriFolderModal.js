import React, { useState } from 'react';
import { C } from '../../../shared/Theme';
import { KATEGORI_LABEL, resolveKategoriForFolder } from '../constants';

// Modal untuk membuat folder baru dari grid folder (kategori mengikuti tab Pribadi/Sekolah yang aktif)
export const NewMateriFolderModal = ({ kategori, creating, onCreate, onClose }) => {
  const [nama, setNama] = useState('');
  const [error, setError] = useState('');

  const submit = async () => {
    if (!nama.trim()) { setError('Nama folder wajib diisi.'); return; }
    setError('');
    try {
      await onCreate(nama.trim());
    } catch (err) {
      setError(err.message || 'Gagal membuat folder.');
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '1rem',
    }}>
      <div style={{ background: C.white, padding: '1.4rem', width: '320px', maxWidth: '100%', borderRadius: '16px', boxSizing: 'border-box' }}>
        <div style={{ fontWeight: 'bold', fontSize: '1.05rem', marginBottom: '4px', color: C.dark }}>Folder Baru</div>
        <div style={{ fontSize: '0.78rem', color: C.gray, marginBottom: '12px' }}>
          Folder akan dibuat untuk kategori "{KATEGORI_LABEL[resolveKategoriForFolder(kategori)] || 'Pribadi'}".
        </div>
        <input
          autoFocus
          value={nama}
          onChange={e => setNama(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="Contoh: Bab 1 - Aljabar"
          style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: `1.5px solid ${C.border}`, boxSizing: 'border-box', fontFamily: 'inherit', fontSize: '16px' }}
        />
        {error && <div style={{ color: C.red, fontSize: '0.78rem', marginTop: '6px' }}>{error}</div>}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button onClick={onClose} style={{ padding: '9px 16px', borderRadius: '9px', border: `1.5px solid ${C.border}`, background: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
            Batal
          </button>
          <button
            onClick={submit}
            disabled={creating}
            style={{ padding: '9px 16px', borderRadius: '9px', border: 'none', background: C.gold, color: C.white, fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            {creating ? 'Membuat...' : 'Buat Folder'}
          </button>
        </div>
      </div>
    </div>
  );
};
