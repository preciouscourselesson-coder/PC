// src/components/admin/adminHome/AdminHomeHeader.js
import React from 'react';
import { C } from '../../shared/Theme';
import { getGreeting, getTitle, formatHariTanggal } from './admin-home-helpers';

const AdminHomeHeader = ({ adminProfile, today }) => {
  const title = getTitle(adminProfile?.gender);
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: C.dark, margin: '0 0 0.25rem 0' }}>
        {getGreeting()}, {title}{title ? ' ' : ''}{adminProfile?.full_name || 'Admin'}
      </h1>
      <p style={{ fontSize: '0.95rem', color: C.gray, margin: 0 }}>{formatHariTanggal(today)}</p>
    </div>
  );
};

export default AdminHomeHeader;
