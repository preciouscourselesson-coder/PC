import React from 'react';
import { C } from '../../../shared/Theme';

export const DeleteFolderModal = ({ target, isMobile, onConfirm, onCancel }) => (
  <div style={{
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex',
    alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', zIndex: 200,
  }}>
    <div style={{
      background: C.white, padding: isMobile ? '1.3rem' : '1.6rem',
      width: isMobile ? '100%' : '340px', maxWidth: isMobile ? '100%' : '90vw',
      borderRadius: isMobile ? '18px 18px 0 0' : '16px', boxSizing: 'border-box',
    }}>
      <div style={{ fontWeight: 'bold', fontSize: '1.05rem', marginBottom: '8px', color: C.dark }}>Hapus Folder?</div>
      <div style={{ color: C.gray, fontSize: '0.88rem', marginBottom: '10px' }}>
        Folder "{target?.nama}" akan dihapus. Materi di dalamnya akan pindah ke "Tanpa Folder", bukan ikut terhapus.
      </div>
      {target?.siswa_id && (
        <div style={{ color: C.gold, fontSize: '0.78rem', marginBottom: '10px', background: C.goldBg, padding: '8px 10px', borderRadius: '8px' }}>
          ⚠️ Folder ini terhubung otomatis ke seorang siswa. Selama siswa tsb masih ada di daftar siswa Anda, folder ini akan otomatis dibuat lagi.
        </div>
      )}
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <button onClick={onCancel} style={{ padding: '9px 16px', borderRadius: '9px', border: `1.5px solid ${C.border}`, background: 'none', cursor: 'pointer', fontFamily: 'inherit', flex: isMobile ? 1 : 'initial' }}>Batal</button>
        <button onClick={onConfirm} style={{ padding: '9px 16px', borderRadius: '9px', border: 'none', background: C.red, color: C.white, fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit', flex: isMobile ? 1 : 'initial' }}>Hapus</button>
      </div>
    </div>
  </div>
);
