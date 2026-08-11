import { useState } from 'react';
import { supabase } from '../lib';

// Hapus generik untuk ketiga sumber data (materi_file, sesi_pembelajaran,
// bank_soal_siswa), termasuk pembersihan file terkait di Supabase Storage
// untuk sesi & bank soal. Dipakai lewat modal konfirmasi hapus yang sama
// untuk ketiga tab.
export const useDeleteItem = ({
  setRows, setSesiRows, setBankRows,
  setMateriBusyId, setSesiBusyId, setBankBusyId,
  showError, showSuccess,
}) => {
  const [deleteItem, setDeleteItem] = useState(null); // { source, item }

  const handleDeleteConfirmed = async () => {
    if (!deleteItem) return;
    const { source, item } = deleteItem;

    if (source === 'materi') {
      setMateriBusyId(item.id);
      const { error } = await supabase.from('materi_file').delete().eq('id', item.id);
      setMateriBusyId(null);
      if (error) { showError('Gagal menghapus: ' + error.message); setDeleteItem(null); return; }
      setRows(prev => prev.filter(r => r.id !== item.id));
      showSuccess(`"${item.nama}" telah dihapus.`);
    } else if (source === 'sesi') {
      setSesiBusyId(item.id);
      try {
        const marker = '/materi/';
        for (const url of (item.bukti_urls || [])) {
          const idx = url.indexOf(marker);
          if (idx !== -1) {
            const path = decodeURIComponent(url.slice(idx + marker.length));
            await supabase.storage.from('materi').remove([path]);
          }
        }
      } catch (e) {
        console.warn('Gagal hapus file bukti di storage:', e.message);
      }
      const { error } = await supabase.from('sesi_pembelajaran').delete().eq('id', item.id);
      setSesiBusyId(null);
      if (error) { showError('Gagal menghapus: ' + error.message); setDeleteItem(null); return; }
      setSesiRows(prev => prev.filter(r => r.id !== item.id));
      showSuccess(`Sesi "${item.judul_materi}" telah dihapus.`);
    } else if (source === 'bank') {
      setBankBusyId(item.id);
      try {
        const marker = '/bank-soal/';
        const idx = (item.file_url || '').indexOf(marker);
        if (idx !== -1) {
          const path = decodeURIComponent(item.file_url.slice(idx + marker.length));
          await supabase.storage.from('bank-soal').remove([path]);
        }
      } catch (e) {
        console.warn('Gagal hapus file di storage:', e.message);
      }
      const { error } = await supabase.from('bank_soal_siswa').delete().eq('id', item.id);
      setBankBusyId(null);
      if (error) { showError('Gagal menghapus: ' + error.message); setDeleteItem(null); return; }
      setBankRows(prev => prev.filter(r => r.id !== item.id));
      showSuccess(`"${item.judul}" telah dihapus.`);
    }
    setDeleteItem(null);
  };

  const deleteItemLabel = deleteItem
    ? (deleteItem.source === 'materi' ? deleteItem.item.nama
      : deleteItem.source === 'sesi' ? deleteItem.item.judul_materi
        : deleteItem.item.judul)
    : '';

  return { deleteItem, setDeleteItem, handleDeleteConfirmed, deleteItemLabel };
};

export default useDeleteItem;
