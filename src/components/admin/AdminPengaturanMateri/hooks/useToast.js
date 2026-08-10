import { useState, useEffect, useCallback } from 'react';

// Hook kecil untuk notifikasi toast (sukses/error) yang otomatis hilang
// setelah 3 detik, dipakai di seluruh AdminPengaturanMateri.
export const useToast = () => {
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const showError = useCallback((message) => setToast({ type: 'error', message }), []);
  const showSuccess = useCallback((message) => setToast({ type: 'success', message }), []);

  return { toast, setToast, showError, showSuccess };
};

export default useToast;
