import React, { useState } from 'react';

import { C } from './AdminPengaturanMateri/theme';

import { useToast } from './AdminPengaturanMateri/hooks/useToast';
import { useMateriSourcesData } from './AdminPengaturanMateri/hooks/useMateriSourcesData';
import { useMateriGuru } from './AdminPengaturanMateri/hooks/useMateriGuru';
import { useSesiPembelajaran } from './AdminPengaturanMateri/hooks/useSesiPembelajaran';
import { useBankSoal } from './AdminPengaturanMateri/hooks/useBankSoal';
import { useDeleteItem } from './AdminPengaturanMateri/hooks/useDeleteItem';
import { useExportExcel } from './AdminPengaturanMateri/hooks/useExportExcel';

import { Toast } from './AdminPengaturanMateri/components/Toast';
import { SourceTabBar } from './AdminPengaturanMateri/components/SourceTabBar';
import { MateriGuruTab } from './AdminPengaturanMateri/components/MateriGuruTab';
import { SesiPembelajaranTab } from './AdminPengaturanMateri/components/SesiPembelajaranTab';
import { BankSoalTab } from './AdminPengaturanMateri/components/BankSoalTab';
import { EditMateriModal } from './AdminPengaturanMateri/components/EditMateriModal';
import { DeleteConfirmModal } from './AdminPengaturanMateri/components/DeleteConfirmModal';

// ─────────────────────────────────────────────────────────────────────────
// AdminPengaturanMateri — komponen "orkestrator".
//
// File ini sengaja diletakkan DI LUAR folder ./AdminPengaturanMateri/, yang
// berisi seluruh sub-komponen presentational (./AdminPengaturanMateri/components)
// dan custom hooks pembawa state/logika bisnis (./AdminPengaturanMateri/hooks).
//
// Tanggung jawab file ini murni: memanggil hooks, lalu merangkai hasilnya
// menjadi props untuk sub-komponen. Tidak ada logika bisnis atau markup
// tabel di sini, sehingga setiap bagian bisa di-unit-test secara terpisah:
//   - hooks (useMateriGuru, useSesiPembelajaran, dst) diuji tanpa perlu render UI
//   - komponen tab (MateriGuruTab, dst) diuji dengan me-render props dummy
// ─────────────────────────────────────────────────────────────────────────
const AdminPengaturanMateri = () => {
  const [activeSource, setActiveSource] = useState('materi'); // 'materi' | 'sesi' | 'bank'

  const { toast, showError, showSuccess } = useToast();

  const {
    loading, profilesMap,
    rows, setRows, materiError, babList,
    sesiRows, setSesiRows, sesiError,
    bankRows, setBankRows, bankError,
    refetch,
  } = useMateriSourcesData();

  const materi = useMateriGuru({ rows, setRows, babList, showError, showSuccess, refetch });
  const sesi = useSesiPembelajaran({ sesiRows, setSesiRows, profilesMap, showError, showSuccess });
  const bank = useBankSoal({ bankRows, profilesMap });

  const {
    deleteItem, setDeleteItem, handleDeleteConfirmed, deleteItemLabel,
  } = useDeleteItem({
    setRows, setSesiRows, setBankRows,
    setMateriBusyId: materi.setBusyId,
    setSesiBusyId: sesi.setBusyId,
    setBankBusyId: bank.setBusyId,
    showError, showSuccess,
  });

  const { handleDownloadAll } = useExportExcel({
    activeSource,
    rows,
    sesiRows, sesiEnriched: sesi.enriched,
    bankRows, bankEnriched: bank.enriched,
    showError, showSuccess,
  });

  // ── Reset & Download mengikuti tab sumber yang sedang aktif ────────────
  const handleReset = () => {
    if (activeSource === 'materi') materi.resetFilters();
    else if (activeSource === 'sesi') sesi.resetFilters();
    else bank.resetFilters();
  };

  const headerSubtitle = activeSource === 'materi'
    ? 'Kelola seluruh materi yang diunggah oleh semua guru.'
    : activeSource === 'sesi'
      ? 'Tinjau & setujui bukti sesi pembelajaran yang diunggah guru per siswa.'
      : 'Kelola bank soal (ulangan/PH & tugas) yang diunggah siswa.';

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '1.2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.7rem', fontWeight: 'bold', color: C.dark, margin: '0 0 6px' }}>Pengaturan Materi</h1>
          <p style={{ color: C.gray, fontSize: '0.92rem', margin: 0 }}>{headerSubtitle}</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleReset}
            style={{ padding: '9px 16px', borderRadius: '10px', border: `1.5px solid ${C.border}`, background: C.white, color: C.gray, fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            ⟲ Reset
          </button>
          <button
            onClick={handleDownloadAll}
            style={{ padding: '9px 16px', borderRadius: '10px', border: 'none', background: C.gold, color: C.white, fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            ⬇ Simpan
          </button>
        </div>
      </div>

      <Toast toast={toast} />

      {/* Tab sumber data */}
      <SourceTabBar active={activeSource} onChange={setActiveSource} />

      {/* ══════════════════════════ MATERI GURU ══════════════════════════ */}
      {activeSource === 'materi' && (
        <MateriGuruTab
          search={materi.search} onSearchChange={materi.setSearch}
          mapelFilter={materi.mapelFilter} onMapelFilterChange={materi.setMapelFilter} mapelOptions={materi.mapelOptions}
          guruFilter={materi.guruFilter} onGuruFilterChange={materi.setGuruFilter} guruOptions={materi.guruOptions}
          kelasFilter={materi.kelasFilter} onKelasFilterChange={materi.setKelasFilter} kelasOptions={materi.kelasOptions}
          statusFilter={materi.statusFilter} onStatusFilterChange={materi.setStatusFilter}
          materiCounts={materi.materiCounts}
          materiError={materiError}
          loading={loading}
          page={materi.page}
          materiPageRows={materi.materiPageRows}
          materiTotalPages={materi.materiTotalPages}
          filteredCount={materi.filteredRows.length}
          onPrevPage={() => materi.setPage(p => Math.max(1, p - 1))}
          onNextPage={() => materi.setPage(p => Math.min(materi.materiTotalPages, p + 1))}
          busyId={materi.busyId}
          onArchiveToggle={materi.handleArchiveToggle}
          onEdit={materi.startEdit}
          onDelete={(item) => setDeleteItem({ source: 'materi', item })}
        />
      )}

      {/* ══════════════════════════ SESI PEMBELAJARAN ══════════════════════════ */}
      {activeSource === 'sesi' && (
        <SesiPembelajaranTab
          search={sesi.search} onSearchChange={sesi.setSearch}
          siswaFilter={sesi.siswaFilter} onSiswaFilterChange={sesi.setSiswaFilter} siswaOptions={sesi.siswaOptions}
          statusFilter={sesi.statusFilter} onStatusFilterChange={sesi.setStatusFilter}
          counts={sesi.counts}
          sesiError={sesiError}
          loading={loading}
          page={sesi.page}
          pageRows={sesi.pageRows}
          totalPages={sesi.totalPages}
          filteredCount={sesi.filteredRows.length}
          onPrevPage={() => sesi.setPage(p => Math.max(1, p - 1))}
          onNextPage={() => sesi.setPage(p => Math.min(sesi.totalPages, p + 1))}
          busyId={sesi.busyId}
          onStatusChange={sesi.handleStatusChange}
          onDelete={(item) => setDeleteItem({ source: 'sesi', item })}
        />
      )}

      {/* ══════════════════════════ BANK SOAL SISWA ══════════════════════════ */}
      {activeSource === 'bank' && (
        <BankSoalTab
          search={bank.search} onSearchChange={bank.setSearch}
          siswaFilter={bank.siswaFilter} onSiswaFilterChange={bank.setSiswaFilter} siswaOptions={bank.siswaOptions}
          jenisFilter={bank.jenisFilter} onJenisFilterChange={bank.setJenisFilter}
          counts={bank.counts}
          bankError={bankError}
          loading={loading}
          page={bank.page}
          pageRows={bank.pageRows}
          totalPages={bank.totalPages}
          filteredCount={bank.filteredRows.length}
          onPrevPage={() => bank.setPage(p => Math.max(1, p - 1))}
          onNextPage={() => bank.setPage(p => Math.min(bank.totalPages, p + 1))}
          busyId={bank.busyId}
          onDelete={(item) => setDeleteItem({ source: 'bank', item })}
        />
      )}

      {/* Modal Edit (khusus Materi Guru) */}
      <EditMateriModal
        editItem={materi.editItem}
        setEditItem={materi.setEditItem}
        editBabOptions={materi.editBabOptions}
        savingEdit={materi.savingEdit}
        onSave={materi.handleSaveEdit}
      />

      {/* Modal Konfirmasi Hapus (generik untuk 3 sumber) */}
      <DeleteConfirmModal
        deleteItem={deleteItem}
        setDeleteItem={setDeleteItem}
        deleteItemLabel={deleteItemLabel}
        onConfirm={handleDeleteConfirmed}
      />
    </div>
  );
};

export default AdminPengaturanMateri;
