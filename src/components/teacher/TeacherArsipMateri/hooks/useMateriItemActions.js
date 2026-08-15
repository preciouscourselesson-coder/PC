import { useState } from 'react';
import { supabase } from '../../../../supabaseClient';
import { checkedUpdate } from '../../../../utils/supabaseUpdateGuard';

// Mengelola aksi terhadap satu item materi (arsipkan/pulihkan, hapus, edit),
// termasuk state modal edit & konfirmasi hapus yang menyertainya.
export const useMateriItemActions = ({ showToast, fetchMateri }) => {
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const handleArchiveToggle = async (item) => {
    const nextStatus = item.status === 'Diarsipkan' ? 'Dipublish' : 'Diarsipkan';
    const { error } = await checkedUpdate(
      supabase
        .from('materi_file')
        .update({ status: nextStatus })
        .eq('id', item.id)
    );
    if (error) { showToast('error', 'Gagal mengubah status: ' + error.message); return; }
    fetchMateri();
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    const { error } = await supabase.from('materi_file').delete().eq('id', deleteItem.id);
    if (error) { showToast('error', 'Gagal menghapus: ' + error.message); return; }
    setDeleteItem(null);
    fetchMateri();
  };

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
          mapel: editItem.mapel,
          bab: editItem.bab,
          sub_bab: editItem.sub_bab || null,
          status: editItem.status,
          folder_id: editItem.folder_id || null,
          pengajar: editItem.kategori === 'Sekolah' ? (editItem.pengajar || null) : null,
          jenis: editItem.kategori === 'Sekolah' ? (editItem.jenis || null) : null,
        })
        .eq('id', editItem.id)
    );
    setSavingEdit(false);
    if (error) { showToast('error', 'Gagal menyimpan: ' + error.message); return; }
    setEditItem(null);
    fetchMateri();
  };

  return {
    editItem,
    setEditItem,
    deleteItem,
    setDeleteItem,
    savingEdit,
    handleArchiveToggle,
    handleDelete,
    handleSaveEdit,
  };
};
