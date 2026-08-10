import { useState } from 'react';
import { supabase } from '../../../../supabaseClient';
import { PRICELIST_TABLE } from '../constants';

// Kelola modal konfirmasi hapus & proses hapus item pricelist dari Supabase.
//
// Params:
// - setItems: updater dari usePricelistItems, dipakai untuk hapus item secara optimis dari list
// - selectedId, setSelectedId: agar detail ikut ditutup bila item yang dihapus sedang dilihat
// - editingId, resetForm: agar form ikut direset bila item yang dihapus sedang diedit
// - showToast: notifikasi error (dari komponen Toast)
export const useDeleteItem = ({ setItems, selectedId, setSelectedId, editingId, resetForm, showToast }) => {
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const id = deleteTarget.id;
    const { error } = await supabase.from(PRICELIST_TABLE).delete().eq('id', id);
    setDeleting(false);
    if (error) {
      showToast('error', 'Gagal menghapus: ' + error.message);
      return;
    }
    setDeleteTarget(null);
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (selectedId === id) setSelectedId(null);
    if (editingId === id) resetForm();
  };

  return { deleteTarget, setDeleteTarget, deleting, confirmDelete };
};
