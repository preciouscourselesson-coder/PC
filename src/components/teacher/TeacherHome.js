// src/components/teacher/TeacherHome.js
// Perbaikan:
// 1. Tampilan mobile: urutkan berdasarkan hari Senin–Minggu, lalu di dalamnya tampilkan slot jam
// 2. Pengajuan yang sudah disetujui admin (disetujui_admin) tidak ditampilkan
// 3. Status 'disetujui_menunggu_admin' tetap muncul, yang 'disetujui_admin' disembunyikan
import React from 'react';
import Toast, { useToast } from '../shared/Toast';
import { C } from './home/constants';
import { getGreeting, getTodayLongDate } from './home/utils/format';

import { useIsMobile } from './home/hooks/useIsMobile';
import { useTeacherHomeData } from './home/hooks/useTeacherHomeData';
import { usePengajuanJadwal } from './home/hooks/usePengajuanJadwal';
import { useMateriRequest } from './home/hooks/useMateriRequest';
import { useUjianPenilaian } from './home/hooks/useUjianPenilaian';

import { JadwalMingguCard } from './home/components/JadwalMingguCard';
import { PenilaianTerdekatCard } from './home/components/PenilaianTerdekatCard';
import { PengajuanJadwalCard } from './home/components/PengajuanJadwalCard';
import { PengingatPerubahanJadwal } from './home/components/PengingatPerubahanJadwal';
import { MateriRequestSection } from './home/components/MateriRequestSection';
import { UjianFormModal } from './home/components/UjianFormModal';
import { PengajuanJadwalFormModal } from './home/components/PengajuanJadwalFormModal';

const TeacherHome = () => {
  const isMobile = useIsMobile();
  const { toast, showToast } = useToast();

  const {
    loading,
    guru,
    jadwalList,
    studentNameMap,
    pengajuanMasuk,
    setPengajuanMasuk,
    pengajuanSaya,
    setPengajuanSaya,
    pengajuanRiwayatAdmin,
    setPengajuanRiwayatAdmin,
    materiRequestList,
    setMateriRequestList,
    ujianTerdekatList,
    mapelOptions,
    errorMsg,
    setErrorMsg,
    loadAll,
  } = useTeacherHomeData();

  const pengajuanJadwal = usePengajuanJadwal({
    guru,
    jadwalList,
    studentNameMap,
    pengajuanSaya,
    setPengajuanSaya,
    pengajuanMasuk,
    setPengajuanMasuk,
    pengajuanRiwayatAdmin,
    setPengajuanRiwayatAdmin,
    setErrorMsg,
    showToast,
    loadAll,
  });

  const materiRequest = useMateriRequest({
    materiRequestList,
    setMateriRequestList,
    setErrorMsg,
    showToast,
  });

  const ujianPenilaian = useUjianPenilaian({ guru, mapelOptions, setErrorMsg, showToast, loadAll });

  const greeting = getGreeting();
  const title = guru?.gender === 'L' ? 'Mr.' : guru?.gender === 'P' ? 'Ms.' : '';
  const dateStr = getTodayLongDate();

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', fontFamily: 'inherit' }}>
      <Toast toast={toast} style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 200, width: 'auto', maxWidth: '320px' }} />
      {/* Sapaan */}
      <div style={{ marginBottom: isMobile ? '1rem' : '1.5rem' }}>
        <h1 style={{ fontSize: isMobile ? '1.3rem' : '1.8rem', fontWeight: '700', color: C.dark, margin: '0' }}>
          {greeting}
          {title ? `, ${title}` : ''} {guru?.nama || 'Guru'}!
        </h1>
        <p style={{ fontSize: isMobile ? '0.88rem' : '1rem', color: C.gray, margin: '0.25rem 0 0 0' }}>
          Selamat datang kembali! Setiap ilmu yang Anda bagikan hari ini adalah benih kebaikan untuk masa depan.
        </p>
        <p style={{ fontSize: '0.85rem', color: C.gray, marginTop: '0.3rem' }}>
          <strong>Hari Ini</strong> - {dateStr}
        </p>
      </div>

      {errorMsg && (
        <div style={{ background: C.redBg, color: C.red, padding: '0.75rem 1rem', borderRadius: '10px', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          {errorMsg}
        </div>
      )}

      {/* Grid: kiri (Jadwal) 2 baris, kanan atas (Penilaian), kanan bawah (Pengajuan) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr',
          gap: isMobile ? '1rem' : '1.5rem',
          marginBottom: isMobile ? '1rem' : '1.5rem',
          alignItems: 'start',
        }}
      >
        <JadwalMingguCard
          jadwalList={jadwalList}
          studentNameMap={studentNameMap}
          loading={loading}
          isMobile={isMobile}
          onOpenFormFromCell={pengajuanJadwal.openFormFromCell}
          onOpenBlankForm={pengajuanJadwal.openBlankForm}
        />

        <PenilaianTerdekatCard
          ujianTerdekatList={ujianTerdekatList}
          loading={loading}
          isMobile={isMobile}
          confirmDeleteUjianId={ujianPenilaian.confirmDeleteUjianId}
          setConfirmDeleteUjianId={ujianPenilaian.setConfirmDeleteUjianId}
          deletingUjianId={ujianPenilaian.deletingUjianId}
          onDelete={ujianPenilaian.deleteUjian}
        />

        <PengajuanJadwalCard
          isMobile={isMobile}
          pengajuanMasuk={pengajuanMasuk}
          respondingId={pengajuanJadwal.respondingId}
          confirmTolakId={pengajuanJadwal.confirmTolakId}
          setConfirmTolakId={pengajuanJadwal.setConfirmTolakId}
          onRespond={pengajuanJadwal.respondPengajuan}
          pengajuanSayaGrouped={pengajuanJadwal.pengajuanSayaGrouped}
          confirmDeleteSayaId={pengajuanJadwal.confirmDeleteSayaId}
          setConfirmDeleteSayaId={pengajuanJadwal.setConfirmDeleteSayaId}
          deletingSayaId={pengajuanJadwal.deletingSayaId}
          onDeleteSaya={pengajuanJadwal.hapusPengajuanSaya}
        />
      </div>

      {/* Pengingat Perubahan Jadwal (disetujui siswa, guru, & admin) */}
      <PengingatPerubahanJadwal
        isMobile={isMobile}
        perubahanDisetujuiList={pengajuanJadwal.perubahanDisetujuiList}
        showAllPengingat={pengajuanJadwal.showAllPengingat}
        setShowAllPengingat={pengajuanJadwal.setShowAllPengingat}
        confirmDeleteRiwayatId={pengajuanJadwal.confirmDeleteRiwayatId}
        setConfirmDeleteRiwayatId={pengajuanJadwal.setConfirmDeleteRiwayatId}
        deletingRiwayatId={pengajuanJadwal.deletingRiwayatId}
        onDelete={pengajuanJadwal.hapusPerubahanDisetujui}
      />

      {/* Materi Request */}
      <MateriRequestSection isMobile={isMobile} materiRequestList={materiRequestList} loading={loading} materiRequestHook={materiRequest} />

      {/* Modal Form Penilaian/Tugas */}
      <UjianFormModal
        show={ujianPenilaian.showUjianForm}
        isMobile={isMobile}
        ujianForm={ujianPenilaian.ujianForm}
        setUjianForm={ujianPenilaian.setUjianForm}
        mapelOptions={mapelOptions}
        ujianBabOptions={ujianPenilaian.ujianBabOptions}
        loadUjianBab={ujianPenilaian.loadUjianBab}
        submittingUjian={ujianPenilaian.submittingUjian}
        onClose={ujianPenilaian.closeUjianForm}
        onSubmit={ujianPenilaian.submitUjian}
      />

      {/* Modal form pengajuan perubahan jadwal */}
      <PengajuanJadwalFormModal
        show={pengajuanJadwal.showForm}
        isMobile={isMobile}
        tanggalAsal={pengajuanJadwal.tanggalAsal}
        setTanggalAsal={pengajuanJadwal.setTanggalAsal}
        hariAsal={pengajuanJadwal.hariAsal}
        selectedJadwalId={pengajuanJadwal.selectedJadwalId}
        kandidatJadwal={pengajuanJadwal.kandidatJadwal}
        getPihakLabel={pengajuanJadwal.getPihakLabel}
        applyJadwalSelection={pengajuanJadwal.applyJadwalSelection}
        formData={pengajuanJadwal.formData}
        setFormData={pengajuanJadwal.setFormData}
        submitting={pengajuanJadwal.submitting}
        onClose={() => pengajuanJadwal.setShowForm(false)}
        onSubmit={pengajuanJadwal.submitPengajuan}
      />
    </div>
  );
};

export default TeacherHome;