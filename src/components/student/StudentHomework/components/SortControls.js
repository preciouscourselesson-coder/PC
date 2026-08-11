import React from 'react';
import { C } from '../constants';

export const SortControls = ({ sortBy, setSortBy, isMobile, showReset, onReset }) => (
  <div style={{
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    alignItems: 'center',
    marginBottom: '1rem',
  }}>
    <select
      value={sortBy}
      onChange={e => setSortBy(e.target.value)}
      style={{
        padding: '6px 12px',
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
      <option value="Terbaru">Urutkan: Terbaru</option>
      <option value="Terlama">Urutkan: Terlama</option>
      <option value="A-Z">Urutkan: A-Z</option>
    </select>
    {showReset && (
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
