// Hook untuk state buka/tutup dropdown mapel di baris guru, termasuk klik-di-luar untuk menutup.
import { useState, useRef, useEffect } from 'react';

export default function useMapelDropdown() {
  const [mapelDropdownOpenId, setMapelDropdownOpenId] = useState(null);
  const mapelDropdownRef = useRef(null);

  useEffect(() => {
    if (mapelDropdownOpenId === null) return;
    const handleClickOutside = (e) => {
      if (mapelDropdownRef.current && !mapelDropdownRef.current.contains(e.target)) {
        setMapelDropdownOpenId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mapelDropdownOpenId]);

  return { mapelDropdownOpenId, setMapelDropdownOpenId, mapelDropdownRef };
}
