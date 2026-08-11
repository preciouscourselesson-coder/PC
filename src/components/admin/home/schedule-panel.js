// src/components/admin/adminHome/SchedulePanel.js
import React from 'react';
import { C } from '../../shared/Theme';
import { cardStyle } from './admin-home-styles';
import WeeklyScheduleTable from './weekly-schedule-table';
import ScheduleFilterBar from './schedule-filter-bar';
import TodayScheduleTable from './today-schedule-table';

const SchedulePanel = ({
  teachers,
  students,
  filterType,
  onFilterTypeChange,
  filterValue,
  onFilterValueChange,
  filteredSchedules,
  todaySchedule,
  todayHari,
  onDeleteJadwal,
}) => {
  return (
    <div style={cardStyle}>
      <h3 style={{ margin: '0 0 1rem 0', color: C.dark }}>Jadwal Les</h3>

      <ScheduleFilterBar
        filterType={filterType}
        onFilterTypeChange={onFilterTypeChange}
        filterValue={filterValue}
        onFilterValueChange={onFilterValueChange}
        teachers={teachers}
        students={students}
      />

      {filterValue ? (
        <>
          <WeeklyScheduleTable
            schedules={filteredSchedules}
            teachers={teachers}
            students={students}
            filterType={filterType}
            onDelete={onDeleteJadwal}
          />
          <TodayScheduleTable
            todayHari={todayHari}
            todaySchedule={todaySchedule}
            filterType={filterType}
            teachers={teachers}
            students={students}
            onDeleteJadwal={onDeleteJadwal}
          />
        </>
      ) : (
        <p style={{ fontSize: '0.85rem', color: C.gray, marginTop: '1rem' }}>
          {filterType === 'guru' ? 'Belum ada guru terdaftar.' : 'Belum ada siswa terdaftar.'}
        </p>
      )}
    </div>
  );
};

export default SchedulePanel;
