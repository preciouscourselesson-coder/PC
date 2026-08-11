// src/components/admin/adminAbsensi/use-entries-filter.js
//
// Semua state & logic filter tabel "detail pertemuan" dikumpulkan di sini.
// Tidak menyentuh Supabase sama sekali -- cukup diberi array `entries`
// biasa, sehingga gampang ditest: buat beberapa entries palsu, panggil
// hook lewat renderHook, lalu assert `filteredEntries`.
import { useState, useMemo, useCallback } from 'react';
import { bulanFromIso } from './admin-absensi-helpers';

const DEFAULTS = {
  filterGuru: 'Semua Guru',
  filterSiswa: 'Semua Siswa',
  filterBulan: 'Semua Bulan',
  filterStatus: 'Semua Status',
  search: '',
};

export function useEntriesFilter(entries) {
  const [filterGuru, setFilterGuru] = useState(DEFAULTS.filterGuru);
  const [filterSiswa, setFilterSiswa] = useState(DEFAULTS.filterSiswa);
  const [filterBulan, setFilterBulan] = useState(DEFAULTS.filterBulan);
  const [filterStatus, setFilterStatus] = useState(DEFAULTS.filterStatus);
  const [search, setSearch] = useState(DEFAULTS.search);

  const bulanOptions = useMemo(
    () => ['Semua Bulan', ...Array.from(new Set(entries.map((e) => bulanFromIso(e.tanggal)))).filter(Boolean)],
    [entries]
  );

  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      const namaSiswa = e.siswa?.full_name || '';
      const namaGuru = e.guruProfile?.full_name || '';
      if (filterGuru !== 'Semua Guru' && e.guru_id !== filterGuru) return false;
      if (filterSiswa !== 'Semua Siswa' && e.siswa_id !== filterSiswa) return false;
      if (filterBulan !== 'Semua Bulan' && bulanFromIso(e.tanggal) !== filterBulan) return false;
      if (filterStatus !== 'Semua Status' && e.status !== filterStatus) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (
          !e.judul_materi.toLowerCase().includes(q) &&
          !(e.catatan || '').toLowerCase().includes(q) &&
          !namaSiswa.toLowerCase().includes(q) &&
          !namaGuru.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [entries, filterGuru, filterSiswa, filterBulan, filterStatus, search]);

  const hasActiveFilters =
    filterGuru !== DEFAULTS.filterGuru ||
    filterSiswa !== DEFAULTS.filterSiswa ||
    filterBulan !== DEFAULTS.filterBulan ||
    filterStatus !== DEFAULTS.filterStatus ||
    !!search;

  const resetFilters = useCallback(() => {
    setFilterGuru(DEFAULTS.filterGuru);
    setFilterSiswa(DEFAULTS.filterSiswa);
    setFilterBulan(DEFAULTS.filterBulan);
    setFilterStatus(DEFAULTS.filterStatus);
    setSearch(DEFAULTS.search);
  }, []);

  return {
    filterGuru, setFilterGuru,
    filterSiswa, setFilterSiswa,
    filterBulan, setFilterBulan,
    filterStatus, setFilterStatus,
    search, setSearch,
    bulanOptions,
    filteredEntries,
    hasActiveFilters,
    resetFilters,
  };
}
