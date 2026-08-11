// src/components/admin/adminAbsensi/stat-card.js
import React from 'react';
import { C } from '../../shared/Theme';

const StatCard = ({ label, value, fg, bg }) => (
  <div
    style={{
      background: bg || C.cream,
      borderRadius: '14px',
      padding: '1rem 1.1rem',
      flex: '1 1 150px',
      border: `1px solid ${C.border}`,
    }}
  >
    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: C.gray, marginBottom: '6px' }}>{label}</div>
    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: fg || C.dark }}>{value}</div>
  </div>
);

export default StatCard;
