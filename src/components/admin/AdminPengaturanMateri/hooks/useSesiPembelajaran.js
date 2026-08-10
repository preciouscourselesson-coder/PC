import { useState, useEffect, useMemo } from 'react';
import { supabase, checkedUpdate } from '../lib';
import { PAGE_SIZE } from '../theme';

// State, data turunan, dan handler untuk tab "Sesi Pembelajaran"
// (tabel sesi_pembelajaran): filter/pencarian, paginasi, dan ubah status
// (Setujui/Tolak).
export const useSesiPembelajaran = ({ sesiRows, setSesiRows, profilesMap, showError, showSuccess }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [siswaFilter, setSiswaFilter] = useState('');
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState(null);

  const enriched = useMemo(() => sesiRows.map(r => ({
    ...r,
    siswaNama: profilesMap[r.siswa_id] || '(Tidak diketahui)',
    guruNama: profilesMap[r.guru_id] || '(Tidak diketahui)',
  })), [sesiRows, profilesMap]);

  const siswaOptions = useMemo(() => {
    const set = new Set();
    enriched.forEach(r => { if (r.siswaNama) set.add(r.siswaNama); });
    return Array.from(set).sort();
  }, [enriched]);

  const counts = useMemo(() => ({
    '': sesiRows.length,
    Menunggu: sesiRows.filter(r => r.status === 'Menunggu').length,
    Disetujui: sesiRows.filter(r => r.status === 'Disetujui').length,
    Ditolak: sesiRows.filter(r => r.status === 'Ditolak').length,
  }), [sesiRows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enriched.filter(r => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (siswaFilter && r.siswaNama !== siswaFilter) return false;
      if (q) {
        const hay = [r.judul_materi, r.catatan, r.siswaNama, r.guruNama].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [enriched, search, statusFilter, siswaFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pageRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search, statusFilter, siswaFilter]);

  const handleStatusChange = async (item, newStatus) => {
    setBusyId(item.id);
    const { error } = await checkedUpdate(
      supabase.from('sesi_pembelajaran').update({ status: newStatus }).eq('id', item.id)
    );
    setBusyId(null);
    if (error) { showError('Gagal mengubah status: ' + error.message); return; }
    setSesiRows(prev => prev.map(r => r.id === item.id ? { ...r, status: newStatus } : r));
    showSuccess(`Sesi "${item.judul_materi}" ditandai ${newStatus}.`);
  };

  const resetFilters = () => {
    setSearch(''); setStatusFilter(''); setSiswaFilter(''); setPage(1);
  };

  return {
    search, setSearch,
    statusFilter, setStatusFilter,
    siswaFilter, setSiswaFilter,
    page, setPage,
    busyId, setBusyId,
    enriched, siswaOptions, counts,
    filteredRows, totalPages, pageRows,
    handleStatusChange,
    resetFilters,
  };
};

export default useSesiPembelajaran;
