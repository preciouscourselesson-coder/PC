import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib';

// Mengambil & menyimpan data mentah dari keempat sumber (materi_file,
// materi_bab, sesi_pembelajaran, bank_soal_siswa, profiles) sekaligus lewat
// Promise.allSettled, persis seperti fetchAllSources() di komponen asli.
export const useMateriSourcesData = () => {
  const [loading, setLoading] = useState(true);
  const [profilesMap, setProfilesMap] = useState({}); // id (profiles) -> full_name

  const [rows, setRows] = useState([]);
  const [materiError, setMateriError] = useState('');
  const [babList, setBabList] = useState([]); // materi_bab: { id, nama, mapel_id, materi_mapel: { nama } }

  const [sesiRows, setSesiRows] = useState([]);
  const [sesiError, setSesiError] = useState('');

  const [bankRows, setBankRows] = useState([]);
  const [bankError, setBankError] = useState('');

  const fetchAllSources = useCallback(async () => {
    setLoading(true);
    const [materiRes, babRes, sesiRes, bankRes, profilesRes] = await Promise.allSettled([
      // Catatan perbaikan (Temuan Kritis #2): tabel 'bab_ajar' tidak pernah ada
      // di database (nama sebenarnya 'materi_bab'), dan 'sub_bab_ajar' juga tidak
      // ada tabelnya sama sekali. Setelah dicek skema aslinya, 'materi_file' sudah
      // punya kolom teks langsung (denormalized) mapel/bab/sub_bab, jadi tidak
      // perlu join ke 'materi_bab' untuk keperluan tampilan — cukup select kolom
      // flat-nya. Kolom FK yang benar untuk relasi bab adalah 'bab_id' (integer),
      // bukan 'bab_id_new', dan tidak ada kolom 'sub_bab_id' di skema.
      supabase
        .from('materi_file')
        .select('id, nama, tipe, tanggal, url, kelas, status, deskripsi, diupload_oleh, user_id, bab_id, mapel, bab, sub_bab')
        .order('tanggal', { ascending: false }),
      // 'materi_bab' dipakai khusus untuk dropdown pilih bab di modal Edit
      // (butuh id untuk disimpan sebagai materi_file.bab_id). Nama mapel didapat
      // lewat join ke materi_mapel karena materi_bab hanya punya mapel_id (FK),
      // bukan kolom teks 'mapel'.
      supabase.from('materi_bab').select('id, nama, mapel_id, materi_mapel ( nama )').order('nama'),
      supabase
        .from('sesi_pembelajaran')
        .select('id, tanggal, judul_materi, catatan, bukti_urls, status, siswa_id, guru_id')
        .order('tanggal', { ascending: false }),
      supabase
        .from('bank_soal_siswa')
        .select('id, jenis, bab, sub_bab, judul, deskripsi, file_name, file_url, created_at, siswa_id')
        .order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, full_name'),
    ]);

    if (materiRes.status === 'fulfilled' && !materiRes.value.error) {
      setRows(materiRes.value.data || []);
      setMateriError('');
    } else {
      console.error(materiRes.status === 'fulfilled' ? materiRes.value.error : materiRes.reason);
      setMateriError('Gagal memuat data materi guru. Coba muat ulang halaman.');
    }

    if (babRes.status === 'fulfilled' && !babRes.value.error) {
      setBabList(babRes.value.data || []);
    } else {
      console.error(babRes.status === 'fulfilled' ? babRes.value.error : babRes.reason);
    }

    if (sesiRes.status === 'fulfilled' && !sesiRes.value.error) {
      setSesiRows(sesiRes.value.data || []);
      setSesiError('');
    } else {
      console.error(sesiRes.status === 'fulfilled' ? sesiRes.value.error : sesiRes.reason);
      setSesiError('Gagal memuat data sesi pembelajaran. Coba muat ulang halaman.');
    }

    if (bankRes.status === 'fulfilled' && !bankRes.value.error) {
      setBankRows(bankRes.value.data || []);
      setBankError('');
    } else {
      console.error(bankRes.status === 'fulfilled' ? bankRes.value.error : bankRes.reason);
      setBankError('Gagal memuat data bank soal siswa. Coba muat ulang halaman.');
    }

    if (profilesRes.status === 'fulfilled' && !profilesRes.value.error) {
      const map = {};
      (profilesRes.value.data || []).forEach(p => { map[p.id] = p.full_name; });
      setProfilesMap(map);
    } else {
      console.error(profilesRes.status === 'fulfilled' ? profilesRes.value.error : profilesRes.reason);
    }

    setLoading(false);
  }, []);

  useEffect(() => { fetchAllSources(); }, [fetchAllSources]);

  return {
    loading, profilesMap,
    rows, setRows, materiError, babList,
    sesiRows, setSesiRows, sesiError,
    bankRows, setBankRows, bankError,
    refetch: fetchAllSources,
  };
};

export default useMateriSourcesData;
