// src/components/admin/paketSiswa/useFormOptions.js
//
// Custom hook khusus untuk mengisi 3 dropdown di FormTambahSiswa: daftar
// siswa, daftar pricelist aktif, dan daftar guru (kalau login sebagai
// admin). Dipisah dari usePaketSiswaData karena scope-nya berbeda (data
// untuk form, bukan data tabel utama) dan hanya dipakai saat form tampil.
import { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';

export function useFormOptions(userRole) {
  const [siswaList, setSiswaList] = useState([]);
  const [pricelistList, setPricelistList] = useState([]);
  const [guruList, setGuruList] = useState([]);

  // Ambil daftar siswa (role = student)
  useEffect(() => {
    const fetchSiswa = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, kelas')
        .eq('role', 'student')
        .order('full_name');
      if (!error) setSiswaList(data || []);
    };
    fetchSiswa();
  }, []);

  // Ambil daftar pricelist yang aktif
  useEffect(() => {
    const fetchPricelist = async () => {
      const { data, error } = await supabase
        .from('pricelist')
        .select('id, program, kelas, jumlah_pertemuan, durasi, pengajar')
        .eq('status', 'Aktif')
        .order('program');
      if (!error) setPricelistList(data || []);
    };
    fetchPricelist();
  }, []);

  // Ambil daftar guru (hanya diperlukan untuk admin, karena admin harus memilih guru penanggung jawab)
  useEffect(() => {
    if (userRole !== 'admin') return;
    const fetchGuru = async () => {
      const { data, error } = await supabase
        .from('guru')
        .select('id, nama')
        .order('nama');
      if (!error) setGuruList(data || []);
    };
    fetchGuru();
  }, [userRole]);

  return { siswaList, pricelistList, guruList };
}