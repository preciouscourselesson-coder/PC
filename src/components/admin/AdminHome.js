// src/components/admin/AdminHome.js
import React, { useRef } from 'react';
import Toast, { useToast } from '../shared/Toast';
import { C } from '../shared/Theme';

import { useAdminProfile } from './home/use-admin-profile';
import { useAdminHomeData } from './home/use-admin-home-data';
import { useAcademicCalendar } from './home/use-academic-calendar';
import { useScheduleFilter } from './home/use-schedule-filter';
import { useTaskForm } from './home/use-task-form';
import { useScheduleForm } from './home/use-schedule-form';
import { useScheduleChangeForm } from './home/use-schedule-change-form';
import { usePengajuanJadwal } from './home/use-pengajuan-jadwal';

import AdminHomeHeader from './home/admin-home-header';
import AcademicCalendarCard from './home/academic-calendar-card';
import TaskPanel from './home/task-panel';
import ScheduleChangePanel from './home/schedule-change-panel';
import SchedulePanel from './home/schedule-panel';
import AddScheduleForm from './home/add-schedule-form';

const AdminHome = () => {
  const today = useRef(new Date()).current;
  const taskSectionRef = useRef(null);
  const { toast, showToast } = useToast();

  // ---------- Data ----------
  const { adminProfile } = useAdminProfile();
  const {
    teachers, students, tasks, schedules, pengajuanJadwal,
    loading, errorMsg, setErrorMsg,
    setTasks, setSchedules, setPengajuanJadwal,
  } = useAdminHomeData();

  // ---------- Kalender ----------
  const calendar = useAcademicCalendar(tasks, today);

  // ---------- Filter jadwal les ----------
  const {
    filterType, filterValue, setFilterValue, handleFilterTypeChange,
    todayHari, filteredSchedules, todaySchedule,
  } = useScheduleFilter(schedules, teachers, students, today);

  // ---------- Tugas/Penilaian ----------
  const {
    showTaskForm, setShowTaskForm, taskForm, setTaskForm,
    openTaskFormForDate, handleAddTask, handleDeleteTask,
  } = useTaskForm({ setTasks, showToast });

  const handleDayClick = (day) => {
    const dateStr = `${calendar.viewYear}-${String(calendar.viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    openTaskFormForDate(dateStr);
    taskSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // ---------- Jadwal les (tambah/hapus) ----------
  const { scheduleForm, setScheduleForm, handleAddSchedule, handleDeleteJadwal } =
    useScheduleForm({ setSchedules, showToast });

  // ---------- Perubahan jadwal (ajukan sendiri) ----------
  const {
    showChangeForm, setShowChangeForm, changeForm, setChangeForm,
    handleScheduleChange, handleDeleteScheduleChange,
  } = useScheduleChangeForm({ schedules, setSchedules, showToast });

  // ---------- Pengajuan perubahan jadwal dari guru/siswa ----------
  const { respondingPengajuanId, handleRespondPengajuanAdmin } =
    usePengajuanJadwal({ setPengajuanJadwal, setErrorMsg });

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', fontFamily: 'inherit' }}>
      <AdminHomeHeader adminProfile={adminProfile} today={today} />

      <Toast toast={toast} />

      {errorMsg && (
        <div style={{ background: '#fdecea', color: '#a33', borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
          {errorMsg}
        </div>
      )}

      {loading && (
        <div style={{ background: C.goldBg, color: C.gold, borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.85rem', fontWeight: '600' }}>
          Memuat data...
        </div>
      )}

      {/* ========== BAGIAN ATAS: Kalender + Tugas/Perubahan ========== */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <AcademicCalendarCard
          today={today}
          viewMonth={calendar.viewMonth}
          viewYear={calendar.viewYear}
          firstDayOffset={calendar.firstDayOffset}
          calendarDays={calendar.calendarDays}
          tasksByDate={calendar.tasksByDate}
          isCurrentMonth={calendar.isCurrentMonth}
          onPrevMonth={calendar.goToPrevMonth}
          onNextMonth={calendar.goToNextMonth}
          onGoToCurrentMonth={calendar.goToCurrentMonth}
          onDayClick={handleDayClick}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <TaskPanel
            ref={taskSectionRef}
            tasks={tasks}
            showTaskForm={showTaskForm}
            setShowTaskForm={setShowTaskForm}
            taskForm={taskForm}
            setTaskForm={setTaskForm}
            onAddTask={handleAddTask}
            onDeleteTask={handleDeleteTask}
          />

          <ScheduleChangePanel
            schedules={schedules}
            teachers={teachers}
            pengajuanJadwal={pengajuanJadwal}
            respondingPengajuanId={respondingPengajuanId}
            onRespondPengajuan={handleRespondPengajuanAdmin}
            showChangeForm={showChangeForm}
            setShowChangeForm={setShowChangeForm}
            changeForm={changeForm}
            setChangeForm={setChangeForm}
            onScheduleChange={handleScheduleChange}
            onDeleteScheduleChange={handleDeleteScheduleChange}
          />
        </div>
      </div>

      {/* ========== BAGIAN BAWAH: Jadwal Les + Form Tambah Jadwal (selalu tampil) ========== */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <SchedulePanel
          teachers={teachers}
          students={students}
          filterType={filterType}
          onFilterTypeChange={handleFilterTypeChange}
          filterValue={filterValue}
          onFilterValueChange={setFilterValue}
          filteredSchedules={filteredSchedules}
          todaySchedule={todaySchedule}
          todayHari={todayHari}
          onDeleteJadwal={handleDeleteJadwal}
        />

        <AddScheduleForm
          teachers={teachers}
          students={students}
          scheduleForm={scheduleForm}
          setScheduleForm={setScheduleForm}
          onAddSchedule={handleAddSchedule}
        />
      </div>

      {/* Catatan Admin */}
      <div style={{ background: C.goldBg, borderRadius: '12px', padding: '1rem 1.5rem', border: `1px solid ${C.gold}` }}>
        <p style={{ margin: 0, color: C.gold, fontWeight: '500' }}>
          💡 Setelah import atau perubahan jadwal, sistem akan mengirimkan notifikasi ke guru & siswa terkait.
        </p>
      </div>
    </div>
  );
};

export default AdminHome;
