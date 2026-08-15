// shared.js
// Kumpulan hook & konstanta kecil yang dipakai bersama oleh beberapa
// komponen Student* (sebelumnya duplikat identik di masing-masing file).
import { useState, useEffect } from 'react';

// Ukuran minimum target sentuh yang nyaman di layar HP
// (rekomendasi Apple/Google: ~44px)
export const TOUCH_TARGET = 44;

// Hook deteksi layar mobile berdasarkan lebar viewport.
export const useIsMobile = (bp = 768) => {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < bp : false
  );
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < bp);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [bp]);
  return isMobile;
};
