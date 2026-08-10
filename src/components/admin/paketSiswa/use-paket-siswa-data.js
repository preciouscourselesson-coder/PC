// src/components/admin/paketSiswa/usePaketSiswaData.js
//
// Custom hook yang membungkus semua akses Supabase untuk halaman Paket
// Siswa: siapa yang login (admin/guru), daftar paket siswa (dengan join
// siswa + pricelist), dan hapus paket. Dipisah dari komponen supaya
// komponen UI tinggal "consume" data & handler, dan hook ini bisa
// di-test/di-mock terpisah dari rendering.
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../supabaseClient';
import { getHargaPaket, generateSiswaId } from './paket-siswa-helpers';

export function usePaketSiswaData() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paketList, setPaketList] = useState([]);

  const [userRole, setUserRole] = useState('');
  const [guruId, setGuruId] = useState(null);
  const [guruNama, setGuruNama] = useState('');

  // Ambil role dan guru ID dari user yang sedang login
  useEffect(() => {
    const fetchUser = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id;
      if (!uid) return;

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', uid)
        .maybeSingle();

      if (!profileError && profile) {
        setUserRole(profile.role);
      }

      if (profile?.role === 'teacher') {
        const { data: guru, error: guruError } = await supabase
          .from('guru')
          .select('id, nama')
          .eq('profile_id', uid)
          .maybeSingle();
        if (!guruError && guru) {
          setGuruId(guru.id);
          setGuruNama(guru.nama);
        }
      }
    };
    fetchUser();
  }, []);

  // Ambil data paket siswa (join ke profiles siswa & pricelist)
  const loadPaketSiswa = useCallback(async () => {
    setLoading(true);
    setError('');

    if (userRole === 'teacher' && !guruId) {
      setLoading(false);
      return;
    }

    try {
      let query = supabase.from('paket_siswa').select(`
        *,
        siswa:profiles!paket_siswa_siswa_id_fkey (id, full_name, kelas, gender, created_at),
        pricelist:pricelist!paket_siswa_pricelist_id_fkey (
          id, program, jumlah_pertemuan, durasi, pengajar,
          harga_privat, harga_2siswa, harga_3siswa, harga_4siswa
        )
      `);

      if (userRole === 'teacher' && guruId) {
        query = query.eq('guru_id', guruId);
      }

      const { data, error: queryError } = await query.order('created_at', { ascending: false });

      if (queryError) throw queryError;

      const processed = (data || []).map((item, index) => {
        const siswa = item.siswa;
        const pricelist = item.pricelist || {};
        const siswaId = generateSiswaId(siswa?.created_at, index);
        return {
          ...item,
          siswa_nama: siswa?.full_name || 'Tidak Diketahui',
          siswa_id_display: siswaId,
          kelas_siswa: siswa?.kelas || '-',
          paket: pricelist.program || 'Paket Reguler',
          mapel: 'Matematika', // FIXME: ambil dari data asli
          program: 'Regular', // FIXME: ambil dari data asli
          jenis: item.jenis || 'Private', // ambil dari kolom jenis di paket_siswa
          jumlah_siswa_group: item.jumlah_siswa_group || null,
          pengajar: pricelist.pengajar || '-',
          durasi: pricelist.durasi || '-',
          harga: item.harga_custom != null
            ? item.harga_custom
            : getHargaPaket(item.jenis, item.jumlah_siswa_group, pricelist),
          harga_dari_pricelist: getHargaPaket(item.jenis, item.jumlah_siswa_group, pricelist),
          is_harga_custom: item.harga_custom != null,
          catatan_harga_custom: item.catatan_harga_custom || null,
          pricelist: pricelist,
          total_pertemuan: item.total_pertemuan,
          sisa_pertemuan: item.sisa_pertemuan,
          tanggal_mulai: item.tanggal_mulai,
          tanggal_berakhir: item.tanggal_berakhir,
          status: item.status,
        };
      });

      setPaketList(processed);
    } catch (err) {
      console.error('Error loading paket siswa:', err);
      setError('Gagal memuat data paket siswa: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [userRole, guruId]);

  useEffect(() => {
    if (userRole) loadPaketSiswa();
  }, [userRole, loadPaketSiswa]);

  // Hapus satu paket siswa. Konfirmasi (window.confirm) & toast tetap jadi
  // tanggung jawab komponen pemanggil -- hook ini murni operasi data.
  const deletePaket = useCallback(async (id) => {
    setLoading(true);
    try {
      const { error: deleteError } = await supabase.from('paket_siswa').delete().eq('id', id);
      if (deleteError) throw deleteError;
      await loadPaketSiswa();
      return { error: null };
    } catch (err) {
      setLoading(false);
      return { error: err };
    }
  }, [loadPaketSiswa]);

  return {
    loading,
    error,
    paketList,
    userRole,
    guruId,
    guruNama,
    loadPaketSiswa,
    deletePaket,
  };
}