// Hook notifikasi toast sederhana: set toast lalu otomatis hilang setelah 3 detik.
import { useState, useEffect } from 'react';

export default function useToast() {
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  return { toast, setToast };
}
