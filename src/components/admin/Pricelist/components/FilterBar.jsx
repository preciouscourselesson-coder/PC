import React from 'react';
import { KELAS_OPTIONS, STATUS_OPTIONS } from '../constants';
import { inputStyle, labelStyle } from '../styles';

const FilterBar = ({ search, setSearch, filterKelas, setFilterKelas, filterStatus, setFilterStatus }) => {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
      <div>
        <label style={{ ...labelStyle, fontSize: '0.72rem' }}>Cari</label>
        <input
          type="text"
          placeholder="Cari kelas atau program..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputStyle(false), fontSize: '0.85rem' }}
        />
      </div>
      <div>
        <label style={{ ...labelStyle, fontSize: '0.72rem' }}>Kelas</label>
        <select value={filterKelas} onChange={(e) => setFilterKelas(e.target.value)} style={{ ...inputStyle(false), cursor: 'pointer', fontSize: '0.85rem' }}>
          <option>Semua</option>
          {KELAS_OPTIONS.map((k) => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>
      </div>
      <div>
        <label style={{ ...labelStyle, fontSize: '0.72rem' }}>Status</label>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ ...inputStyle(false), cursor: 'pointer', fontSize: '0.85rem' }}>
          <option>Semua</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default FilterBar;
