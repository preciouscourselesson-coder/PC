// src/components/admin/adminAbsensi/delete-confirm-modal.js
import React from 'react';
import { C } from '../../Theme';

const DeleteConfirmModal = ({ show, onCancel, onConfirm, deleting }) => {
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
          maxWidth: '400px', width: '100%', boxShadow: '0 12px 32px rgba(0,0,0,0.2)',
        }}
      >
        <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', color: C.dark }}>Hapus Pertemuan</h3>
        <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: C.gray }}>
          Yakin ingin menghapus pertemuan ini? Tindakan ini tidak dapat dibatalkan.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 16px', borderRadius: '8px', border: `1.5px solid ${C.border}`,
              background: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.85rem', color: C.gray,
            }}
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            style={{
              padding: '8px 20px', borderRadius: '8px', border: 'none',
              background: C.red, color: C.white, fontWeight: 'bold',
              cursor: deleting ? 'default' : 'pointer', opacity: deleting ? 0.6 : 1,
              fontFamily: 'inherit', fontSize: '0.85rem',
            }}
          >
            {deleting ? 'Menghapus...' : 'Ya, Hapus'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;
