import { useState, useEffect } from 'react';
import { PAGE_SIZE } from '../constants';

// Kelola filter (search, kelas, status) + paginasi client-side atas `items`
export const useFilters = (items) => {
  const [search, setSearch] = useState('');
  const [filterKelas, setFilterKelas] = useState('Semua');
  const [filterStatus, setFilterStatus] = useState('Semua');
  const [page, setPage] = useState(1);

  const filteredItems = items.filter((it) => {
    if (filterKelas !== 'Semua' && it.kelas !== filterKelas) return false;
    if (filterStatus !== 'Semua' && it.status !== filterStatus) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      if (!it.program.toLowerCase().includes(q) && !it.kelas.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filteredItems.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const rangeStart = filteredItems.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(safePage * PAGE_SIZE, filteredItems.length);

  useEffect(() => {
    setPage(1);
  }, [search, filterKelas, filterStatus]);

  return {
    search, setSearch,
    filterKelas, setFilterKelas,
    filterStatus, setFilterStatus,
    page, setPage,
    filteredItems, totalPages, safePage, pageItems, rangeStart, rangeEnd,
  };
};
