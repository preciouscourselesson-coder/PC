import { useState, useEffect, useCallback } from 'react';

/**
 * Toast — komponen notifikasi seragam untuk seluruh aplikasi.
 * Menggantikan alert()/window.alert() bawaan browser.
 *
 * Pola & warna diambil dari AdminConfirmUser.js (implementasi toast pertama
 * yang sudah ada di codebase), supaya tampilan konsisten di semua file.
 *
 * Cara pakai:
 *   import Toast, { useToast } from '.../components/Toast';
 *   const { toast, showToast } = useToast();
 *   ...
 *   showToast('error', 'Gagal menyimpan: ' + err.message);
 *   showToast('success', 'Data berhasil disimpan.');
 *   showToast('warning', 'Pilih siswa terlebih dahulu.');
 *   ...
 *   return (
 *     <div>
 *       <Toast toast={toast} />
 *       ...
 *     </div>
 *   );
 */

const STYLES = {
  success: { text: '#2e9e5b', bg: '#eefaf2', icon: '✓' },
  error:   { text: '#e74c3c', bg: '#fff0f0', icon: '⚠️' },
  warning: { text: '#b4964b', bg: 'rgba(180,150,75,0.08)', icon: '⚠️' },
};

export function useToast(duration = 3000) {
  const [toast, setToastState] = useState(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToastState(null), duration);
    return () => clearTimeout(t);
  }, [toast, duration]);

  // showToast('error' | 'success' | 'warning', 'pesan...')
  const showToast = useCallback((type, message) => {
    setToastState({ type, message });
  }, []);

  const clearToast = useCallback(() => setToastState(null), []);

  return { toast, showToast, clearToast };
}

export default function Toast({ toast, style }) {
  if (!toast) return null;
  const c = STYLES[toast.type] || STYLES.error;

  return (
    <div
      style={{
        background: c.bg,
        border: `1.5px solid ${c.text}`,
        color: c.text,
        borderRadius: '12px',
        padding: '10px 16px',
        fontSize: '0.88rem',
        marginBottom: '1.25rem',
        ...style,
      }}
    >
      {c.icon} {toast.message}
    </div>
  );
}