import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../../../../supabaseClient';
import { syncStudentFolders } from '../../../../utils/studentFolderSync';
import { resolveKategoriForFolder } from '../constants';

// Mengelola daftar folder materi milik guru: sinkronisasi folder otomatis
// per-siswa saat halaman dibuka, serta operasi buat/hapus/ganti nama folder
// dari grid folder. `onFolderDeleted` dan `onFolderRenamed` dipakai supaya
// hook ini bisa memberi tahu pemanggil (biasanya useMateriList) agar state
// materi lokal ikut disesuaikan tanpa perlu fetch ulang.
export const useMateriFolders = ({ userId, filterKategori, onFolderDeleted, onFolderRenamed, onError }) => {
  const [folderOptions, setFolderOptions] = useState([]);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState(null); // { id, nama }
  const [renameFolderTarget, setRenameFolderTarget] = useState(null); // { id, nama, siswa_id }
  const [savingRename, setSavingRename] = useState(false);
  // Konflik nama folder saat sinkronisasi folder-per-siswa: { student, existingFolder, resolve }
  const [duplicateConflict, setDuplicateConflict] = useState(null);

  // Ditanya oleh syncStudentFolders setiap kali ada nama folder yang bentrok
  // dengan siswa baru -- munculkan modal, lalu tunggu keputusan guru.
  const handleDuplicateConfirm = useCallback(({ student, existingFolder }) => (
    new Promise((resolve) => {
      setDuplicateConflict({ student, existingFolder, resolve });
    })
  ), []);

  const loadFolderOptions = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('folder_materi')
      .select('id, nama, kategori, siswa_id')
      .eq('user_id', userId)
      .order('nama', { ascending: true });
    setFolderOptions(data || []);
  }, [userId]);

  // Setiap halaman arsip dibuka: sinkronkan dulu folder otomatis per-siswa
  // (buat folder utk siswa baru yang belum punya, hapus folder siswa yang
  // sudah tidak ada di daftar siswa guru ini), baru muat ulang opsi folder.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      await syncStudentFolders(userId, { onDuplicateConfirm: handleDuplicateConfirm });
      if (cancelled) return;
      await loadFolderOptions();
    })();
    return () => { cancelled = true; };
  }, [userId, handleDuplicateConfirm, loadFolderOptions]);

  const handleCreateFolder = async (nama) => {
    setCreatingFolder(true);
    try {
      const { data, error } = await supabase
        .from('folder_materi')
        .insert({ user_id: userId, nama, kategori: resolveKategoriForFolder(filterKategori) })
        .select('id, nama, kategori, siswa_id')
        .single();
      if (error) throw error;
      setFolderOptions(prev => [...prev, data].sort((a, b) => a.nama.localeCompare(b.nama)));
      setShowNewFolderModal(false);
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleDeleteFolder = async () => {
    if (!deleteFolderTarget) return;
    try {
      const { error } = await supabase.from('folder_materi').delete().eq('id', deleteFolderTarget.id);
      if (error) throw error;
      setFolderOptions(prev => prev.filter(f => f.id !== deleteFolderTarget.id));
      onFolderDeleted?.(deleteFolderTarget.id);
      setDeleteFolderTarget(null);
    } catch (err) {
      onError?.('Gagal menghapus folder: ' + err.message);
    }
  };

  // Ganti nama folder (berlaku utk folder manual maupun folder otomatis
  // siswa). Karena keterkaitan ke siswa disimpan lewat kolom siswa_id (bukan
  // nama), rename di sini AMAN dan tidak memutus folder dari siswanya.
  const handleRenameFolder = async (namaBaru) => {
    if (!renameFolderTarget) return;
    setSavingRename(true);
    try {
      const { data, error } = await supabase
        .from('folder_materi')
        .update({ nama: namaBaru })
        .eq('id', renameFolderTarget.id)
        .select('id, nama, kategori, siswa_id')
        .single();
      if (error) throw error;
      setFolderOptions(prev => prev.map(f => (f.id === data.id ? data : f)).sort((a, b) => a.nama.localeCompare(b.nama)));
      onFolderRenamed?.(data);
      setRenameFolderTarget(null);
    } finally {
      setSavingRename(false);
    }
  };

  return {
    folderOptions,
    showNewFolderModal,
    setShowNewFolderModal,
    creatingFolder,
    deleteFolderTarget,
    setDeleteFolderTarget,
    renameFolderTarget,
    setRenameFolderTarget,
    savingRename,
    duplicateConflict,
    setDuplicateConflict,
    handleCreateFolder,
    handleDeleteFolder,
    handleRenameFolder,
  };
};
