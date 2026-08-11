// src/components/admin/adminAbsensi/use-absensi-entries.js
//
// Membungkus semua akses Supabase untuk daftar entri sesi pembelajaran:
// fetch, ubah status, ubah tanggal, hapus. Dipisah dari komponen supaya
// komponen UI tinggal "consume" data & handler, dan hook ini bisa
// di-test/di-mock terpisah dari rendering. `showToast` di-inject dari
// luar supaya bisa ditest dengan toast palsu (jest.fn()).
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../supabaseClient';
import { checkedUpdate } from '../../../utils/supabaseUpdateGuard';

const TABLE = 'sesi_pembelajaran';

const SELECT_QUERY =
  'id, tanggal, judul_materi, catatan, bukti_urls, status, siswa_id, guru_id, ' +
  'siswa:profiles!sesi_pembelajaran_siswa_id_fkey(full_name), ' +
  'guruProfile:profiles!sesi_pembelajaran_guru_id_fkey(full_name)';

export function useAbsensiEntries({ showToast } = {}) {
  const [entries, setEntries] = useState([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [entriesError, setEntriesError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  const notifyError = useCallback(
    (message) => {
      if (showToast) showToast('error', message);
    },
    [showToast]
  );

  const loadEntries = useCallback(async () => {
    setLoadingEntries(true);
    setEntriesError('');
    const { data, error } = await supabase
      .from(TABLE)
      .select(SELECT_QUERY)
      .order('tanggal', { ascending: false });

    if (error) {
      setEntriesError('Gagal memuat data pertemuan: ' + error.message);
    } else {
      setEntries(data || []);
    }
    setLoadingEntries(false);
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const updateStatus = useCallback(
    async (id, newStatus) => {
      setUpdatingId(id);
      let prevEntries;
      setEntries((prev) => {
        prevEntries = prev;
        return prev.map((e) => (e.id === id ? { ...e, status: newStatus } : e));
      });
      const { error } = await checkedUpdate(supabase.from(TABLE).update({ status: newStatus }).eq('id', id));
      if (error) {
        setEntries(prevEntries);
        notifyError('Gagal mengubah status: ' + error.message);
      }
      setUpdatingId(null);
      return { error };
    },
    [notifyError]
  );

  const updateDate = useCallback(
    async (id, newDate) => {
      if (!id || !newDate) return { error: null };
      setUpdatingId(id);
      let prevEntries;
      setEntries((prev) => {
        prevEntries = prev;
        return prev.map((e) => (e.id === id ? { ...e, tanggal: newDate } : e));
      });
      const { error } = await checkedUpdate(supabase.from(TABLE).update({ tanggal: newDate }).eq('id', id));
      if (error) {
        setEntries(prevEntries);
        notifyError('Gagal update tanggal: ' + error.message);
      }
      setUpdatingId(null);
      return { error };
    },
    [notifyError]
  );

  const deleteEntry = useCallback(
    async (id) => {
      if (!id) return { error: null };
      setUpdatingId(id);
      let prevEntries;
      setEntries((prev) => {
        prevEntries = prev;
        return prev.filter((e) => e.id !== id);
      });
      const { error } = await supabase.from(TABLE).delete().eq('id', id);
      if (error) {
        setEntries(prevEntries);
        notifyError('Gagal menghapus pertemuan: ' + error.message);
      }
      setUpdatingId(null);
      return { error };
    },
    [notifyError]
  );

  return {
    entries,
    loadingEntries,
    entriesError,
    updatingId,
    reloadEntries: loadEntries,
    updateStatus,
    updateDate,
    deleteEntry,
  };
}
