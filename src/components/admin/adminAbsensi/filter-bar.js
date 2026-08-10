// src/components/admin/adminAbsensi/filter-bar.js
import React from 'react';
import { C } from '../../Theme';
import { selectStyle } from './admin-absensi-styles';

const FilterBar = ({
  filterGuru, setFilterGuru,
  filterSiswa, setFilterSiswa,
  filterBulan, setFilterBulan,
  filterStatus, setFilterStatus,
  search, setSearch,
  guruList, studentList, bulanOptions,
  hasActiveFilters, onReset, onOpenRekap,
}) => (
  <div
    style={{
      display: 'flex',
      gap: '0.7rem',
      flexWrap: 'wrap',
      alignItems: 'center',
      marginBottom: '1rem',
      background: C.white,
      border: `1px solid ${C.border}`,
      borderRadius: '12px',
      padding: '0.85rem',
    }}
  >
    <select value={filterGuru} onChange={(e) => setFilterGuru(e.target.value)} style={selectStyle}>
      <option value="Semua Guru">Semua Guru</option>
      {guruList.map((g) => (
        <option key={g.id} value={g.id}>{g.full_name}</option>
      ))}
    </select>

    <select value={filterSiswa} onChange={(e) => setFilterSiswa(e.target.value)} style={selectStyle}>
      <option value="Semua Siswa">Semua Siswa</option>
      {studentList.map((s) => (
        <option key={s.id} value={s.id}>{s.full_name}</option>
      ))}
    </select>

    <select value={filterBulan} onChange={(e) => setFilterBulan(e.target.value)} style={selectStyle}>
      {bulanOptions.map((b) => (
        <option key={b} value={b}>{b}</option>
      ))}
    </select>

    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={selectStyle}>
      <option value="Semua Status">Semua Status</option>
      <option value="Menunggu">Menunggu</option>
      <option value="Disetujui">Disetujui</option>
      <option value="Ditolak">Ditolak</option>
    </select>

    <input
      type="text"
      placeholder="Cari judul materi, catatan, nama..."
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      style={{ ...selectStyle, cursor: 'text', flex: '1 1 220px', minWidth: '200px' }}
    />

    <button
      onClick={onOpenRekap}
      style={{ ...selectStyle, background: C.gold, color: C.white, fontWeight: 'bold', border: 'none' }}
    >
      📊 Rekap Siswa
    </button>

    {hasActiveFilters && (
      <button onClick={onReset} style={{ ...selectStyle, background: C.cream, fontWeight: 700 }}>
        Reset Filter
      </button>
    )}
  </div>
);

export default FilterBar;
