// Banner pesan error umum (mis. gagal memuat daftar user).
import React from 'react';
import { C } from '../constants';

const ErrorBanner = ({ message }) => {
  if (!message) return null;
  return (
    <div style={{
      background: C.dangerBg, border: `1.5px solid ${C.danger}`, color: C.danger,
      borderRadius: '12px', padding: '10px 16px', fontSize: '0.88rem', marginBottom: '1.1rem',
    }}>
      ⚠️ {message}
    </div>
  );
};

export default ErrorBanner;
