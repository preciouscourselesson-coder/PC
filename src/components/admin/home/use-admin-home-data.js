// src/components/admin/adminHome/useAdminHomeData.js
//
// Custom hook yang membungkus semua akses Supabase untuk beranda admin:
// daftar guru (join profiles), daftar siswa, tugas/penilaian, jadwal les,
// dan pengajuan perubahan jadwal yang menunggu keputusan admin. Dipisah
// dari komponen supaya komponen UI tinggal "consume" data & setter, dan
// hook ini bisa di-test/di-mock terpisah dari rendering (sama pola dengan
// usePaketSiswaData).
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../supabaseClient';

export function useAdminHomeData() {
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [pengajuanJadwal, setPengajuanJadwal] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      // 🔁 Query join tanpa !inner dan tanpa order
      const [guruRes, siswaRes, tugasRes, jadwalRes, pengajuanRes] = await Promise.all([
        supabase
          .from('guru')
          .select(`
            id,
            profile_id,
            profiles (
              id,
              full_name,
              email
            )
          `)
          .eq('profiles.role', 'teacher')
          .eq('profiles.status', 'approved'),

        supabase.from('profiles').select('id, full_name, email').eq('role', 'student').order('full_name'),
        supabase.from('tugas_penilaian').select('*').order('tanggal'),
        supabase.from('jadwal_les').select('*'),
        // Permintaan perubahan jadwal yang sudah disetujui kedua pihak
        // (siswa & guru) dan sekarang menunggu keputusan admin.
        // 'disetujui_menunggu_admin' = siswa ajukan, guru sudah setuju.
        // 'disetujui_siswa'          = guru ajukan, siswa sudah setuju.
        supabase
          .from('pengajuan_perubahan_jadwal')
          .select('*, jadwal_les(hari, jam_mulai, jam_selesai, kelas)')
          .in('status', ['disetujui_menunggu_admin', 'disetujui_siswa'])
          .order('created_at', { ascending: false }),
      ]);

      // Cek error masing-masing
      if (guruRes.error) throw guruRes.error;
      if (siswaRes.error) throw siswaRes.error;
      if (tugasRes.error) throw tugasRes.error;
      if (jadwalRes.error) throw jadwalRes.error;
      if (pengajuanRes.error) throw pengajuanRes.error;

      // Mapping data guru
      const rawGuru = guruRes.data || [];
      // Sort by full_name (manual)
      const sortedGuru = rawGuru
        .map((g) => ({
          id: g.id,
          profile_id: g.profile_id,
          full_name: g.profiles?.full_name || '',
          nama: g.profiles?.full_name || '',
          email: g.profiles?.email || '',
        }))
        .sort((a, b) => a.nama.localeCompare(b.nama));

      setTeachers(sortedGuru);
      setStudents(siswaRes.data || []);
      setTasks(tugasRes.data || []);
      setSchedules(jadwalRes.data || []);
      setPengajuanJadwal(pengajuanRes.data || []);
    } catch (err) {
      console.error(err);
      setErrorMsg('Gagal memuat data dari Supabase. Periksa koneksi/konfigurasi tabel.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return {
    teachers,
    students,
    tasks,
    schedules,
    pengajuanJadwal,
    loading,
    errorMsg,
    setErrorMsg,
    setTasks,
    setSchedules,
    setPengajuanJadwal,
    fetchAll,
  };
}
