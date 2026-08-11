// src/components/student/StudentHomework.js
import React from 'react';
import { C } from './homework/constants';

import { useIsMobile } from './homework/hooks/useIsMobile';
import { useStudentTasks } from './homework/hooks/useStudentTasks';
import { useUploadAnswer } from './homework/hooks/useUploadAnswer';
import { useInteractiveWork } from './homework/hooks/useInteractiveWork';
import { useJoinByCode } from './homework/hooks/useJoinByCode';

import { JoinByCodeCard } from './homework/components/JoinByCodeCard';
import { Sidebar } from './homework/components/Sidebar';
import { FilterChipsBar } from './homework/components/FilterChipsBar';
import { SortControls } from './homework/components/SortControls';
import { TaskList } from './homework/components/TaskList';
import { UploadAnswerModal } from './homework/components/UploadAnswerModal';
import { InteractiveWorkModal } from './homework/components/InteractiveWorkModal';

// ─── Halaman Utama ────────────────────────────────────────────────────────────
const StudentHomework = () => {
  const isMobile = useIsMobile();

  const {
    studentId,
    tasks,
    setTasks,
    filteredTasks,
    filterStatus,
    filterMapel,
    sortBy,
    setSortBy,
    mapelList,
    setMapelList,
    loading,
    errorMsg,
    setErrorMsg,
    stats,
    isActiveStatus,
    handleStatusClick,
    handleMapelClick,
    resetFilters,
  } = useStudentTasks();

  const interactiveWork = useInteractiveWork({ studentId, setTasks });
  const { openWorkModal } = interactiveWork;

  const upload = useUploadAnswer({ studentId, tasks, setTasks, errorMsg, setErrorMsg });

  const joinByCode = useJoinByCode({
    studentId,
    setTasks,
    setMapelList,
    onOpened: openWorkModal,
  });

  const isFiltered = filterStatus !== 'Semua' || filterMapel !== 'Semua Mapel';

  // ─── RENDER UTAMA ──────────────────────────────────────────────────────────
  return (
    <>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '1rem',
      }}>
        {/* HEADER dengan latar biru */}
        <div style={{
          background: C.primary,
          padding: isMobile ? '1rem 1.2rem' : '1.2rem 2rem',
          borderRadius: '16px 16px 0 0',
          marginBottom: '1.5rem',
        }}>
          <h1 style={{ margin: 0, color: C.white, fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: 'bold' }}>
            Tugas Saya
          </h1>
        </div>

        {errorMsg && (
          <div style={{ background: C.redBg, color: C.red, padding: '0.75rem 1rem', borderRadius: '10px', fontSize: '0.88rem', marginBottom: '1rem' }}>
            {errorMsg}
          </div>
        )}

        <JoinByCodeCard
          isMobile={isMobile}
          joinCodeInput={joinByCode.joinCodeInput}
          setJoinCodeInput={joinByCode.setJoinCodeInput}
          joining={joinByCode.joining}
          joinError={joinByCode.joinError}
          joinSuccessMsg={joinByCode.joinSuccessMsg}
          onSubmit={joinByCode.handleJoinByCode}
        />

        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: '1.5rem',
        }}>
          {/* Sidebar filter — hanya di desktop; di mobile diganti FilterChipsBar
              (di dalam kolom konten) supaya daftar tugas langsung terlihat */}
          {!isMobile && (
            <div style={{ flex: '0 0 240px', minWidth: '200px' }}>
              <Sidebar
                stats={stats}
                mapelList={mapelList}
                filterStatus={filterStatus}
                filterMapel={filterMapel}
                isActiveStatus={isActiveStatus}
                handleStatusClick={handleStatusClick}
                handleMapelClick={handleMapelClick}
                resetFilters={resetFilters}
              />
            </div>
          )}

          {/* Konten Utama */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {isMobile && (
              <FilterChipsBar
                stats={stats}
                mapelList={mapelList}
                filterStatus={filterStatus}
                filterMapel={filterMapel}
                isActiveStatus={isActiveStatus}
                handleStatusClick={handleStatusClick}
                handleMapelClick={handleMapelClick}
                resetFilters={resetFilters}
              />
            )}

            <SortControls
              sortBy={sortBy}
              setSortBy={setSortBy}
              isMobile={isMobile}
              showReset={isFiltered}
              onReset={resetFilters}
            />

            <TaskList
              loading={loading}
              filteredTasks={filteredTasks}
              isMobile={isMobile}
              onUpload={upload.openUploadModal}
              onWork={openWorkModal}
            />
          </div>
        </div>
      </div>

      {/* Modal Upload Jawaban */}
      <UploadAnswerModal
        show={upload.showUploadModal}
        taskTitle={tasks.find(t => t.id === upload.uploadingTaskId)?.judul}
        uploadFile={upload.uploadFile}
        errorMsg={errorMsg}
        uploading={upload.uploading}
        isMobile={isMobile}
        onClose={upload.closeUploadModal}
        onFileChange={upload.handleFileChange}
        onSubmit={upload.submitUpload}
      />

      {/* Modal Kerjakan Tugas Isian Interaktif */}
      {interactiveWork.workingTask && (
        <InteractiveWorkModal
          task={interactiveWork.workingTask}
          answers={interactiveWork.workAnswers}
          onAnswerChange={interactiveWork.handleBlankChange}
          onSubmit={interactiveWork.handleSubmitAnswers}
          onClose={interactiveWork.closeWorkModal}
          submitting={interactiveWork.submittingAnswers}
          error={interactiveWork.workError}
          studentId={studentId}
          isMobile={isMobile}
        />
      )}
    </>
  );
};

export default StudentHomework;
