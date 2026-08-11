// src/components/admin/adminAbsensi/use-rekap-siswa.js
//
// Mengelola seluruh state & logic modal "Rekap Pertemuan Siswa": pilih
// siswa/bulan, fetch data, pengelompokan per guru, dan cetak PDF.
// `studentList` & `showToast` di-inject supaya hook ini bisa ditest tanpa
// mem-fetch data master sungguhan.
import { useState, useMemo, useCallback } from 'react';
import { supabase } from '../../../supabaseClient';
import logo from '../../../Resource/PC_Horisontal.png';
import { downloadRekapPdf } from './admin-absensi-print';

const TABLE = 'sesi_pembelajaran';

export function useRekapSiswa({ studentList, showToast }) {
  const [showRekapModal, setShowRekapModal] = useState(false);
  const [rekapSiswaId, setRekapSiswaId] = useState('');
  const [rekapBulan, setRekapBulan] = useState('');
  const [rekapData, setRekapData] = useState([]);
  const [loadingRekap, setLoadingRekap] = useState(false);
  const [siswaName, setSiswaName] = useState('');

  const openRekapModal = useCallback(() => setShowRekapModal(true), []);
  const closeRekapModal = useCallback(() => {
    setShowRekapModal(false);
    setRekapData([]);
  }, []);

  const loadRekap = useCallback(async () => {
    if (!rekapSiswaId || !rekapBulan) {
      showToast?.('warning', 'Pilih siswa dan bulan terlebih dahulu.');
      return;
    }
    setLoadingRekap(true);
    const [year, month] = rekapBulan.split('-');
    const startDate = `${year}-${month}-01`;
    const endDate = `${year}-${month}-${new Date(year, month, 0).getDate()}`;
    const { data, error } = await supabase
      .from(TABLE)
      .select(`
        tanggal, judul_materi, catatan, status,
        guru_id,
        guruProfile:profiles!sesi_pembelajaran_guru_id_fkey(full_name)
      `)
      .eq('siswa_id', rekapSiswaId)
      .gte('tanggal', startDate)
      .lte('tanggal', endDate)
      .order('tanggal', { ascending: true });

    if (error) {
      showToast?.('error', 'Gagal mengambil rekap: ' + error.message);
    } else {
      setRekapData(data || []);
      const siswa = studentList.find((s) => s.id === rekapSiswaId);
      setSiswaName(siswa?.full_name || 'Siswa');
      setShowRekapModal(true);
    }
    setLoadingRekap(false);
  }, [rekapSiswaId, rekapBulan, studentList, showToast]);

  const groupedByGuru = useMemo(() => {
    const groups = {};
    rekapData.forEach((item) => {
      const key = item.guru_id || 'unknown';
      if (!groups[key]) {
        groups[key] = {
          guru_id: key,
          guru_name: item.guruProfile?.full_name || 'Guru tidak diketahui',
          items: [],
        };
      }
      groups[key].items.push(item);
    });
    return Object.values(groups).sort((a, b) => a.guru_name.localeCompare(b.guru_name));
  }, [rekapData]);

  const downloadPdf = useCallback(() => {
    downloadRekapPdf({
      logo,
      siswaName,
      rekapBulan,
      groupedByGuru,
      rekapDataLength: rekapData.length,
      onPopupBlocked: () => showToast?.('warning', 'Mohon izinkan popup untuk mencetak PDF.'),
    });
  }, [siswaName, rekapBulan, groupedByGuru, rekapData.length, showToast]);

  return {
    showRekapModal,
    openRekapModal,
    closeRekapModal,
    rekapSiswaId, setRekapSiswaId,
    rekapBulan, setRekapBulan,
    rekapData,
    loadingRekap,
    siswaName,
    groupedByGuru,
    loadRekap,
    downloadPdf,
  };
}
