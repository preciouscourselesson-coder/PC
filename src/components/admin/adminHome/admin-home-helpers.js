// src/components/admin/adminHome/admin-home-helpers.js
//
// Semua fungsi di sini murni ("pure") -- tidak ada state, tidak ada side
// effect, tidak ada panggilan Supabase. Dipindahkan apa adanya dari
// AdminHome.js supaya bisa di-unit-test terpisah dari UI (sama pola
// dengan paket-siswa-helpers.js).
import { HARI_LIST, BULAN_LIST } from './admin-home-constants';

export const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good Morning';
  if (hour >= 12 && hour < 18) return 'Good Afternoon';
  if (hour >= 18 && hour < 22) return 'Good Evening';
  return 'Good Night';
};

export const getTitle = (gender) => {
  if (gender === 'L') return 'Mr.';
  if (gender === 'P') return 'Ms.';
  return '';
};

export const formatHariTanggal = (date) => {
  const hari = HARI_LIST[(date.getDay() + 6) % 7];
  return `${hari}, ${date.getDate()} ${BULAN_LIST[date.getMonth()]} ${date.getFullYear()}`;
};

export const formatJamSingkat = (t) => (t ? t.slice(0, 5) : '');

// Cari nama guru berdasarkan id dari daftar teachers. Menerima `teachers`
// sebagai parameter (bukan ditutup lewat closure) supaya fungsi tetap
// murni dan gampang dites dengan data tiruan.
export const teacherName = (teachers, id) =>
  teachers.find((g) => String(g.id) === String(id))?.nama || '-';

export const getTeacherName = (teachers, guruId) => {
  const teacher = teachers.find((t) => String(t.id) === String(guruId));
  return teacher ? teacher.nama : '?';
};

export const getStudentNames = (students, siswaIds) => {
  if (!siswaIds || siswaIds.length === 0) return '-';
  return siswaIds
    .map((id) => {
      const student = students.find((s) => s.id === id);
      return student ? student.full_name : '?';
    })
    .join(', ');
};

export const asalJadwalStr = (p) => {
  const asal = p.jadwal_les;
  return asal
    ? `${asal.hari} ${formatJamSingkat(asal.jam_mulai)}-${formatJamSingkat(asal.jam_selesai)}`
    : 'jadwal asal tidak ditemukan';
};

export const baruJadwalStr = (p) =>
  `${p.hari_baru || '-'} ${formatJamSingkat(p.jam_mulai_baru)}-${formatJamSingkat(p.jam_selesai_baru)}`;
