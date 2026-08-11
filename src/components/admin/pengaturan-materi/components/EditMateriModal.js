import React from 'react';
import { C } from '../theme';

export const EditMateriModal = ({ editItem, setEditItem, editBabOptions, savingEdit, onSave }) => {
  if (!editItem) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(23,20,17,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '1rem' }}>
      <div style={{ background: C.white, borderRadius: '16px', padding: '1.6rem', width: '380px', maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ fontWeight: 'bold', fontSize: '1.05rem', color: C.dark, marginBottom: '12px' }}>Edit Materi</div>

        <label style={{ fontSize: '0.8rem', color: C.gray }}>Judul Materi</label>
        <input
          value={editItem.nama || ''}
          onChange={e => setEditItem({ ...editItem, nama: e.target.value })}
          style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: `1.5px solid ${C.border}`, marginTop: '4px', marginBottom: '10px', boxSizing: 'border-box', fontFamily: 'inherit' }}
        />

        <label style={{ fontSize: '0.8rem', color: C.gray }}>Deskripsi</label>
        <textarea
          value={editItem.deskripsi || ''}
          onChange={e => setEditItem({ ...editItem, deskripsi: e.target.value })}
          rows={2}
          style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: `1.5px solid ${C.border}`, marginTop: '4px', marginBottom: '10px', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' }}
        />

        <label style={{ fontSize: '0.8rem', color: C.gray }}>Kelas</label>
        <input
          value={editItem.kelas || ''}
          onChange={e => setEditItem({ ...editItem, kelas: e.target.value })}
          style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: `1.5px solid ${C.border}`, marginTop: '4px', marginBottom: '10px', boxSizing: 'border-box', fontFamily: 'inherit' }}
        />

        <label style={{ fontSize: '0.8rem', color: C.gray }}>Bab / Topik</label>
        <select
          value={editItem.bab_id || ''}
          onChange={e => setEditItem({ ...editItem, bab_id: e.target.value ? Number(e.target.value) : '' })}
          style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: `1.5px solid ${C.border}`, marginTop: '4px', marginBottom: '10px', fontFamily: 'inherit' }}
        >
          <option value="">Pilih bab...</option>
          {editBabOptions.map(b => <option key={b.id} value={b.id}>{b.materi_mapel?.nama || '-'} — {b.nama}</option>)}
        </select>

        <label style={{ fontSize: '0.8rem', color: C.gray }}>Status</label>
        <select
          value={editItem.status}
          onChange={e => setEditItem({ ...editItem, status: e.target.value })}
          style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: `1.5px solid ${C.border}`, marginTop: '4px', marginBottom: '16px', fontFamily: 'inherit' }}
        >
          <option value="Dipublish">Aktif</option>
          <option value="Draft">Draft</option>
          <option value="Diarsipkan">Diarsipkan</option>
        </select>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button onClick={() => setEditItem(null)} style={{ padding: '9px 16px', borderRadius: '9px', border: `1.5px solid ${C.border}`, background: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Batal</button>
          <button onClick={onSave} disabled={savingEdit} style={{ padding: '9px 16px', borderRadius: '9px', border: 'none', background: C.gold, color: C.white, fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit' }}>
            {savingEdit ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditMateriModal;
