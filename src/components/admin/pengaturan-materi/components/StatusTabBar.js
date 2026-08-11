import React from 'react';
import { C } from '../theme';

export const StatusTabBar = ({ tabs, active, counts, onChange }) => (
  <div style={{ display: 'flex', gap: '4px', marginBottom: '1.1rem', borderBottom: `1.5px solid ${C.border}` }}>
    {tabs.map(tab => (
      <button
        key={tab.key}
        onClick={() => onChange(tab.key)}
        style={{
          padding: '10px 6px', border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit',
          fontSize: '0.9rem', fontWeight: active === tab.key ? 'bold' : 'normal',
          color: active === tab.key ? C.gold : C.gray,
          borderBottom: active === tab.key ? `2.5px solid ${C.gold}` : '2.5px solid transparent',
          marginRight: '18px', marginBottom: '-1.5px',
        }}
      >
        {tab.label} ({counts[tab.key] ?? 0})
      </button>
    ))}
  </div>
);

export default StatusTabBar;
