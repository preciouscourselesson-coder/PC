import { useState } from 'react';
import { supabase } from '../../../../supabaseClient';

const UJIAN_FORM_KOSONG = {
  mapel_id: '',
  bab_id: '',
  materi: '',
  nama_siswa: '',
  tanggal: '',
  deskripsi: '',
};

/**
 * Mengelola form "Tambah Jadwal Penilaian/Tugas" milik guru: pilih
 * mapel -> muat daftar bab terkait, submit (langsung aktif + notifikasi ke
 * admin), dan hapus penilaian/tugas yang sudah dibuat.
 */
export function useUjianPenilaian({ guru, mapelOptions, setErrorMsg, showToast, loadAll }) {
  const [showUjianForm, setShowUjianForm] = useState(false);
  const [ujianForm, setUjianForm] = useState(UJIAN_FORM_KOSONG);
  const [ujianBabOptions, setUjianBabOptions] = useState([]);
  const [submittingUjian, setSubmittingUjian] = useState(false);

  const [confirmDeleteUjianId, setConfirmDeleteUjianId] = useState(null);
  const [deletingUjianId, setDeletingUjianId] = useState(null);

  const loadUjianBab = async (mapelId) => {
    if (!mapelId) {
      setUjianBabOptions([]);
      return;
    }
    const { data, error } = await supabase.from('materi_bab').select('*').eq('mapel_id', mapelId).order('urutan');
    if (!error) setUjianBabOptions(data || []);
  };

  const closeUjianForm = () => {
    setShowUjianForm(false);
    setUjianBabOptions([]);
  };

  const submitUjian = async () => {
    if (!ujianForm.mapel_id) {
      setErrorMsg('Pilih mapel terlebih dahulu.');
      return;
    }
    if (!ujianForm.bab_id) {
      setErrorMsg('Pilih bab terlebih dahulu.');
      return;
    }
    if (!ujianForm.materi) {
      setErrorMsg('Isi materi terlebih dahulu.');
      return;
    }
    if (!ujianForm.tanggal) {
      setErrorMsg('Isi tanggal terlebih dahulu.');
      return;
    }
    setSubmittingUjian(true);
    setErrorMsg('');
    try {
      const payload = {
        id_mapel: ujianForm.mapel_id,
        id_bab: ujianForm.bab_id,
        materi: ujianForm.materi,
        nama_siswa: ujianForm.nama_siswa || '',
        tanggal: ujianForm.tanggal,
        deskripsi: ujianForm.deskripsi || '',
        type: 'Penilaian',
        id_guru: guru.id,
        created_at: new Date().toISOString(),
      };
      const { error } = await supabase.from('tugas_penilaian').insert(payload).select();
      if (error) throw error;
      const mapelNama = mapelOptions.find((m) => m.id === ujianForm.mapel_id)?.nama || '';
      const babNama = ujianBabOptions.find((b) => b.id === ujianForm.bab_id)?.nama || '';
      const { data: adminUsers, error: adminError } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin')
        .eq('status', 'approved');
      if (!adminError && adminUsers && adminUsers.length > 0) {
        for (let admin of adminUsers) {
          await supabase.from('notifikasi').insert({
            user_id: admin.id,
            pesan: `Guru ${guru.nama} menambahkan jadwal penilaian/tugas: ${mapelNama} - ${babNama} (${ujianForm.materi})${
              ujianForm.nama_siswa ? ` untuk ${ujianForm.nama_siswa}` : ''
            } pada tanggal ${ujianForm.tanggal}`,
            link: '/admin/ujian',
          });
        }
      }
      setShowUjianForm(false);
      setUjianForm(UJIAN_FORM_KOSONG);
      setUjianBabOptions([]);
      await loadAll();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Gagal mengajukan penilaian/tugas.');
    } finally {
      setSubmittingUjian(false);
    }
  };

  const deleteUjian = async (item) => {
    setDeletingUjianId(item.id);
    setErrorMsg('');
    try {
      const { error } = await supabase.from('tugas_penilaian').delete().eq('id', item.id).eq('id_guru', guru.id);
      if (error) throw error;
      setConfirmDeleteUjianId(null);
      await loadAll();
    } catch (err) {
      console.error(err);
      showToast('error', 'Gagal menghapus penilaian/tugas: ' + err.message);
    } finally {
      setDeletingUjianId(null);
    }
  };

  return {
    showUjianForm,
    setShowUjianForm,
    closeUjianForm,
    ujianForm,
    setUjianForm,
    ujianBabOptions,
    setUjianBabOptions,
    submittingUjian,
    loadUjianBab,
    submitUjian,
    confirmDeleteUjianId,
    setConfirmDeleteUjianId,
    deletingUjianId,
    deleteUjian,
  };
}
