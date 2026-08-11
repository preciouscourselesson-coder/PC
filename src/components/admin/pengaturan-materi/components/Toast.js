import React from 'react';
import { C } from '../theme';

export const Toast = ({ toast }) => {
  if (!toast) return null;
  return (
    <div style={{
      background: toast.type === 'success' ? C.successBg : C.dangerBg,
      border: `1.5px solid ${toast.type === 'success' ? C.success : C.danger}`,
      color: toast.type === 'success' ? C.success : C.danger,
      borderRadius: '12px', padding: '10px 16px', fontSize: '0.88rem', marginBottom: '1.1rem',
    }}>
      {toast.type === 'success' ? '✓ ' : '⚠️ '}{toast.message}
    </div>
  );
};

export default Toast;
