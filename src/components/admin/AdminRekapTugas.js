// src/components/admin/AdminRekapTugas.js
//
// Rekap nilai tugas INTERAKTIF (modul homework/homework_questions/
// homework_assignments/homework_submissions) per siswa, digabung dari semua
// guru. Tugas file lama (penugasan_guru/pengumpulan_tugas) TIDAK termasuk
// di rekap ini karena nilainya diisi manual oleh guru, bukan otomatis.
//
// Skema tabel yang dipakai (lihat supabase_schema.sql / hooks/useRekapTugasData.js):
//   homework(id, title, subject, grade, due_date, status, teacher_id, ...)
//   homework_assignments(homework_id, student_id)
//   homework_submissions(homework_id, student_id, score, max_score, submitted_at)
//   guru(id, nama, profile_id)              -- profile_id = homework.teacher_id
//   profiles(id, full_name, kelas)           -- id = homework_assignments.student_id
import React, { useState } from 'react';
import { C } from './AdminRekapTugas/constants';
import { useIsMobile } from './AdminRekapTugas/hooks/useIsMobile';
import { useRekapTugasData } from './AdminRekapTugas/hooks/useRekapTugasData';
import { FilterBar } from './AdminRekapTugas/components/FilterBar';
import { StudentAccordionItem } from './AdminRekapTugas/components/StudentAccordionItem';

const AdminRekapTugas = () => {
  const isMobile = useIsMobile();
  const {
    filteredStudents,
    kelasList,
    mapelList,
    filterKelas,
    setFilterKelas,
    filterMapel,
    setFilterMapel,
    resetFilters,
    loading,
    errorMsg,
  } = useRekapTugasData();

  const [expandedIds, setExpandedIds] = useState(() => new Set());

  const toggleExpand = (studentId) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  const isFiltered = filterKelas !== 'Semua Kelas' || filterMapel !== 'Semua Mapel';

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '1rem' }}>
      {/* HEADER dengan latar biru */}
      <div style={{
        background: C.primary,
        padding: isMobile ? '1rem 1.2rem' : '1.2rem 2rem',
        borderRadius: '16px 16px 0 0',
        marginBottom: '1.5rem',
      }}>
        <h1 style={{ margin: 0, color: C.white, fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: 'bold' }}>
          Rekap Nilai Tugas
        </h1>
        <p style={{ margin: '4px 0 0', color: C.primaryLight, fontSize: '0.85rem' }}>
          Nilai tugas isian interaktif per siswa, dari semua guru pengajar.
        </p>
      </div>

      {errorMsg && (
        <div style={{ background: C.redBg, color: C.red, padding: '0.75rem 1rem', borderRadius: '10px', fontSize: '0.88rem', marginBottom: '1rem' }}>
          {errorMsg}
        </div>
      )}

      <FilterBar
        kelasList={kelasList}
        mapelList={mapelList}
        filterKelas={filterKelas}
        setFilterKelas={setFilterKelas}
        filterMapel={filterMapel}
        setFilterMapel={setFilterMapel}
        isMobile={isMobile}
        isFiltered={isFiltered}
        onReset={resetFilters}
      />

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: C.gray }}>Memuat rekap...</div>
      ) : filteredStudents.length === 0 ? (
        <div style={{
          background: C.white,
          border: `1.5px solid ${C.border}`,
          borderRadius: '16px',
          padding: '2rem',
          textAlign: 'center',
          color: C.gray,
        }}>
          Tidak ada data untuk filter saat ini.
        </div>
      ) : (
        filteredStudents.map(student => (
          <StudentAccordionItem
            key={student.studentId}
            student={student}
            expanded={expandedIds.has(student.studentId)}
            onToggle={() => toggleExpand(student.studentId)}
            isMobile={isMobile}
          />
        ))
      )}
    </div>
  );
};

export default AdminRekapTugas;
