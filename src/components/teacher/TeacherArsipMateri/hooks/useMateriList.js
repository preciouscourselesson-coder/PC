import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../../../../supabaseClient';
import { KATEGORI_FILTER_GROUPS } from '../constants';

// PENTING — soal visibilitas file: query di bawah ini sudah dibatasi
// `.eq('user_id', userId)`, jadi setiap guru hanya mengambil materi yang ia
// unggah sendiri. Supaya ini benar-benar tertutup di sisi server (bukan
// hanya di client), pastikan tabel `materi_file` punya RLS policy sejenis:
//   create policy "guru lihat materi sendiri" on materi_file
//     for select using (auth.uid() = user_id or is_admin(auth.uid()));
// begitu juga bucket storage 'materi' — akses publicUrl memang terbuka,
// tapi listing/insert/delete tetap harus dibatasi ke pemilik + admin.
export const useMateriList = ({ userId, activeTab, filterKategori, search }) => {
  const [materiList, setMateriList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchMateri = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setErrorMsg('');
    try {
      let query = supabase
        .from('materi_file')
        .select('id, nama, tipe, tanggal, url, kelas, status, deskripsi, mapel, bab, sub_bab, kategori, folder_id, bentuk, pengajar, jenis, folder_materi ( id, nama )')
        .eq('user_id', userId)
        .eq('status', activeTab)
        .in('kategori', KATEGORI_FILTER_GROUPS[filterKategori] || [filterKategori])
        .order('tanggal', { ascending: false });

      if (search.trim()) query = query.ilike('nama', `%${search.trim()}%`);

      const { data, error } = await query;
      if (error) throw error;

      setMateriList(data || []);
    } catch (err) {
      console.error(err);
      setErrorMsg('Gagal memuat materi. Coba muat ulang halaman.');
    } finally {
      setLoading(false);
    }
  }, [userId, activeTab, filterKategori, search]);

  useEffect(() => { fetchMateri(); }, [fetchMateri]);

  return { materiList, setMateriList, loading, errorMsg, fetchMateri };
};
