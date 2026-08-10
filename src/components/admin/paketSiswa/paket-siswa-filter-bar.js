// src/components/admin/paketSiswa/PaketSiswaFilterBar.js
import React from 'react';
import { inputStyle, labelStyle } from './paket-siswa-styles';
import { DURASI_OPTIONS, PENGAJAR_OPTIONS } from './paket-siswa-helpers';

const PaketSiswaFilterBar = ({
  search, onSearchChange,
  filterKelas, onFilterKelasChange,
  filterStatus, onFilterStatusChange,
  filterDurasi, onFilterDurasiChange,
  filterPengajar, onFilterPengajarChange,
}) => {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '0.75rem',
        marginBottom: '1.25rem',
      }}
    >
      <div>
        <label style={labelStyle}>Cari</label>
        <input
          type="text"
          placeholder="Cari nama siswa, paket, atau mapel..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          style={inputStyle(false)}
        />
      </div>
      <div>
        <label style={labelStyle}>Kelas</label>
        <select
          value={filterKelas}
          onChange={(e) => onFilterKelasChange(e.target.value)}
          style={{ ...inputStyle(false), cursor: 'pointer' }}
        >
          <option>Semua</option>
          <option>VII</option>
          <option>VIII</option>
          <option>IX</option>
          <option>X</option>
          <option>XI</option>
          <option>XII</option>
        </select>
      </div>
      <div>
        <label style={labelStyle}>Status</label>
        <select
          value={filterStatus}
          onChange={(e) => onFilterStatusChange(e.target.value)}
          style={{ ...inputStyle(false), cursor: 'pointer' }}
        >
          <option>Semua</option>
          <option>Aktif</option>
          <option>Akan Berakhir</option>
          <option>Berakhir</option>
          <option>Selesai</option>
        </select>
      </div>
      <div>
        <label style={labelStyle}>Durasi</label>
        <select
          value={filterDurasi}
          onChange={(e) => onFilterDurasiChange(e.target.value)}
          style={{ ...inputStyle(false), cursor: 'pointer' }}
        >
          <option>Semua</option>
          {DURASI_OPTIONS.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
      </div>
      <div>
        <label style={labelStyle}>Pengajar</label>
        <select
          value={filterPengajar}
          onChange={(e) => onFilterPengajarChange(e.target.value)}
          style={{ ...inputStyle(false), cursor: 'pointer' }}
        >
          <option>Semua</option>
          {PENGAJAR_OPTIONS.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default PaketSiswaFilterBar;