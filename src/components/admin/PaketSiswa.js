// src/components/admin/PaketSiswa.js
import React, { useState, useEffect } from 'react';
import InvoicePaketSiswa from './InvoicePaketSiswa';
import Toast, { useToast } from '../shared/Toast';
import { C } from '../shared/Theme';
import { usePaketSiswaData } from './paket-siswa/use-paket-siswa-data';
import FormTambahSiswa from './paket-siswa/form-tambah-siswa';
import PaketSiswaFilterBar from './paket-siswa/paket-siswa-filter-bar';
import PaketSiswaTable from './paket-siswa/paket-siswa-table';
import PaketSiswaDetailPanel from './paket-siswa/paket-siswa-detail-panel';
import { PAGE_SIZE } from './paket-siswa/paket-siswa-helpers';

const PaketSiswa = () => {
  const {
    loading, error, paketList, userRole, guruId, guruNama,
    loadPaketSiswa, deletePaket,
  } = usePaketSiswaData();

  const [selectedId, setSelectedId] = useState(null);
  const [editingItem, setEditingItem] = useState(null); // untuk edit
  const [invoiceItem, setInvoiceItem] = useState(null); // paket siswa yang sedang dibuatkan invoice
  const { toast, showToast } = useToast();

  const [search, setSearch] = useState('');
  const [filterKelas, setFilterKelas] = useState('Semua');
  const [filterStatus, setFilterStatus] = useState('Semua');
  const [filterDurasi, setFilterDurasi] = useState('Semua');
  const [filterPengajar, setFilterPengajar] = useState('Semua');
  const [page, setPage] = useState(1);

  // Filter
  const filtered = paketList.filter((item) => {
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const match =
        item.siswa_nama.toLowerCase().includes(q) ||
        item.siswa_id_display.toLowerCase().includes(q) ||
        item.paket.toLowerCase().includes(q) ||
        item.mapel.toLowerCase().includes(q);
      if (!match) return false;
    }
    if (filterKelas !== 'Semua' && item.kelas_siswa !== filterKelas) return false;
    if (filterStatus !== 'Semua' && item.status !== filterStatus) return false;
    if (filterDurasi !== 'Semua' && item.durasi !== filterDurasi) return false;
    if (filterPengajar !== 'Semua' && item.pengajar !== filterPengajar) return false;
    return true;
  });

  // Paginasi
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const rangeStart = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(safePage * PAGE_SIZE, filtered.length);
  const hasActiveFilter =
    !!search || filterKelas !== 'Semua' || filterStatus !== 'Semua' ||
    filterDurasi !== 'Semua' || filterPengajar !== 'Semua';

  useEffect(() => {
    setPage(1);
  }, [search, filterKelas, filterStatus, filterDurasi, filterPengajar]);

  const selectedItem = paketList.find((item) => item.id === selectedId) || null;

  // ========== CRUD HANDLERS ==========
  const handleEdit = (item) => {
    setEditingItem(item);
    // Scroll form ke tampilan (berguna terutama saat klik dari panel Detail di bawah tabel)
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Yakin ingin menghapus paket siswa ini?')) return;
    const { error: deleteError } = await deletePaket(id);
    if (deleteError) {
      showToast('error', 'Gagal menghapus: ' + deleteError.message);
      return;
    }
    if (selectedId === id) setSelectedId(null);
  };

  const handleModalSuccess = () => {
    loadPaketSiswa();
    setEditingItem(null);
  };

  const handleModalClose = () => {
    setEditingItem(null);
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', fontFamily: 'inherit' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: C.dark, margin: 0 }}>Paket Siswa</h1>
        <p style={{ fontSize: '0.85rem', color: C.gray, margin: '4px 0 0' }}>
          {userRole === 'admin'
            ? 'Daftar semua paket siswa'
            : guruNama
            ? `Daftar paket les untuk siswa ${guruNama}`
            : 'Daftar paket les'}
        </p>
      </div>

      <Toast toast={toast} />

      {/* Konten utama: tabel (kiri) + form tambah/edit paket (kanan) */}
      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: '1.5rem' }}>

      {/* Tabel */}
      <div
        style={{
          background: C.white,
          borderRadius: '16px',
          border: `1.5px solid ${C.border}`,
          padding: '1.5rem',
          flex: '1 1 640px',
          minWidth: 0,
          boxSizing: 'border-box',
        }}
      >
        <PaketSiswaFilterBar
          search={search} onSearchChange={setSearch}
          filterKelas={filterKelas} onFilterKelasChange={setFilterKelas}
          filterStatus={filterStatus} onFilterStatusChange={setFilterStatus}
          filterDurasi={filterDurasi} onFilterDurasiChange={setFilterDurasi}
          filterPengajar={filterPengajar} onFilterPengajarChange={setFilterPengajar}
        />

        {error && <div style={{ color: C.red, marginBottom: '1rem' }}>{error}</div>}

        <PaketSiswaTable
          loading={loading}
          pageItems={pageItems}
          rangeStart={rangeStart}
          hasActiveFilter={hasActiveFilter}
          onView={setSelectedId}
          onEdit={handleEdit}
          onDelete={handleDelete}
          page={safePage}
          totalPages={totalPages}
          rangeEnd={rangeEnd}
          filteredCount={filtered.length}
          onPageChange={setPage}
        />
      </div>

      {/* Form Tambah/Edit Paket Siswa (kolom kanan, selalu tampil) */}
      <div style={{ flex: '1 1 340px', minWidth: '300px', maxWidth: '400px', position: 'sticky', top: 0 }}>
        <FormTambahSiswa
          onSuccess={handleModalSuccess}
          onCancelEdit={handleModalClose}
          userRole={userRole}
          guruId={guruId}
          editingItem={editingItem}
          onError={(type, msg) => showToast(type, msg)}
        />
      </div>

      </div>

      {/* Detail Paket Siswa */}
      <PaketSiswaDetailPanel
        selectedItem={selectedItem}
        onEdit={handleEdit}
        onBayar={setInvoiceItem}
      />

      {invoiceItem && (
        <InvoicePaketSiswa item={invoiceItem} onClose={() => setInvoiceItem(null)} />
      )}

    </div>
  );
};

export default PaketSiswa;