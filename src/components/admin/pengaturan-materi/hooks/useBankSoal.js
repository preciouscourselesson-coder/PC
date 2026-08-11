import { useState, useEffect, useMemo } from 'react';
import { PAGE_SIZE } from '../theme';

// State, data turunan, dan filter untuk tab "Bank Soal Siswa"
// (tabel bank_soal_siswa). Tidak ada aksi ubah status di sini — hanya
// hapus, yang ditangani oleh useDeleteItem secara generik.
export const useBankSoal = ({ bankRows, profilesMap }) => {
  const [search, setSearch] = useState('');
  const [jenisFilter, setJenisFilter] = useState('');
  const [siswaFilter, setSiswaFilter] = useState('');
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState(null);

  const enriched = useMemo(() => bankRows.map(r => ({
    ...r,
    siswaNama: profilesMap[r.siswa_id] || '(Tidak diketahui)',
  })), [bankRows, profilesMap]);

  const siswaOptions = useMemo(() => {
    const set = new Set();
    enriched.forEach(r => { if (r.siswaNama) set.add(r.siswaNama); });
    return Array.from(set).sort();
  }, [enriched]);

  const counts = useMemo(() => ({
    '': bankRows.length,
    Ulangan: bankRows.filter(r => r.jenis === 'Ulangan').length,
    Penugasan: bankRows.filter(r => r.jenis === 'Penugasan').length,
  }), [bankRows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enriched.filter(r => {
      if (jenisFilter && r.jenis !== jenisFilter) return false;
      if (siswaFilter && r.siswaNama !== siswaFilter) return false;
      if (q) {
        const hay = [r.judul, r.bab, r.sub_bab, r.deskripsi, r.siswaNama].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [enriched, search, jenisFilter, siswaFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pageRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search, jenisFilter, siswaFilter]);

  const resetFilters = () => {
    setSearch(''); setJenisFilter(''); setSiswaFilter(''); setPage(1);
  };

  return {
    search, setSearch,
    jenisFilter, setJenisFilter,
    siswaFilter, setSiswaFilter,
    page, setPage,
    busyId, setBusyId,
    enriched, siswaOptions, counts,
    filteredRows, totalPages, pageRows,
    resetFilters,
  };
};

export default useBankSoal;
