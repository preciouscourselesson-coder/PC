// src/components/admin/adminHome/useAcademicCalendar.js
//
// Custom hook untuk state & logic kalender akademik: bulan/tahun yang
// sedang ditampilkan, navigasi bulan, dan pengelompokan tugas/penilaian
// per tanggal untuk bulan yang sedang tampil. Dipisah dari komponen agar
// AcademicCalendarCard tinggal jadi presentational component.
import { useState, useMemo } from 'react';

export function useAcademicCalendar(tasks, today) {
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOffset = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const tasksByDate = useMemo(() => {
    const map = {};
    tasks.forEach((t) => {
      if (!t.tanggal) return;
      const d = new Date(t.tanggal);
      if (d.getMonth() === viewMonth && d.getFullYear() === viewYear) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(t);
      }
    });
    return map;
  }, [tasks, viewMonth, viewYear]);

  const isCurrentMonth = viewMonth === today.getMonth() && viewYear === today.getFullYear();

  const goToPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const goToCurrentMonth = () => {
    setViewMonth(today.getMonth());
    setViewYear(today.getFullYear());
  };

  return {
    viewMonth,
    viewYear,
    daysInMonth,
    firstDayOffset,
    calendarDays,
    tasksByDate,
    isCurrentMonth,
    goToPrevMonth,
    goToNextMonth,
    goToCurrentMonth,
  };
}
