import React from 'react';
import { C } from '../constants';
import { SidebarItem } from './SidebarItem';

export const Sidebar = ({ stats, mapelList, filterStatus, filterMapel, isActiveStatus, handleStatusClick, handleMapelClick, resetFilters }) => {
  return (
    <div style={{
      background: C.white,
      border: `1.5px solid ${C.border}`,
      borderRadius: '16px',
      padding: '0.8rem 0',
      width: '100%',
      minWidth: '200px',
    }}>
      <div style={{ padding: '0 0.8rem' }}>
        <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: C.dark, fontWeight: 'bold' }}>
          📂 Filter Tugas
        </h4>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <SidebarItem
          label="Semua Tugas"
          count={stats.total}
          active={filterStatus === 'Semua' && filterMapel === 'Semua Mapel'}
          onClick={resetFilters}
        />
        <SidebarItem
          label="Belum Dikumpulkan"
          count={stats.belum}
          active={isActiveStatus('Belum Dikumpulkan')}
          onClick={() => handleStatusClick('Belum Dikumpulkan')}
        />
        <SidebarItem
          label="Sudah Dikumpulkan"
          count={stats.sudah}
          active={isActiveStatus('Sudah Dikumpulkan')}
          onClick={() => handleStatusClick('Sudah Dikumpulkan')}
        />
        <SidebarItem
          label="Terlambat"
          count={stats.terlambat}
          active={isActiveStatus('Terlambat')}
          onClick={() => handleStatusClick('Terlambat')}
        />
        <hr style={{ border: 'none', borderTop: `1px solid ${C.border}`, margin: '0.6rem 0.8rem' }} />
        <div style={{ padding: '0 0.8rem', marginBottom: '0.3rem' }}>
          <span style={{ fontSize: '0.75rem', color: C.gray, fontWeight: 'bold' }}>MATA PELAJARAN</span>
        </div>
        {mapelList.map(m => {
          if (m === 'Semua Mapel') return null;
          return (
            <SidebarItem
              key={m}
              label={m}
              count={stats.mapelStats[m] || 0}
              active={filterMapel === m && filterStatus === 'Semua'}
              onClick={() => handleMapelClick(m)}
            />
          );
        })}
      </div>
    </div>
  );
};
