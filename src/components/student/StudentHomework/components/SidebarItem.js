import React from 'react';
import { C } from '../constants';

export const SidebarItem = ({ label, count, active, onClick }) => (
  <div
    onClick={onClick}
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '0.5rem 0.8rem',
      borderRadius: '8px',
      cursor: 'pointer',
      background: active ? C.primaryBg : 'transparent',
      color: active ? C.primary : C.dark,
      fontWeight: active ? 'bold' : 'normal',
      transition: 'background 0.15s',
    }}
    onMouseEnter={e => {
      if (!active) e.currentTarget.style.background = C.primaryLight;
    }}
    onMouseLeave={e => {
      if (!active) e.currentTarget.style.background = 'transparent';
    }}
  >
    <span style={{ fontSize: '0.85rem' }}>{label}</span>
    <span style={{
      background: active ? C.primary : C.border,
      color: active ? C.white : C.gray,
      padding: '1px 10px',
      borderRadius: '40px',
      fontSize: '0.7rem',
      fontWeight: 'bold',
    }}>{count}</span>
  </div>
);
