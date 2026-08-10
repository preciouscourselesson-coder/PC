// src/components/admin/adminHome/ScheduleFilterBar.js
import React from 'react';
import { labelStyle, inputStyle } from './admin-home-styles';

const ScheduleFilterBar = ({ filterType, onFilterTypeChange, filterValue, onFilterValueChange, teachers, students }) => {
  return (
    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
      <div style={{ flex: '0 0 150px' }}>
        <label style={labelStyle}>Filter Berdasarkan</label>
        <select
          value={filterType}
          onChange={(e) => onFilterTypeChange(e.target.value)}
          style={inputStyle}
        >
          <option value="guru">Guru</option>
          <option value="siswa">Siswa</option>
        </select>
      </div>
      <div style={{ flex: 1 }}>
        <label style={labelStyle}>Pilih {filterType === 'guru' ? 'Guru' : 'Siswa'}</label>
        <select
          value={filterValue}
          onChange={(e) => onFilterValueChange(e.target.value)}
          style={inputStyle}
        >
          {filterType === 'guru' ? (
            teachers.length === 0 ? (
              <option value="">Belum ada guru</option>
            ) : (
              teachers.map((g) => <option key={g.id} value={g.id}>{g.nama}</option>)
            )
          ) : (
            students.length === 0 ? (
              <option value="">Belum ada siswa</option>
            ) : (
              students.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)
            )
          )}
        </select>
      </div>
    </div>
  );
};

export default ScheduleFilterBar;
