import React from 'react';
import { C } from '../theme';

export const DeleteConfirmModal = ({ deleteItem, setDeleteItem, deleteItemLabel, onConfirm }) => {
  if (!deleteItem) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(23,20,17,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '1rem' }}>
      <div style={{ background: C.white, borderRadius: '16px', padding: '1.6rem', width: '340px', maxWidth: '100%' }}>
        <div style={{ fontWeight: 'bold', fontSize: '1.05rem', color: C.dark, marginBottom: '8px' }}>Hapus Data?</div>
        <div style={{ color: C.gray, fontSize: '0.88rem', marginBottom: '18px' }}>
          "{deleteItemLabel}" akan dihapus permanen dari seluruh sistem dan tidak bisa dikembalikan.
        </div>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button onClick={() => setDeleteItem(null)} style={{ padding: '9px 16px', borderRadius: '9px', border: `1.5px solid ${C.border}`, background: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Batal</button>
          <button onClick={onConfirm} style={{ padding: '9px 16px', borderRadius: '9px', border: 'none', background: C.danger, color: C.white, fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit' }}>Hapus</button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;
