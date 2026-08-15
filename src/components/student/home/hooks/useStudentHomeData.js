import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../../supabaseClient';

/**
 * Hook data utama halaman Beranda Siswa. Memuat semua data yang dibutuhkan
 * dari Supabase (profile, jadwal les, pengajuan perubahan jadwal masuk &
 * keluar, permintaan materi, dan penilaian/tugas terdekat) dalam satu
 * fungsi `loadAll`, dan mengekspos setter mentah supaya hook lain (mis.
 * usePengajuanJadwal, useMateriRequest, useTugasPenilaian) bisa melakukan
 * optimistic update tanpa perlu reload penuh setiap aksi.
 */
export function useStudentHomeData() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [jadwalList, setJadwalList] = useState([]);
  const [pengajuanSaya, setPengajuanSaya] = useState([]);
  const [pengajuanMasuk, setPengajuanMasuk] = useState([]);
  const [materiRequestList, setMateriRequestList] = useState([]);
  const [guruOptions, setGuruOptions] = useState([]);
  const [guruMap, setGuruMap] = useState({});
  const [ujianTerdekatList, setUjianTerdekatList] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');

  const loadAll = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      const profileId = userData?.user?.id;
      if (!profileId) throw new Error('Tidak ada sesi login.');

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single();
      if (profileError) throw profileError;
      setProfile(profileData);

      const { data: jadwalData, error: jadwalError } = await supabase
        .from('jadwal_les')
        .select('*')
        .or(`siswa_id.eq.${profileId},siswa_ids.cs.{${profileId}}`);
      if (jadwalError) throw jadwalError;
      setJadwalList(jadwalData || []);

      const guruIds = [...new Set(jadwalData.map((j) => j.guru_id))];
      if (guruIds.length > 0) {
        const { data: guruData, error: guruError } = await supabase
          .from('guru')
          .select('id, nama, profile_id')
          .in('id', guruIds);
        if (!guruError) {
          const map = {};
          guruData.forEach((g) => {
            map[g.id] = g.nama;
          });
          setGuruMap(map);
          setGuruOptions(guruData);
        }
      }

      const { data: pengajuanMasukData, error: pengajuanMasukError } = await supabase
        .from('pengajuan_perubahan_jadwal')
        .select('*, jadwal_les(hari, jam_mulai, jam_selesai, kelas)')
        .eq('diajukan_oleh', 'guru')
        .order('created_at', { ascending: false });
      if (pengajuanMasukError) throw pengajuanMasukError;
      setPengajuanMasuk(pengajuanMasukData || []);

      const { data: pengajuanSayaData, error: pengajuanSayaError } = await supabase
        .from('pengajuan_perubahan_jadwal')
        .select('*, jadwal_les(hari, jam_mulai, jam_selesai, kelas)')
        .eq('diajukan_oleh', 'siswa')
        .order('created_at', { ascending: false });
      if (pengajuanSayaError) throw pengajuanSayaError;
      setPengajuanSaya(pengajuanSayaData || []);

      const { data: materiRequestData, error: materiRequestError } = await supabase
        .from('materi_request')
        .select('*')
        .eq('siswa_id', profileId)
        .order('created_at', { ascending: false });
      if (materiRequestError) throw materiRequestError;
      setMateriRequestList(materiRequestData || []);

      const todayStr = new Date().toISOString().slice(0, 10);
      const { data: tugasData, error: tugasError } = await supabase
        .from('tugas_penilaian')
        .select('*')
        .eq('siswa_id', profileId)
        .gte('tanggal', todayStr)
        .order('tanggal', { ascending: true });
      if (!tugasError) setUjianTerdekatList(tugasData || []);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Gagal memuat data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  return {
    loading,
    profile,
    jadwalList,
    pengajuanSaya,
    setPengajuanSaya,
    pengajuanMasuk,
    setPengajuanMasuk,
    materiRequestList,
    setMateriRequestList,
    guruOptions,
    guruMap,
    ujianTerdekatList,
    setUjianTerdekatList,
    errorMsg,
    setErrorMsg,
    loadAll,
  };
}
