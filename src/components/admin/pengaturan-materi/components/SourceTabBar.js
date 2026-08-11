import React from 'react';
import { C, SOURCE_TABS } from '../theme';

export const SourceTabBar = ({ active, onChange }) => (
  <div style={{ display: 'flex', gap: '6px', marginBottom: '1.3rem', flexWrap: 'wrap' }}>
    {SOURCE_TABS.map(t => (
      <button
        key={t.key}
        onClick={() => onChange(t.key)}
        style={{
          padding: '9px 16px', borderRadius: '10px', border: `1.5px solid ${active === t.key ? C.gold : C.border}`,
          background: active === t.key ? C.goldBg : C.white, color: active === t.key ? C.gold : C.gray,
          fontWeight: active === t.key ? 'bold' : 'normal', fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        {t.label}
      </button>
    ))}
  </div>
);

export default SourceTabBar;
