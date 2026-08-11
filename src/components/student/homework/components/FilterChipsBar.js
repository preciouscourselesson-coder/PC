import React from 'react';
import { FilterChip } from './FilterChip';

// Sidebar vertikal terlalu memakan tempat di layar HP (siswa harus scroll
// panjang dulu sebelum sampai ke daftar tugas). Di mobile, filter status &
// mapel ditampilkan sebagai baris chip yang bisa digeser ke samping,
// sehingga daftar tugas langsung terlihat di bawahnya.
export const FilterChipsBar = ({ stats, mapelList, filterStatus, filterMapel, isActiveStatus, handleStatusClick, handleMapelClick, resetFilters }) => (
  <div style={{ marginBottom: '1rem' }}>
    <div style={{
      display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px',
      WebkitOverflowScrolling: 'touch',
    }}>
      <FilterChip label="Semua" count={stats.total} active={filterStatus === 'Semua' && filterMapel === 'Semua Mapel'} onClick={resetFilters} />
      <FilterChip label="Belum" count={stats.belum} active={isActiveStatus('Belum Dikumpulkan')} onClick={() => handleStatusClick('Belum Dikumpulkan')} />
      <FilterChip label="Sudah" count={stats.sudah} active={isActiveStatus('Sudah Dikumpulkan')} onClick={() => handleStatusClick('Sudah Dikumpulkan')} />
      <FilterChip label="Terlambat" count={stats.terlambat} active={isActiveStatus('Terlambat')} onClick={() => handleStatusClick('Terlambat')} />
    </div>
    {mapelList.length > 1 && (
      <div style={{
        display: 'flex', gap: '8px', overflowX: 'auto', marginTop: '2px',
        WebkitOverflowScrolling: 'touch',
      }}>
        {mapelList.filter(m => m !== 'Semua Mapel').map(m => (
          <FilterChip
            key={m}
            label={m}
            count={stats.mapelStats[m] || 0}
            active={filterMapel === m && filterStatus === 'Semua'}
            onClick={() => handleMapelClick(m)}
          />
        ))}
      </div>
    )}
  </div>
);
