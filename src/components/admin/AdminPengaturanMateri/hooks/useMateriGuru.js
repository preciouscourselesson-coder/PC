import { useState, useEffect, useMemo } from 'react';
import { supabase, checkedUpdate } from '../lib';
import { PAGE_SIZE } from '../theme';

// Semua state, data turunan (derived), dan handler untuk tab "Materi Guru"
// (tabel materi_file): filter/pencarian, paginasi, arsip, dan edit.
export const useMateriGuru = ({ rows, setRows, babList, showError, showSuccess, refetch }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [mapelFilter, setMapelFilter] = useState('');
  const [guruFilter, setGuruFilter] = useState('');
  const [kelasFilter, setKelasFilter] = useState('');
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const guruOptions = useMemo(() => {
    const map = new Map();
    rows.forEach(r => {
      if (r.user_id && !map.has(r.user_id)) map.set(r.user_id, r.diupload_oleh || '(Tanpa nama)');
    });
    return Array.from(map, ([user_id, nama]) => ({ user_id, nama })).sort((a, b) => a.nama.localeCompare(b.nama));
  }, [rows]);

  const kelasOptions = useMemo(() => {
    const set = new Set();
    rows.forEach(r => { if (r.kelas) set.add(r.kelas); });
    return Array.from(set).sort();
  }, [rows]);

  const mapelOptions = useMemo(() => {
    const set = new Set();
    // materi_file sudah punya kolom 'mapel' langsung, jadi ambil dari data
    // materi itu sendiri (bukan dari babList) — konsisten dengan kelasOptions.
    rows.forEach(r => { if (r.mapel) set.add(r.mapel); });
    return Array.from(set).sort();
  }, [rows]);

  const materiCounts = useMemo(() => ({
    '': rows.length,
    Dipublish: rows.filter(r => r.status === 'Dipublish').length,
    Diarsipkan: rows.filter(r => r.status === 'Diarsipkan').length,
  }), [rows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(r => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (mapelFilter && r.mapel !== mapelFilter) return false;
      if (guruFilter && r.user_id !== guruFilter) return false;
      if (kelasFilter && r.kelas !== kelasFilter) return false;
      if (q) {
        const hay = [
          r.nama, r.diupload_oleh, r.bab, r.mapel, r.sub_bab,
        ].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, statusFilter, mapelFilter, guruFilter, kelasFilter]);

  const materiTotalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const materiPageRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search, statusFilter, mapelFilter, guruFilter, kelasFilter]);

  const handleArchiveToggle = async (item) => {
    const nextStatus = item.status === 'Diarsipkan' ? 'Dipublish' : 'Diarsipkan';
    setBusyId(item.id);
    const { error } = await checkedUpdate(
      supabase.from('materi_file').update({ status: nextStatus }).eq('id', item.id)
    );
    setBusyId(null);
    if (error) { showError('Gagal mengubah status: ' + error.message); return; }
    setRows(prev => prev.map(r => r.id === item.id ? { ...r, status: nextStatus } : r));
    showSuccess(`"${item.nama}" ${nextStatus === 'Diarsipkan' ? 'diarsipkan' : 'diaktifkan kembali'}.`);
  };

  const editSelectedBab = editItem
    ? babList.find(b => b.id === editItem.bab_id)
    : null;

  const editMapelNama = editItem
    ? (editSelectedBab?.materi_mapel?.nama || '')
    : '';
  const editBabOptions = editMapelNama ? babList.filter(b => b.materi_mapel?.nama === editMapelNama) : babList;

  const handleSaveEdit = async () => {
    if (!editItem) return;
    setSavingEdit(true);
    const { error } = await checkedUpdate(
      supabase
        .from('materi_file')
        .update({
          nama: editItem.nama,
          deskripsi: editItem.deskripsi,
          kelas: editItem.kelas,
          bab_id: editItem.bab_id || null,
          // 'mapel' dan 'bab' didenormalisasi di materi_file (bukan hasil join),
          // jadi ikut disinkronkan manual berdasarkan bab yang dipilih supaya
          // tampilan tabel/export tetap akurat tanpa perlu join ke materi_bab.
          mapel: editSelectedBab?.materi_mapel?.nama || null,
          bab: editSelectedBab?.nama || null,
          status: editItem.status,
        })
        .eq('id', editItem.id)
    );
    setSavingEdit(false);
    if (error) { showError('Gagal menyimpan perubahan: ' + error.message); return; }
    showSuccess('Materi berhasil diperbarui.');
    setEditItem(null);
    refetch();
  };

  const startEdit = (item) => setEditItem({ ...item });

  const resetFilters = () => {
    setSearch(''); setStatusFilter(''); setMapelFilter(''); setGuruFilter(''); setKelasFilter(''); setPage(1);
  };

  return {
    search, setSearch,
    statusFilter, setStatusFilter,
    mapelFilter, setMapelFilter,
    guruFilter, setGuruFilter,
    kelasFilter, setKelasFilter,
    page, setPage,
    busyId, setBusyId,
    editItem, setEditItem, startEdit,
    savingEdit,
    guruOptions, kelasOptions, mapelOptions,
    materiCounts,
    filteredRows, materiTotalPages, materiPageRows,
    editSelectedBab, editMapelNama, editBabOptions,
    handleArchiveToggle, handleSaveEdit,
    resetFilters,
  };
};

export default useMateriGuru;
