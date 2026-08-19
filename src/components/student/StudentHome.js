// src/components/student/StudentHome.js
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { C } from './home/constants';
import { getGreeting, getTodayLongDate } from './home/utils/format';

import { useIsMobile } from './home/hooks/useIsMobile';
import { useStudentHomeData } from './home/hooks/useStudentHomeData';
import { usePengajuanJadwal } from './home/hooks/usePengajuanJadwal';
import { useTugasPenilaian } from './home/hooks/useTugasPenilaian';

import { JadwalMingguCard } from './home/components/JadwalMingguCard';
import { PenilaianTerdekatCard } from './home/components/PenilaianTerdekatCard';
import { PengajuanJadwalCard } from './home/components/PengajuanJadwalCard';
import { PengingatPerubahanJadwal } from './home/components/PengingatPerubahanJadwal';
import { MateriRequestSection } from './home/components/MateriRequestSection';
import { TugasFormModal } from './home/components/TugasFormModal';
import { PengajuanJadwalFormModal } from './home/components/PengajuanJadwalFormModal';

const StudentHome = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const goToFolderShareRequest = () => {
    navigate('/siswa/folder-share', { state: { tab: 'request' } });
  };

  const {
    loading,
    profile,
    jadwalList,
    pengajuanSaya,
    setPengajuanSaya,
    pengajuanMasuk,
    setPengajuanMasuk,
    materiRequestList,
    guruOptions,
    guruMap,
    ujianTerdekatList,
    errorMsg,
    setErrorMsg,
    loadAll,
  } = useStudentHomeData();

  const pengajuanJadwal = usePengajuanJadwal({
    profile,
    jadwalList,
    guruMap,
    pengajuanSaya,
    setPengajuanSaya,
    pengajuanMasuk,
    setPengajuanMasuk,
    setErrorMsg,
    loadAll,
  });

  const tugasPenilaian = useTugasPenilaian({ profile, setErrorMsg, loadAll });

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: isMobile ? '0 0.85rem' : '0', fontFamily: 'inherit', boxSizing: 'border-box' }}>
      {/* Sapaan */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: isMobile ? '1.35rem' : '1.8rem', fontWeight: '700', color: C.dark, margin: '0' }}>
          {getGreeting()}, {profile?.full_name || 'Siswa'}!
        </h1>
        <p style={{ fontSize: '1rem', color: C.gray, margin: '0.25rem 0 0 0' }}>Semangat belajar hari ini, masa depan cerah menanti Anda.</p>
        <p style={{ fontSize: '0.9rem', color: C.gray, marginTop: '0.3rem' }}>
          <strong>Hari Ini</strong> - {getTodayLongDate()}
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
          guruMap={guruMap}
          loading={loading}
          isMobile={isMobile}
          onOpenFormFromCell={pengajuanJadwal.openFormFromCell}
          onOpenBlankForm={pengajuanJadwal.openBlankForm}
        />

        <PenilaianTerdekatCard
          ujianTerdekatList={ujianTerdekatList}
          loading={loading}
          isMobile={isMobile}
          onAdd={tugasPenilaian.openTugasForm}
          onEdit={tugasPenilaian.openEditTugasForm}
          confirmDeleteTugasId={tugasPenilaian.confirmDeleteTugasId}
          setConfirmDeleteTugasId={tugasPenilaian.setConfirmDeleteTugasId}
          deletingTugasId={tugasPenilaian.deletingTugasId}
          onDelete={tugasPenilaian.deleteTugasPenilaian}
        />

        <PengajuanJadwalCard
          isMobile={isMobile}
          profile={profile}
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

      <PengingatPerubahanJadwal
        isMobile={isMobile}
        perubahanDisetujuiList={pengajuanJadwal.perubahanDisetujuiList}
        showAllPengingat={pengajuanJadwal.showAllPengingat}
        setShowAllPengingat={pengajuanJadwal.setShowAllPengingat}
        confirmDeletePengingatId={pengajuanJadwal.confirmDeletePengingatId}
        setConfirmDeletePengingatId={pengajuanJadwal.setConfirmDeletePengingatId}
        deletingPengingatId={pengajuanJadwal.deletingPengingatId}
        onDelete={pengajuanJadwal.hapusPerubahanDisetujui}
      />

      <MateriRequestSection
        isMobile={isMobile}
        materiRequestList={materiRequestList}
        loading={loading}
        guruOptions={guruOptions}
        onNavigateToFolderShared={goToFolderShareRequest}
      />

      <TugasFormModal
        show={tugasPenilaian.showTugasForm}
        isMobile={isMobile}
        editingTugasId={tugasPenilaian.editingTugasId}
        tugasForm={tugasPenilaian.tugasForm}
        setTugasForm={tugasPenilaian.setTugasForm}
        guruOptions={guruOptions}
        catatanGambarFile={tugasPenilaian.catatanGambarFile}
        catatanGambarPreview={tugasPenilaian.catatanGambarPreview}
        onCatatanGambarChange={tugasPenilaian.handleCatatanGambarChange}
        onRemoveCatatanGambar={tugasPenilaian.removeCatatanGambar}
        submittingTugas={tugasPenilaian.submittingTugas}
        onClose={tugasPenilaian.closeTugasForm}
        onSubmit={tugasPenilaian.submitTugasPenilaian}
      />

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

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1.5rem' }}>
        <button style={{ background: 'none', border: 'none', color: C.gold, fontWeight: '600', cursor: 'pointer', padding: '6px 2px', fontFamily: 'inherit' }}>
          Lihat semua jadwal
        </button>
        <button style={{ background: 'none', border: 'none', color: C.gold, fontWeight: '600', cursor: 'pointer', padding: '6px 2px', fontFamily: 'inherit' }}>
          Lihat semua tugas
        </button>
      </div>
    </div>
  );
};

export default StudentHome;