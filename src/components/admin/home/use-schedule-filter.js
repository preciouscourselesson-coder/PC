// src/components/admin/adminHome/useScheduleFilter.js
//
// Custom hook untuk filter jadwal les di panel "Jadwal Les" (filter
// berdasarkan Guru atau Siswa) beserta derivasi jadwal hasil filter dan
// jadwal hari ini. Dipisah dari komponen supaya logic filtering bisa
// dites terpisah dari markup tabel.
import { useState, useEffect, useMemo } from 'react';
import { HARI_LIST } from './admin-home-constants';

export function useScheduleFilter(schedules, teachers, students, today) {
  const [filterType, setFilterType] = useState('guru');
  const [filterValue, setFilterValue] = useState('');

  // Inisialisasi filterValue dengan guru/siswa pertama begitu datanya siap
  // (mirip logic awal di fetchAll: hanya diisi kalau belum ada pilihan).
  useEffect(() => {
    if (filterValue) return;
    if (filterType === 'guru' && teachers.length > 0) {
      setFilterValue(String(teachers[0].id));
    } else if (filterType === 'siswa' && students.length > 0) {
      setFilterValue(String(students[0].id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teachers, students]);

  const handleFilterTypeChange = (newType) => {
    setFilterType(newType);
    if (newType === 'guru' && teachers.length > 0) {
      setFilterValue(String(teachers[0].id));
    } else if (newType === 'siswa' && students.length > 0) {
      setFilterValue(String(students[0].id));
    } else {
      setFilterValue('');
    }
  };

  const todayHari = HARI_LIST[(today.getDay() + 6) % 7];
  const todayDateStr = today.toISOString().slice(0, 10);

  const filteredSchedules = useMemo(() => {
    if (!filterValue) return [];
    return schedules.filter((s) => {
      if (s.is_temporary) return false;
      if (filterType === 'guru') {
        return String(s.guru_id) === String(filterValue);
      }
      return s.siswa_ids && s.siswa_ids.some((id) => String(id) === String(filterValue));
    });
  }, [schedules, filterType, filterValue]);

  const todaySchedule = useMemo(() => {
    if (!filterValue) return [];
    return schedules.filter((s) => {
      if (filterType === 'guru' && String(s.guru_id) !== String(filterValue)) return false;
      if (filterType === 'siswa' && !(s.siswa_ids && s.siswa_ids.some((id) => String(id) === String(filterValue)))) return false;
      if (s.is_temporary) return s.tanggal_temporary === todayDateStr;
      const hasOverrideToday = schedules.some(
        (o) => o.is_temporary && o.tanggal_temporary === todayDateStr && String(o.guru_id) === String(s.guru_id) && o.kelas === s.kelas
      );
      return s.hari === todayHari && !hasOverrideToday;
    });
  }, [schedules, filterType, filterValue, todayHari, todayDateStr]);

  return {
    filterType,
    filterValue,
    setFilterValue,
    handleFilterTypeChange,
    todayHari,
    filteredSchedules,
    todaySchedule,
  };
}
