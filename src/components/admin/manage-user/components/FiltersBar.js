// Input pencarian nama/email plus tombol filter berdasarkan peran dan status.
import React from 'react';
import { C, ROLE_LABEL, STATUS_LABEL } from '../constants';

// Tombol "Semua Peran" / "Semua Status" sengaja diberi warna beda (netral gelap)
// dari tombol filter spesifik lainnya (gold), supaya jelas terlihat sebagai
// opsi "reset filter", bukan salah satu pilihan peran/status.
const filterBtnStyle = (active, isAll) => {
  const activeColor = isAll ? C.dark : C.gold;
  const activeBg = isAll ? C.allFilterBg : C.goldBg;
  const activeBorder = isAll ? C.allFilterBorder : C.gold;
  return {
    padding: '7px 14px', borderRadius: '20px',
    border: `1.5px solid ${active ? activeBorder : C.border}`,
    background: active ? activeBg : C.white,
    color: active ? activeColor : C.gray,
    fontSize: '0.83rem', fontWeight: active ? 'bold' : 'normal', cursor: 'pointer',
    fontFamily: 'inherit', whiteSpace: 'nowrap',
  };
};

const FiltersBar = ({ search, onSearchChange, roleFilter, onRoleFilterChange, statusFilter, onStatusFilterChange }) => (
  <div style={{
    display: 'flex', flexWrap: 'wrap', gap: '0.7rem', alignItems: 'center',
    marginBottom: '1.25rem',
  }}>
    <input
      type="text"
      placeholder="Cari nama atau email..."
      value={search}
      onChange={e => onSearchChange(e.target.value)}
      style={{
        flex: '1 1 220px', padding: '9px 14px', borderRadius: '10px',
        border: `1.5px solid ${C.border}`, fontSize: '0.88rem', fontFamily: 'inherit',
        outline: 'none', boxSizing: 'border-box', color: C.dark,
      }}
    />

    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
      {['all', 'student', 'teacher', 'parent', 'admin'].map(r => (
        <button key={r} onClick={() => onRoleFilterChange(r)} style={filterBtnStyle(roleFilter === r, r === 'all')}>
          {r === 'all' ? 'Semua Peran' : ROLE_LABEL[r]}
        </button>
      ))}
    </div>

    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
      {['all', 'pending', 'approved', 'rejected'].map(s => (
        <button key={s} onClick={() => onStatusFilterChange(s)} style={filterBtnStyle(statusFilter === s, s === 'all')}>
          {s === 'all' ? 'Semua Status' : STATUS_LABEL[s]}
        </button>
      ))}
    </div>
  </div>
);

export default FiltersBar;