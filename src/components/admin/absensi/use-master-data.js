// src/components/admin/adminAbsensi/use-master-data.js
//
// Mengambil daftar guru & siswa (data master) yang dipakai untuk filter,
// rekap, dan modal rekap siswa. Dipisah dari fetch entri sesi supaya bisa
// di-mock/di-test terpisah dari logic entri. Polanya sama dengan
// useFormOptions di modul paketSiswa.
import { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';

const GURU_TABLE = 'guru';

export function useMasterData() {
  const [guruList, setGuruList] = useState([]);
  const [studentList, setStudentList] = useState([]);
  const [loadingMasters, setLoadingMasters] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadMasters = async () => {
      setLoadingMasters(true);
      const [guruRes, siswaRes] = await Promise.all([
        supabase.from(GURU_TABLE).select('id, profile_id, profiles:profiles!profile_id(full_name)'),
        supabase.from('profiles').select('id, full_name').eq('role', 'student').order('full_name', { ascending: true }),
      ]);

      if (!isMounted) return;

      if (!guruRes.error) {
        const list = (guruRes.data || [])
          .map((g) => ({ id: g.profile_id, full_name: g.profiles?.full_name || 'Guru tanpa nama' }))
          .sort((a, b) => a.full_name.localeCompare(b.full_name));
        setGuruList(list);
      }
      if (!siswaRes.error) setStudentList(siswaRes.data || []);
      setLoadingMasters(false);
    };

    loadMasters();
    return () => {
      isMounted = false;
    };
  }, []);

  return { guruList, studentList, loadingMasters };
}
