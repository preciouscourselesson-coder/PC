import React from 'react';
import { C } from '../constants';

export const FilterBar = ({ kelasList, mapelList, filterKelas, setFilterKelas, filterMapel, setFilterMapel, isMobile, isFiltered, onReset }) => (
  <div style={{
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    alignItems: 'center',
    marginBottom: '1.2rem',
  }}>
    <select
      value={filterKelas}
      onChange={e => setFilterKelas(e.target.value)}
      style={{
        padding: '7px 14px',
        borderRadius: '40px',
        border: `1.5px solid ${C.border}`,
        fontSize: isMobile ? '16px' : '0.82rem',
        minHeight: isMobile ? '44px' : 'auto',
        fontFamily: 'inherit',
        background: C.white,
        color: C.dark,
        outline: 'none',
        cursor: 'pointer',
      }}
    >
      {kelasList.map(k => (
        <option key={k} value={k}>{k === 'Semua Kelas' ? 'Semua Kelas' : `Kelas: ${k}`}</option>
      ))}
    </select>

    <select
      value={filterMapel}
      onChange={e => setFilterMapel(e.target.value)}
      style={{
        padding: '7px 14px',
        borderRadius: '40px',
        border: `1.5px solid ${C.border}`,
        fontSize: isMobile ? '16px' : '0.82rem',
        minHeight: isMobile ? '44px' : 'auto',
        fontFamily: 'inherit',
        background: C.white,
        color: C.dark,
        outline: 'none',
        cursor: 'pointer',
      }}
    >
      {mapelList.map(m => (
        <option key={m} value={m}>{m === 'Semua Mapel' ? 'Semua Mapel' : `Mapel: ${m}`}</option>
      ))}
    </select>

    {isFiltered && (
      <button
        onClick={onReset}
        style={{
          padding: '4px 12px',
          borderRadius: '40px',
          border: `1px solid ${C.primary}`,
          background: 'transparent',
          color: C.primary,
          fontSize: '0.75rem',
          minHeight: isMobile ? '36px' : 'auto',
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        Reset Filter
      </button>
    )}
  </div>
);
