import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../../supabaseClient';

/**
 * Hook data utama halaman Beranda Guru. Memuat semua data yang dibutuhkan
 * dari Supabase (data guru, jadwal mengajar, nama siswa terkait, pengajuan
 * perubahan jadwal masuk/keluar/riwayat admin, permintaan materi, arsip
 * materi, daftar mapel, dan penilaian/tugas terdekat) dalam satu fungsi
 * `loadAll`, dan mengekspos setter mentah supaya hook lain (mis.
 * usePengajuanJadwal, useMateriRequest, useUjianPenilaian) bisa melakukan
 * optimistic update tanpa perlu reload penuh setiap aksi.
 */
export function useTeacherHomeData() {
  const [loading, setLoading] = useState(true);
  const [guru, setGuru] = useState(null);
  const [profileId, setProfileId] = useState(null);
  const [jadwalList, setJadwalList] = useState([]);
  const [studentNameMap, setStudentNameMap] = useState({});
  const [pengajuanMasuk, setPengajuanMasuk] = useState([]);
  const [pengajuanSaya, setPengajuanSaya] = useState([]);
  const [pengajuanRiwayatAdmin, setPengajuanRiwayatAdmin] = useState([]);
  const [materiRequestList, setMateriRequestList] = useState([]);
  const [ujianTerdekatList, setUjianTerdekatList] = useState([]);
  const [mapelOptions, setMapelOptions] = useState([]);
  // Arsip materi guru (skema baru -- sama seperti yang dipakai TeacherArsipMateri.js:
  // mapel/bab/sub_bab teks bebas + kategori Pribadi/Sekolah/Request). Dipakai sebagai
  // sumber pilihan pada modal "Kirim Materi".
  const [materiArsip, setMateriArsip] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');

  // Arsip materi guru: dipakai untuk opsi "pilih dari arsip" pada modal Kirim
  // Materi. Sengaja ambil status Dipublish dari semua kategori (Pribadi/
  // Sekolah/Request) supaya guru bisa kirim materi apapun yang sudah pernah
  // ia unggah, tidak dibatasi kategori tertentu.
  const refreshMateriArsip = useCallback(async (userId) => {
    const { data: rows, error: fileError } = await supabase
      .from('materi_file')
      .select('id, nama, mapel, bab, sub_bab, kategori, kelas, tipe, url, status')
      .eq('user_id', userId)
      .eq('status', 'Dipublish')
      .order('tanggal', { ascending: false });
    if (fileError) {
      console.error(fileError);
      return;
    }
    setMateriArsip(rows || []);
  }, []);

  const loadMapel = useCallback(async () => {
    const { data, error } = await supabase.from('materi_mapel').select('*').order('nama');
    if (!error) setMapelOptions(data || []);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      const currentProfileId = userData?.user?.id;
      if (!currentProfileId) throw new Error('Tidak ada sesi login yang aktif.');
      setProfileId(currentProfileId);

      const { data: guruData, error: guruError } = await supabase
        .from('guru')
        .select('*')
        .eq('profile_id', currentProfileId)
        .single();
      if (guruError) throw guruError;
      setGuru(guruData);

      const { data: jadwalData, error: jadwalError } = await supabase
        .from('jadwal_les')
        .select('*')
        .eq('guru_id', guruData.id);
      if (jadwalError) throw jadwalError;
      setJadwalList(jadwalData || []);

      const studentIds = new Set();
      jadwalData.forEach((j) => {
        if (j.siswa_id) studentIds.add(j.siswa_id);
        if (Array.isArray(j.siswa_ids)) {
          j.siswa_ids.forEach((id) => studentIds.add(id));
        }
      });
      if (studentIds.size > 0) {
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', Array.from(studentIds));
        if (!profileError) {
          const map = {};
          profiles.forEach((p) => {
            map[p.id] = p.full_name;
          });
          setStudentNameMap(map);
        }
      }

      const { data: pengajuanData, error: pengajuanError } = await supabase
        .from('pengajuan_perubahan_jadwal')
        .select('*, jadwal_les(hari, jam_mulai, jam_selesai, kelas)')
        .eq('guru_id', guruData.id)
        .order('created_at', { ascending: false });
      if (pengajuanError) throw pengajuanError;
      const all = pengajuanData || [];
      // Hanya tampilkan pengajuan yang benar-benar masih butuh aksi guru.
      // Begitu guru klik Setujui/Tolak, statusnya berubah jadi 'disetujui_menunggu_admin'
      // atau 'ditolak' -- keduanya sudah final dari sisi guru, jadi harus hilang dari antrian.
      setPengajuanMasuk(all.filter((p) => p.diajukan_oleh === 'siswa' && p.status === 'menunggu_persetujuan'));
      setPengajuanSaya(
        all.filter((p) => p.diajukan_oleh === 'guru' && p.status !== 'disetujui_admin' && p.status !== 'ditolak_admin')
      );
      // Riwayat: pengajuan yang sudah diputuskan admin (disetujui/ditolak).
      // Diurutkan terbaru dulu (dari query di atas), cap ditentukan saat render.
      setPengajuanRiwayatAdmin(all.filter((p) => p.status === 'disetujui_admin' || p.status === 'ditolak_admin'));

      const { data: materiData, error: materiError } = await supabase
        .from('materi_request')
        .select('*')
        .eq('guru_id', guruData.id)
        .order('created_at', { ascending: false });
      if (materiError) throw materiError;
      setMateriRequestList(materiData || []);

      const { data: tugasData, error: tugasError } = await supabase
        .from('tugas_penilaian')
        .select(
          `
          *,
          id_mapel (id, nama),
          id_bab (id, nama)
        `
        )
        .eq('id_guru', guruData.id)
        .not('siswa_id', 'is', null)
        .order('tanggal', { ascending: true });
      if (tugasError) throw tugasError;
      setUjianTerdekatList(tugasData || []);

      await refreshMateriArsip(currentProfileId);
      await loadMapel();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Gagal memuat data.');
    } finally {
      setLoading(false);
    }
  }, [refreshMateriArsip, loadMapel]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  return {
    loading,
    guru,
    profileId,
    jadwalList,
    studentNameMap,
    pengajuanMasuk,
    setPengajuanMasuk,
    pengajuanSaya,
    setPengajuanSaya,
    pengajuanRiwayatAdmin,
    setPengajuanRiwayatAdmin,
    materiRequestList,
    setMateriRequestList,
    ujianTerdekatList,
    mapelOptions,
    materiArsip,
    setMateriArsip,
    errorMsg,
    setErrorMsg,
    loadAll,
  };
}
