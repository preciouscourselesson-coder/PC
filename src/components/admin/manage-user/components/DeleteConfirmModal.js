// Modal konfirmasi sebelum menghapus data profil user.
import React from 'react';
import { C } from '../constants';

const DeleteConfirmModal = ({ target, onCancel, onConfirm }) => {
  if (!target) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(23,20,17,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
      padding: '1rem',
    }}>
      <div style={{
        background: C.white, borderRadius: '18px', padding: '1.75rem', maxWidth: '400px',
        width: '100%', boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
      }}>
        <h3 style={{ margin: '0 0 10px', fontSize: '1.1rem', color: C.dark, fontWeight: 'bold' }}>
          Hapus data user ini?
        </h3>
        <p style={{ margin: '0 0 8px', fontSize: '0.88rem', color: C.gray, lineHeight: 1.6 }}>
          Data profil <strong>{target.full_name || target.email}</strong> akan dihapus secara permanen.
        </p>
        <p style={{ margin: '0 0 20px', fontSize: '0.8rem', color: C.warn, background: C.warnBg, padding: '10px 12px', borderRadius: '10px', lineHeight: 1.5 }}>
          ⚠️ Ini hanya menghapus data profil. Akun login user ini tidak otomatis terhapus dari sistem autentikasi dan perlu dihapus terpisah oleh admin lewat Supabase Dashboard bila diperlukan.
        </p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '9px 18px', borderRadius: '10px', border: `1.5px solid ${C.border}`,
              background: C.white, color: C.gray, fontSize: '0.85rem', fontWeight: 'bold',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Batal
          </button>
          <button
            onClick={() => onConfirm(target.id, target.full_name || target.email)}
            style={{
              padding: '9px 18px', borderRadius: '10px', border: 'none',
              background: C.danger, color: C.white, fontSize: '0.85rem', fontWeight: 'bold',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Hapus
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;
