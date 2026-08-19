import React from 'react';
import { C } from '../../../shared/Theme';
import { TABS, JENIS_OPTIONS, JENIS_LABEL, KELAS_GROUPS, MAPEL_OPTIONS, KATEGORI_STYLE, KATEGORI_LABEL } from '../constants';
import { Badge } from './Badge';

export const EditMateriModal = ({ editItem, setEditItem, folderOptions, isMobile, savingEdit, onSave, onClose }) => (
  <div style={{
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex',
    alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', zIndex: 200,
  }}>
    <div style={{
      background: C.white, padding: isMobile ? '1.3rem' : '1.6rem',
      width: isMobile ? '100%' : '360px', maxWidth: isMobile ? '100%' : '90vw',
      borderRadius: isMobile ? '18px 18px 0 0' : '16px',
      maxHeight: '88vh', overflowY: 'auto', boxSizing: 'border-box',
    }}>
      <div style={{ fontWeight: 'bold', fontSize: '1.05rem', marginBottom: '1rem', color: C.dark }}>Edit Materi</div>

      <label style={{ fontSize: '0.8rem', color: C.gray }}>Kategori</label>
      <div style={{ marginBottom: '10px' }}>
        <Badge label={KATEGORI_LABEL[editItem.kategori] || 'Pribadi'} style={KATEGORI_STYLE[editItem.kategori] || KATEGORI_STYLE.Pribadi} />
      </div>

      <label style={{ fontSize: '0.8rem', color: C.gray }}>Folder</label>
      <select
        value={editItem.folder_id || ''}
        onChange={e => setEditItem({ ...editItem, folder_id: e.target.value || null })}
        style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: `1.5px solid ${C.border}`, marginBottom: '10px', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: '16px' }}
      >
        <option value="">Tanpa folder (Umum)</option>
        {folderOptions.filter(f => f.kategori === editItem.kategori).map(f => (
          <option key={f.id} value={f.id}>{f.siswa_id ? '🎓 ' : ''}{f.nama}</option>
        ))}
      </select>

      {editItem.kategori === 'Sekolah' && (
        <>
          <label style={{ fontSize: '0.8rem', color: C.gray }}>Pengajar Materi Ini</label>
          <input
            value={editItem.pengajar || ''}
            onChange={e => setEditItem({ ...editItem, pengajar: e.target.value })}
            style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: `1.5px solid ${C.border}`, marginBottom: '10px', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: '16px' }}
          />

          <label style={{ fontSize: '0.8rem', color: C.gray }}>Jenis</label>
          <select
            value={editItem.jenis || 'Materi'}
            onChange={e => setEditItem({ ...editItem, jenis: e.target.value })}
            style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: `1.5px solid ${C.border}`, marginBottom: '10px', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: '16px' }}
          >
            {JENIS_OPTIONS.map(j => <option key={j} value={j}>{JENIS_LABEL[j] || j}</option>)}
          </select>
        </>
      )}

      <label style={{ fontSize: '0.8rem', color: C.gray }}>Judul Materi</label>
      <input
        value={editItem.nama || ''}
        onChange={e => setEditItem({ ...editItem, nama: e.target.value })}
        style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: `1.5px solid ${C.border}`, marginBottom: '10px', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: '16px' }}
      />

      <label style={{ fontSize: '0.8rem', color: C.gray }}>Deskripsi</label>
      <textarea
        value={editItem.deskripsi || ''}
        onChange={e => setEditItem({ ...editItem, deskripsi: e.target.value })}
        rows={2}
        style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: `1.5px solid ${C.border}`, marginBottom: '10px', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: '16px', resize: 'vertical' }}
      />

      <label style={{ fontSize: '0.8rem', color: C.gray }}>Kelas</label>
      <select
        value={editItem.kelas || ''}
        onChange={e => setEditItem({ ...editItem, kelas: e.target.value })}
        style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: `1.5px solid ${C.border}`, marginBottom: '10px', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: '16px' }}
      >
        <option value="">Pilih kelas...</option>
        {KELAS_GROUPS.map(group => (
          <optgroup key={group.label} label={group.label}>
            {group.options.map(k => <option key={k} value={k}>{k}</option>)}
          </optgroup>
        ))}
      </select>

      <label style={{ fontSize: '0.8rem', color: C.gray }}>Mapel</label>
      <select
        value={editItem.mapel || ''}
        onChange={e => setEditItem({ ...editItem, mapel: e.target.value })}
        style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: `1.5px solid ${C.border}`, marginBottom: '10px', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: '16px' }}
      >
        <option value="">Pilih mapel...</option>
        {MAPEL_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
      </select>

      <label style={{ fontSize: '0.8rem', color: C.gray }}>Bab / Topik</label>
      <input
        value={editItem.bab || ''}
        onChange={e => setEditItem({ ...editItem, bab: e.target.value })}
        style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: `1.5px solid ${C.border}`, marginBottom: '10px', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: '16px' }}
      />

      <label style={{ fontSize: '0.8rem', color: C.gray }}>Sub Bab (opsional)</label>
      <input
        value={editItem.sub_bab || ''}
        onChange={e => setEditItem({ ...editItem, sub_bab: e.target.value })}
        style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: `1.5px solid ${C.border}`, marginBottom: '10px', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: '16px' }}
      />

      <label style={{ fontSize: '0.8rem', color: C.gray }}>Status</label>
      <select
        value={editItem.status}
        onChange={e => setEditItem({ ...editItem, status: e.target.value })}
        style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: `1.5px solid ${C.border}`, marginBottom: '16px', fontFamily: 'inherit', fontSize: '16px', boxSizing: 'border-box' }}
      >
        {TABS.map(t => <option key={t} value={t}>{t}</option>)}
      </select>

      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={{ padding: '9px 16px', borderRadius: '9px', border: `1.5px solid ${C.border}`, background: 'none', cursor: 'pointer', fontFamily: 'inherit', flex: isMobile ? 1 : 'initial' }}>Batal</button>
        <button
          onClick={onSave}
          disabled={savingEdit}
          style={{ padding: '9px 16px', borderRadius: '9px', border: 'none', background: C.gold, color: C.white, fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit', flex: isMobile ? 1 : 'initial' }}
        >
          {savingEdit ? 'Menyimpan...' : 'Simpan'}
        </button>
      </div>
    </div>
  </div>
);