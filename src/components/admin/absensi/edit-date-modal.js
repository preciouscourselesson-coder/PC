// src/components/admin/adminAbsensi/edit-date-modal.js
import React from 'react';
import { C } from '../../shared/Theme';

const EditDateModal = ({ show, value, onChange, onCancel, onSave, saving }) => {
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
        <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', color: C.dark }}>Edit Tanggal Pertemuan</h3>
        <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: C.gray }}>
          Ubah tanggal pertemuan menjadi:
        </p>
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: '100%', padding: '10px 12px', borderRadius: '10px',
            border: `1.5px solid ${C.border}`, fontSize: '0.9rem',
            marginBottom: '1.5rem', fontFamily: 'inherit',
          }}
        />
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
            onClick={onSave}
            disabled={saving}
            style={{
              padding: '8px 20px', borderRadius: '8px', border: 'none',
              background: C.gold, color: C.white, fontWeight: 'bold',
              cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1,
              fontFamily: 'inherit', fontSize: '0.85rem',
            }}
          >
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditDateModal;
