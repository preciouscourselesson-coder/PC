// src/components/admin/adminAbsensi/row-actions-menu.js
import React from 'react';
import { C } from '../../shared/Theme';

// Kolom "Aksi" pada tabel desktop untuk satu baris entri.
// - Jika status 'Menunggu': tampil tombol Setujui/Tolak/Hapus langsung.
// - Selain itu: tombol ⋮ yang membuka dropdown (Set ke Menunggu, Edit Tanggal, Hapus).
const RowActionsMenu = ({
  item,
  updatingId,
  isMenuOpen,
  onToggleMenu,
  onUpdateStatus,
  onOpenEditDate,
  onOpenDelete,
}) => (
  <div style={{ position: 'relative' }}>
    {item.status === 'Menunggu' ? (
      <div style={{ display: 'flex', gap: '6px' }}>
        <button
          disabled={updatingId === item.id}
          onClick={() => onUpdateStatus(item.id, 'Disetujui')}
          title="Setujui"
          style={{ width: '28px', height: '28px', borderRadius: '7px', border: 'none', background: C.greenBg, color: C.green, cursor: 'pointer', fontWeight: 700 }}
        >
          ✓
        </button>
        <button
          disabled={updatingId === item.id}
          onClick={() => onUpdateStatus(item.id, 'Ditolak')}
          title="Tolak"
          style={{ width: '28px', height: '28px', borderRadius: '7px', border: 'none', background: C.redBg, color: C.red, cursor: 'pointer', fontWeight: 700 }}
        >
          ✕
        </button>
        <button
          onClick={() => onOpenDelete(item.id)}
          title="Hapus"
          style={{ width: '28px', height: '28px', borderRadius: '7px', border: 'none', background: C.redBg, color: C.red, cursor: 'pointer', fontWeight: 700 }}
        >
          🗑
        </button>
      </div>
    ) : (
      <button
        onClick={() => onToggleMenu(item.id)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.gray, fontSize: '1.1rem', padding: '0 6px' }}
      >
        ⋮
      </button>
    )}

    {isMenuOpen && (
      <div
        style={{
          position: 'absolute', right: 0, top: '30px', background: C.white,
          border: `1px solid ${C.border}`, borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)', zIndex: 10, minWidth: '140px',
        }}
      >
        <button
          onClick={() => onUpdateStatus(item.id, 'Menunggu')}
          style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', color: C.dark, fontSize: '0.82rem' }}
        >
          Set ke Menunggu
        </button>
        <button
          onClick={() => onOpenEditDate(item.id, item.tanggal)}
          style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', color: C.blue, fontSize: '0.82rem' }}
        >
          Edit Tanggal
        </button>
        <button
          onClick={() => onOpenDelete(item.id)}
          style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', color: C.red, fontSize: '0.82rem' }}
        >
          Hapus
        </button>
      </div>
    )}
  </div>
);

export default RowActionsMenu;
