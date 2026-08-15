import React from 'react';
import { C } from '../../../shared/Theme';

// Kotak folder pada grid navigasi (pola sama seperti "Tugas Saya" di TeacherHomework:
// klik kotak untuk menyaring materi per folder, ada kotak putus-putus untuk folder baru)
export const FolderTile = ({ icon, label, count, active, onClick, onDelete, onRename, isStudentFolder }) => (
  <div
    role="button"
    tabIndex={0}
    onClick={onClick}
    onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick();
      }
    }}
    style={{
      position: 'relative', display: 'flex', flexDirection: 'column', gap: '6px',
      borderRadius: '12px', border: `1.5px solid ${active ? C.gold : C.border}`,
      background: active ? C.goldBg : C.white, padding: '0.8rem', cursor: 'pointer',
      boxSizing: 'border-box',
    }}
  >
    {(onDelete || onRename) && (
      <div style={{ position: 'absolute', top: '4px', right: '4px', display: 'flex', gap: '2px' }}>
        {onRename && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRename(); }}
            title={`Ganti nama folder ${label}`}
            style={{
              width: '22px', height: '22px', borderRadius: '6px', border: 'none',
              background: 'transparent', color: C.gray, cursor: 'pointer', fontSize: '0.72rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ✏️
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            title={`Hapus folder ${label}`}
            style={{
              width: '22px', height: '22px', borderRadius: '6px', border: 'none',
              background: 'transparent', color: C.gray, cursor: 'pointer', fontSize: '0.75rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            🗑️
          </button>
        )}
      </div>
    )}
    <div style={{
      width: '34px', height: '34px', borderRadius: '9px', display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontSize: '1rem',
      background: active ? C.gold : C.cream, color: active ? C.white : C.gray,
    }}>
      {icon}
    </div>
    <div style={{ minWidth: 0 }}>
      <div
        style={{
          fontSize: '0.8rem', fontWeight: 'bold', color: active ? C.gold : C.dark,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}
        title={label}
      >
        {label}
      </div>
      <div style={{ fontSize: '0.7rem', color: C.gray }}>
        {count} materi{isStudentFolder ? ' · Folder Siswa' : ''}
      </div>
    </div>
  </div>
);
