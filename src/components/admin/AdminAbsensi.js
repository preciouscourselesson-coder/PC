// src/components/admin/AdminAbsensi.js
//
// Versi refactor. Komponen ini sekarang HANYA menggabungkan (compose)
// hooks + sub-komponen dari folder adminAbsensi/ -- tidak ada lagi logic
// fetch/filter/format besar yang nyampur di sini. Untuk detail logic,
// lihat masing-masing file use-*.js; untuk detail tampilan, lihat
// masing-masing file komponen di folder adminAbsensi/.
import React, { useState, useRef } from 'react';
import Toast, { useToast } from '../../components/Toast';
import { C } from '../Theme';

import { useIsMobile } from './adminAbsensi/use-is-mobile';
import { useMasterData } from './adminAbsensi/use-master-data';
import { useAbsensiEntries } from './adminAbsensi/use-absensi-entries';
import { useEntriesFilter } from './adminAbsensi/use-entries-filter';
import { useRekapSummary } from './adminAbsensi/use-rekap-summary';
import { useRekapSiswa } from './adminAbsensi/use-rekap-siswa';

import StatCard from './adminAbsensi/stat-card';
import RekapSummaryTable from './adminAbsensi/rekap-summary-table';
import FilterBar from './adminAbsensi/filter-bar';
import EntriesTableDesktop from './adminAbsensi/entries-table-desktop';
import EntriesCardsMobile from './adminAbsensi/entries-cards-mobile';
import EditDateModal from './adminAbsensi/edit-date-modal';
import DeleteConfirmModal from './adminAbsensi/delete-confirm-modal';
import RekapSiswaModal from './adminAbsensi/rekap-siswa-modal';

const AdminAbsensi = () => {
  const isMobile = useIsMobile();
  const { toast, showToast } = useToast();

  const { guruList, studentList, loadingMasters } = useMasterData();
  const {
    entries, loadingEntries, entriesError, updatingId,
    updateStatus, updateDate, deleteEntry,
  } = useAbsensiEntries({ showToast });

  const {
    filterGuru, setFilterGuru,
    filterSiswa, setFilterSiswa,
    filterBulan, setFilterBulan,
    filterStatus, setFilterStatus,
    search, setSearch,
    bulanOptions, filteredEntries, hasActiveFilters, resetFilters,
  } = useEntriesFilter(entries);

  const { rekapPerGuru, rekapPerSiswa, totals } = useRekapSummary(entries, guruList, studentList);

  const rekap = useRekapSiswa({ studentList, showToast });
  const rekapRef = useRef();

  // ----- UI state lokal (menu & modal) -----
  const [openMenuId, setOpenMenuId] = useState(null);
  const [rekapTab, setRekapTab] = useState('guru');

  const [showEditDateModal, setShowEditDateModal] = useState(false);
  const [editDateId, setEditDateId] = useState(null);
  const [editDateValue, setEditDateValue] = useState('');

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const handleToggleMenu = (id) => setOpenMenuId((prev) => (prev === id ? null : id));

  const handleUpdateStatus = async (id, newStatus) => {
    setOpenMenuId(null);
    await updateStatus(id, newStatus);
  };

  const openEditDateModal = (id, currentDate) => {
    setEditDateId(id);
    setEditDateValue(currentDate);
    setShowEditDateModal(true);
    setOpenMenuId(null);
  };

  const closeEditDateModal = () => {
    setShowEditDateModal(false);
    setEditDateId(null);
    setEditDateValue('');
  };

  const handleSaveEditDate = async () => {
    const { error } = await updateDate(editDateId, editDateValue);
    if (!error) closeEditDateModal();
  };

  const openDeleteModal = (id) => {
    setDeleteId(id);
    setShowDeleteModal(true);
    setOpenMenuId(null);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setDeleteId(null);
  };

  const handleConfirmDelete = async () => {
    const { error } = await deleteEntry(deleteId);
    if (!error) closeDeleteModal();
  };

  const rekapRows = rekapTab === 'guru' ? rekapPerGuru : rekapPerSiswa;
  const handleRekapRowClick = (row) => {
    if (rekapTab === 'guru') setFilterGuru(row.id);
    else setFilterSiswa(row.id);
  };

  return (
    <div style={{ maxWidth: '1300px', margin: '0 auto', fontFamily: 'inherit' }}>
      <div style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: C.dark }}>Monitoring Pertemuan</h2>
        <p style={{ margin: '4px 0 0', color: C.gray, fontSize: '0.88rem' }}>
          Pantau pertemuan yang dilaporkan oleh setiap guru dan yang diikuti tiap siswa.
        </p>
      </div>

      <Toast toast={toast} />

      <div style={{ display: 'flex', gap: '0.9rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <StatCard label="Total Pertemuan" value={totals.totalPertemuan} />
        <StatCard label="Guru Aktif" value={totals.guruAktifCount} fg={C.goldDark} />
        <StatCard label="Siswa Aktif" value={totals.siswaAktifCount} fg={C.blue} bg={C.blueBg} />
        <StatCard label="Menunggu Persetujuan" value={totals.totalMenunggu} fg={C.amber} bg={C.amberBg} />
        <StatCard label="Disetujui" value={totals.totalDisetujui} fg={C.green} bg={C.greenBg} />
        <StatCard label="Ditolak" value={totals.totalDitolak} fg={C.red} bg={C.redBg} />
      </div>

      {entriesError && (
        <div style={{ background: C.redBg, color: C.red, padding: '10px 14px', borderRadius: '10px', marginBottom: '1rem', fontSize: '0.85rem' }}>
          {entriesError}
        </div>
      )}

      <RekapSummaryTable
        rekapTab={rekapTab}
        onChangeTab={setRekapTab}
        rows={rekapRows}
        loading={loadingMasters || loadingEntries}
        onRowClick={handleRekapRowClick}
      />

      <FilterBar
        filterGuru={filterGuru} setFilterGuru={setFilterGuru}
        filterSiswa={filterSiswa} setFilterSiswa={setFilterSiswa}
        filterBulan={filterBulan} setFilterBulan={setFilterBulan}
        filterStatus={filterStatus} setFilterStatus={setFilterStatus}
        search={search} setSearch={setSearch}
        guruList={guruList} studentList={studentList} bulanOptions={bulanOptions}
        hasActiveFilters={hasActiveFilters}
        onReset={resetFilters}
        onOpenRekap={rekap.openRekapModal}
      />

      <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '14px', overflow: 'hidden' }}>
        {isMobile ? (
          <EntriesCardsMobile
            loadingEntries={loadingEntries}
            filteredEntries={filteredEntries}
            updatingId={updatingId}
            onUpdateStatus={handleUpdateStatus}
            onOpenDelete={openDeleteModal}
          />
        ) : (
          <EntriesTableDesktop
            loadingEntries={loadingEntries}
            filteredEntries={filteredEntries}
            updatingId={updatingId}
            openMenuId={openMenuId}
            onToggleMenu={handleToggleMenu}
            onUpdateStatus={handleUpdateStatus}
            onOpenEditDate={openEditDateModal}
            onOpenDelete={openDeleteModal}
          />
        )}
      </div>

      <EditDateModal
        show={showEditDateModal}
        value={editDateValue}
        onChange={setEditDateValue}
        onCancel={closeEditDateModal}
        onSave={handleSaveEditDate}
        saving={updatingId === editDateId}
      />

      <DeleteConfirmModal
        show={showDeleteModal}
        onCancel={closeDeleteModal}
        onConfirm={handleConfirmDelete}
        deleting={updatingId === deleteId}
      />

      <RekapSiswaModal
        show={rekap.showRekapModal}
        onClose={rekap.closeRekapModal}
        studentList={studentList}
        rekapSiswaId={rekap.rekapSiswaId} setRekapSiswaId={rekap.setRekapSiswaId}
        rekapBulan={rekap.rekapBulan} setRekapBulan={rekap.setRekapBulan}
        onLoadRekap={rekap.loadRekap}
        loadingRekap={rekap.loadingRekap}
        rekapData={rekap.rekapData}
        groupedByGuru={rekap.groupedByGuru}
        siswaName={rekap.siswaName}
        onDownloadPdf={rekap.downloadPdf}
        rekapRef={rekapRef}
      />
    </div>
  );
};

export default AdminAbsensi;
