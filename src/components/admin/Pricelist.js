import React from 'react';
import Toast, { useToast } from '../../components/Toast';
import { C } from './Pricelist/constants';

import { useAdmin } from './Pricelist/hooks/useAdmin';
import { usePricelistItems } from './Pricelist/hooks/usePricelistItems';
import { useRiwayat } from './Pricelist/hooks/useRiwayat';
import { useFilters } from './Pricelist/hooks/useFilters';
import { usePricelistForm } from './Pricelist/hooks/usePricelistForm';
import { useDeleteItem } from './Pricelist/hooks/useDeleteItem';
import { useImportExport } from './Pricelist/hooks/useImportExport';

import Toolbar from './Pricelist/components/Toolbar';
import ImportSummaryBanner from './Pricelist/components/ImportSummaryBanner';
import FilterBar from './Pricelist/components/FilterBar';
import PricelistTable from './Pricelist/components/PricelistTable';
import Pagination from './Pricelist/components/Pagination';
import PricelistForm from './Pricelist/components/PricelistForm';
import PricelistDetail from './Pricelist/components/PricelistDetail';
import DeleteConfirmModal from './Pricelist/components/DeleteConfirmModal';

const Pricelist = () => {
  const { toast, showToast } = useToast();
  const { adminId, adminNama } = useAdmin();

  const { items, setItems, loadingItems, itemsError, loadItems } = usePricelistItems();
  const { selectedId, setSelectedId, riwayat, loadingRiwayat, loadRiwayat } = useRiwayat();
  const selectedItem = items.find((i) => i.id === selectedId) || null;

  const {
    search, setSearch,
    filterKelas, setFilterKelas,
    filterStatus, setFilterStatus,
    setPage,
    filteredItems, totalPages, safePage, pageItems, rangeStart, rangeEnd,
  } = useFilters(items);

  const {
    form, setField, formRef,
    editingId, formErrors,
    saving, saveError, justSaved,
    resetForm, handleEdit, handleDuplikasi, handleSubmit,
  } = usePricelistForm({ adminId, adminNama, items, loadItems, selectedId, loadRiwayat });

  const { deleteTarget, setDeleteTarget, deleting, confirmDelete } = useDeleteItem({
    setItems,
    selectedId,
    setSelectedId,
    editingId,
    resetForm,
    showToast,
  });

  const {
    importing, importSummary, exporting, importInputRef,
    handleDownloadTemplate, handleExport, handleImportFile,
  } = useImportExport({ adminId, adminNama, filteredItems, loadItems });

  const handleView = (item) => setSelectedId(item.id);

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', fontFamily: 'inherit' }}>
      <Toast toast={toast} />

      {/* Kartu Tabel */}
      <div style={{ background: C.white, borderRadius: '16px', border: `1.5px solid ${C.border}`, padding: '1.5rem', marginBottom: '1.5rem' }}>
        <Toolbar
          importing={importing}
          exporting={exporting}
          hasFilteredItems={filteredItems.length > 0}
          importInputRef={importInputRef}
          onDownloadTemplate={handleDownloadTemplate}
          onImportFile={handleImportFile}
          onExport={handleExport}
        />

        <ImportSummaryBanner importSummary={importSummary} />

        <FilterBar
          search={search}
          setSearch={setSearch}
          filterKelas={filterKelas}
          setFilterKelas={setFilterKelas}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
        />

        {itemsError && <div style={{ color: C.red, fontSize: '0.85rem', marginBottom: '1rem' }}>{itemsError}</div>}

        <PricelistTable
          pageItems={pageItems}
          loadingItems={loadingItems}
          rangeStart={rangeStart}
          onView={handleView}
          onEdit={handleEdit}
          onDeleteRequest={setDeleteTarget}
        />

        <Pagination
          safePage={safePage}
          totalPages={totalPages}
          setPage={setPage}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          totalCount={filteredItems.length}
        />
      </div>

      {/* Form Tambah/Edit + Detail, berdampingan */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
        <PricelistForm
          formRef={formRef}
          form={form}
          setField={setField}
          formErrors={formErrors}
          saving={saving}
          saveError={saveError}
          justSaved={justSaved}
          editingId={editingId}
          onSubmit={handleSubmit}
          onCancel={resetForm}
        />

        <PricelistDetail
          selectedItem={selectedItem}
          riwayat={riwayat}
          loadingRiwayat={loadingRiwayat}
          onDuplikasi={handleDuplikasi}
        />
      </div>

      <DeleteConfirmModal
        deleteTarget={deleteTarget}
        deleting={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
};

export default Pricelist;
