import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
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
  const location = useLocation();
  // Dikirim dari MateriRequestSection/KirimMateriModal (TeacherHome.js) saat
  // guru klik "Upload dulu di Arsip Materi ->" untuk menjawab request siswa.
  const navStatePrefill = location.state?.prefill || null;
  const appliedNavStateRef = useRef(false);

  const [activeTab, setActiveTab] = useState('Dipublish');
  const [search, setSearch] = useState('');
  // Kategori sumber materi yang sedang ditampilkan (folder tersimpan terpisah per kategori)
  const [filterKategori, setFilterKategori] = useState(location.state?.filterKategori || 'Pribadi');
  // Folder yang sedang aktif dipilih pada grid folder: "all" | "none" | id folder_materi
  const [activeFolderId, setActiveFolderId] = useState('all');
  // Di mobile, form unggah materi disembunyikan di balik tombol mengambang (+)
  // dan dibuka sebagai bottom-sheet, supaya user tidak perlu scroll lewat
  // seluruh daftar materi dulu untuk sampai ke form upload.
  const [showUploadSheet, setShowUploadSheet] = useState(false);

  // Kunci scroll body selagi bottom-sheet upload terbuka di mobile.
  useEffect(() => {
    if (isMobile && showUploadSheet) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prevOverflow; };
    }
  }, [isMobile, showUploadSheet]);

  // Datang dari "Kirim Materi" (Materi Request) lewat navigate(..., { state }):
  // filterKategori sudah di-set di useState di atas, di sini tinggal buka
  // bottom-sheet upload kalau di mobile (desktop form-nya sudah selalu
  // terlihat di kolom kanan). Hanya dijalankan sekali per kunjungan halaman
  // supaya tidak memaksa sheet terbuka lagi kalau user sudah menutupnya
  // manual lalu berganti kategori/folder.
  useEffect(() => {
    if (appliedNavStateRef.current || !location.state) return;
    if (location.state.openUpload && isMobile) setShowUploadSheet(true);
    appliedNavStateRef.current = true;
  }, [location.state, isMobile]);

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
      <div style={{
        order: 1, flex: isMobile ? '1 1 100%' : '1 1 560px', minWidth: 0,
        width: isMobile ? '100%' : 'auto', boxSizing: 'border-box',
        // Ruang ekstra di bawah supaya item terakhir daftar tidak ketutup FAB (+)
        paddingBottom: isMobile ? '84px' : 0,
      }}>

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
            width: '100%', padding: isMobile ? '12px 12px 12px 36px' : '10px 12px 10px 34px',
            borderRadius: '10px', border: `1.5px solid ${C.border}`, fontSize: '16px',
            fontFamily: 'inherit', boxSizing: 'border-box',
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
        onDelete={setDeleteItem}
      />

      </div>

      {/* Kolom kanan: form unggah materi — hanya dirender di desktop.
          Di mobile, form yang sama dipindah ke bottom-sheet lewat FAB (+)
          di bawah supaya tidak menyita ruang & tidak menghalangi daftar. */}
      {!isMobile && (
        <div style={{ order: 2, width: '360px', flexShrink: 0, position: 'sticky', top: 0, boxSizing: 'border-box' }}>
          <TeacherUploadMateriModal
            userId={userId}
            prefill={navStatePrefill}
            onUploaded={(uploadedStatus) => {
              setActiveTab(uploadedStatus);
              fetchMateri();
            }}
          />
        </div>
      )}

      </div>

      {/* Tombol mengambang (+) khusus mobile untuk membuka form unggah materi */}
      {isMobile && (
        <button
          type="button"
          aria-label="Unggah materi baru"
          onClick={() => setShowUploadSheet(true)}
          style={{
            position: 'fixed',
            right: '16px',
            bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            border: 'none',
            background: C.primary || '#2563EB',
            color: '#fff',
            fontSize: '28px',
            lineHeight: '56px',
            textAlign: 'center',
            boxShadow: '0 4px 14px rgba(0,0,0,0.28)',
            cursor: 'pointer',
            zIndex: 1000,
          }}
        >
          +
        </button>
      )}

      {/* Bottom-sheet mobile berisi form unggah materi */}
      {isMobile && showUploadSheet && (
        <div
          onClick={() => setShowUploadSheet(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
            zIndex: 1100, display: 'flex', alignItems: 'flex-end',
            animation: 'arsipMateriFadeIn 0.18s ease-out',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxHeight: '88vh', overflowY: 'auto',
              background: '#fff', borderRadius: '20px 20px 0 0',
              padding: '10px 16px calc(20px + env(safe-area-inset-bottom, 0px))',
              boxSizing: 'border-box', boxShadow: '0 -6px 24px rgba(0,0,0,0.2)',
              animation: 'arsipMateriSlideUp 0.22s ease-out',
            }}
          >
            {/* Drag handle (visual saja) */}
            <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: C.border, margin: '2px auto 12px' }} />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '16px', fontWeight: 600 }}>Unggah Materi Baru</span>
              <button
                type="button"
                aria-label="Tutup"
                onClick={() => setShowUploadSheet(false)}
                style={{
                  width: '32px', height: '32px', borderRadius: '50%', border: `1.5px solid ${C.border}`,
                  background: '#fff', fontSize: '16px', lineHeight: '1', cursor: 'pointer', color: C.gray,
                }}
              >
                ✕
              </button>
            </div>

            <TeacherUploadMateriModal
              userId={userId}
              prefill={navStatePrefill}
              onUploaded={(uploadedStatus) => {
                setActiveTab(uploadedStatus);
                fetchMateri();
                setShowUploadSheet(false);
              }}
            />
          </div>

          <style>{`
            @keyframes arsipMateriFadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes arsipMateriSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
          `}</style>
        </div>
      )}

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