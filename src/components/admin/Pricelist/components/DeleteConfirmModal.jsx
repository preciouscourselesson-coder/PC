import React from 'react';
import { D } from '../constants';

const DeleteConfirmModal = ({ deleteTarget, deleting, onCancel, onConfirm }) => {
  if (!deleteTarget) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,12,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
      <div style={{ background: D.bg, borderRadius: '14px', padding: '1.5rem', maxWidth: '380px', width: '100%', boxShadow: '0 20px 50px rgba(0,0,0,0.4)' }}>
        <div style={{ color: D.text, fontSize: '1rem', fontWeight: 700, marginBottom: '8px' }}>Hapus pricelist ini?</div>
        <div style={{ color: D.textMuted, fontSize: '0.85rem', marginBottom: '1.25rem' }}>
          <strong style={{ color: D.text }}>{deleteTarget.program}</strong> ({deleteTarget.kelas}) akan dihapus permanen beserta riwayat perubahannya. Tindakan ini tidak bisa dibatalkan.
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            onClick={onCancel}
            disabled={deleting}
            style={{ background: 'none', border: `1.5px solid ${D.fieldBorder}`, padding: '9px 18px', borderRadius: '10px', cursor: 'pointer', color: D.textMuted, fontWeight: 500 }}
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            style={{ background: D.danger, border: 'none', padding: '9px 18px', borderRadius: '10px', cursor: deleting ? 'default' : 'pointer', color: '#fff', fontWeight: 700, opacity: deleting ? 0.7 : 1 }}
          >
            {deleting ? 'Menghapus...' : 'Ya, Hapus'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;
