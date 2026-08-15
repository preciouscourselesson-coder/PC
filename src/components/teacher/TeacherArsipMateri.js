import React, { useState, useEffect } from 'react';
import Toast, { useToast } from '../shared/Toast';
import { C } from '../shared/Theme';

import { KATEGORI_FILTER_OPTIONS, KATEGORI_FILTER_GROUPS } from './TeacherArsipMateri/constants';

import { useIsMobile } from './TeacherArsipMateri/hooks/useIsMobile';
import { useCurrentUserId } from './TeacherArsipMateri/hooks/useCurrentUserId';
import { useMateriList } from './TeacherArsipMateri/hooks/useMateriList';
import { useMateriFolders } from './TeacherArsipMateri/hooks/useMateriFolders';
import { useMateriItemActions } from './TeacherArsipMateri/hooks/useMateriItemActions';

import { SegmentedControl } from './TeacherArsipMateri/components/SegmentedControl';
import { FolderGrid } from './TeacherArsipMateri/components/FolderGrid';
import { MateriListSection } from './TeacherArsipMateri/components/MateriListSection';
import { NewMateriFolderModal } from './TeacherArsipMateri/components/NewMateriFolderModal';
import { DeleteFolderModal } from './TeacherArsipMateri/components/DeleteFolderModal';
import { RenameFolderModal } from './TeacherArsipMateri/components/RenameFolderModal';
import { StudentFolderConflictModal } from './TeacherArsipMateri/components/StudentFolderConflictModal';
import { EditMateriModal } from './TeacherArsipMateri/components/EditMateriModal';
import { DeleteMateriModal } from './TeacherArsipMateri/components/DeleteMateriModal';
import { TeacherUploadMateriModal } from './TeacherArsipMateri/components/TeacherUploadMateriModal';

/* ============================================================
   Komponen Utama: Arsip Materi

   File ini sengaja diletakkan DI LUAR folder TeacherArsipMateri/ —
   folder tersebut hanya berisi sub-komponen presentational dan custom
   hooks pendukungnya (lihat constants.js, utils.js, hooks/, components/).
   Tugas file ini murni menyusun (compose) semuanya, sehingga tiap bagian
   kecil bisa di-unit-test terpisah dari komponen utama.
   ============================================================ */

const TeacherArsipMateri = () => {
  const isMobile = useIsMobile();
  const userId = useCurrentUserId();
  const { toast, showToast } = useToast();

  const [activeTab, setActiveTab] = useState('Dipublish');
  const [search, setSearch] = useState('');
  // Kategori sumber materi yang sedang ditampilkan (folder tersimpan terpisah per kategori)
  const [filterKategori, setFilterKategori] = useState('Pribadi');
  // Folder yang sedang aktif dipilih pada grid folder: "all" | "none" | id folder_materi
  const [activeFolderId, setActiveFolderId] = useState('all');

  const { materiList, setMateriList, loading, errorMsg, fetchMateri } = useMateriList({
    userId, activeTab, filterKategori, search,
  });

  const {
    folderOptions,
    showNewFolderModal, setShowNewFolderModal,
    creatingFolder,
    deleteFolderTarget, setDeleteFolderTarget,
    renameFolderTarget, setRenameFolderTarget,
    savingRename,
    duplicateConflict, setDuplicateConflict,
    handleCreateFolder,
    handleDeleteFolder,
    handleRenameFolder,
  } = useMateriFolders({
    userId,
    filterKategori,
    onFolderDeleted: (folderId) => {
      // Materi yang tadinya ada di folder ini otomatis lepas ke "Tanpa Folder"
      // kalau FK folder_id sudah ON DELETE SET NULL; samakan juga di state
      // lokal supaya langsung terlihat tanpa fetch ulang.
      setMateriList(prev => prev.map(m => (m.folder_id === folderId ? { ...m, folder_id: null, folder_materi: null } : m)));
      if (activeFolderId === folderId) setActiveFolderId('all');
    },
    onFolderRenamed: (data) => {
      setMateriList(prev => prev.map(m => (
        m.folder_id === data.id ? { ...m, folder_materi: { id: data.id, nama: data.nama } } : m
      )));
    },
    onError: (msg) => showToast('error', msg),
  });

  const {
    editItem, setEditItem,
    deleteItem, setDeleteItem,
    savingEdit,
    handleArchiveToggle,
    handleDelete,
    handleSaveEdit,
  } = useMateriItemActions({ showToast, fetchMateri });

  // Ganti kategori atau tab publish/draft/arsip -> kembali ke "Semua Materi"
  // supaya tidak nyangkut di folder yang mungkin tidak relevan lagi.
  useEffect(() => { setActiveFolderId('all'); }, [filterKategori, activeTab]);

  // Materi yang benar-benar ditampilkan, disaring lagi berdasarkan folder yang
  // aktif dipilih pada grid folder (mirip pola client-side filtering di
  // Dashboard TeacherHomework).
  const displayedMateri = materiList.filter(item => {
    if (activeFolderId === 'all') return true;
    if (activeFolderId === 'none') return !item.folder_id;
    return item.folder_id === activeFolderId;
  });

  // Folder milik kategori yang sedang aktif saja. Untuk tab "Bersama", folder
  // 'Sekolah' ikut ditampilkan (folder 'Request' tidak pernah ada -- lihat
  // catatan di resolveKategoriForFolder).
  const foldersForKategori = folderOptions.filter(f => (KATEGORI_FILTER_GROUPS[filterKategori] || [filterKategori]).includes(f.kategori));
  const countInFolder = (folderId) => materiList.filter(m => m.folder_id === folderId).length;
  const countNoFolder = materiList.filter(m => !m.folder_id).length;

  return (
    <div style={{ fontFamily: 'inherit' }}>
      <Toast toast={toast} />
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '16px' : '24px', alignItems: 'flex-start', flexWrap: 'wrap' }}>

      {/* Kolom kiri: tabs, filter, tabel/kartu */}
      <div style={{ order: 1, flex: isMobile ? '1 1 100%' : '1 1 560px', minWidth: 0, width: isMobile ? '100%' : 'auto', boxSizing: 'border-box' }}>

      {/* Kategori sumber materi — menentukan set folder mana yang ditampilkan di grid.
          Pakai KATEGORI_FILTER_OPTIONS (termasuk "Request") karena ini cuma untuk menyaring
          tampilan, bukan untuk memilih kategori saat upload manual. */}
      <div style={{ marginBottom: '0.9rem' }}>
        <SegmentedControl
          options={KATEGORI_FILTER_OPTIONS}
          value={filterKategori}
          onChange={setFilterKategori}
        />
      </div>

      {/* Pencarian judul materi */}
      <div style={{ position: 'relative', marginBottom: '1rem' }}>
        <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: C.gray }}>🔍</span>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cari judul materi..."
          style={{
            width: '100%', padding: '10px 12px 10px 34px', borderRadius: '10px',
            border: `1.5px solid ${C.border}`, fontSize: '16px', fontFamily: 'inherit', boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Grid folder (gaya sama seperti "Tugas Saya"): klik kotak untuk menyaring materi per folder */}
      <FolderGrid
        isMobile={isMobile}
        totalCount={materiList.length}
        countNoFolder={countNoFolder}
        activeFolderId={activeFolderId}
        onSelectFolder={setActiveFolderId}
        folders={foldersForKategori}
        countInFolder={countInFolder}
        onDeleteFolder={setDeleteFolderTarget}
        onRenameFolder={setRenameFolderTarget}
        onAddFolder={() => setShowNewFolderModal(true)}
      />

      {/* Tabel (desktop) / Kartu (mobile) */}
      <MateriListSection
        isMobile={isMobile}
        loading={loading}
        errorMsg={errorMsg}
        items={displayedMateri}
        activeTab={activeTab}
        onView={(item) => window.open(item.url, '_blank')}
        onEdit={(item) => setEditItem({ ...item })}
        onArchive={handleArchiveToggle}
        onDelete={setDeleteItem}
      />

      </div>

      {/* Kolom kanan: form unggah materi */}
      <div style={{ order: 2, width: isMobile ? '100%' : '360px', flexShrink: 0, position: isMobile ? 'static' : 'sticky', top: 0, boxSizing: 'border-box' }}>
        <TeacherUploadMateriModal
          userId={userId}
          onUploaded={(uploadedStatus) => {
            setActiveTab(uploadedStatus);
            fetchMateri();
          }}
        />
      </div>

      </div>

      {/* Modal Folder Baru (dari grid folder) */}
      {showNewFolderModal && (
        <NewMateriFolderModal
          kategori={filterKategori}
          creating={creatingFolder}
          onCreate={handleCreateFolder}
          onClose={() => setShowNewFolderModal(false)}
        />
      )}

      {/* Modal Konfirmasi Hapus Folder */}
      {deleteFolderTarget && (
        <DeleteFolderModal
          target={deleteFolderTarget}
          isMobile={isMobile}
          onConfirm={handleDeleteFolder}
          onCancel={() => setDeleteFolderTarget(null)}
        />
      )}

      {/* Modal Ganti Nama Folder */}
      {renameFolderTarget && (
        <RenameFolderModal
          target={renameFolderTarget}
          isMobile={isMobile}
          saving={savingRename}
          onSave={handleRenameFolder}
          onClose={() => setRenameFolderTarget(null)}
        />
      )}

      {/* Modal konflik nama folder saat sinkronisasi folder-per-siswa */}
      {duplicateConflict && (
        <StudentFolderConflictModal
          conflict={duplicateConflict}
          onResolve={(decision) => {
            duplicateConflict.resolve(decision);
            setDuplicateConflict(null);
          }}
        />
      )}

      {/* Modal Edit */}
      {editItem && (
        <EditMateriModal
          editItem={editItem}
          setEditItem={setEditItem}
          folderOptions={folderOptions}
          isMobile={isMobile}
          savingEdit={savingEdit}
          onSave={handleSaveEdit}
          onClose={() => setEditItem(null)}
        />
      )}

      {/* Modal Konfirmasi Hapus */}
      {deleteItem && (
        <DeleteMateriModal
          item={deleteItem}
          isMobile={isMobile}
          onConfirm={handleDelete}
          onCancel={() => setDeleteItem(null)}
        />
      )}
    </div>
  );
};

export default TeacherArsipMateri;
