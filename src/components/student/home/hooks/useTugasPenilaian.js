import { useState } from 'react';
import { supabase } from '../../../../supabaseClient';
import { checkedUpdate } from '../../../../utils/supabaseUpdateGuard';
import { MAX_CATATAN_GAMBAR_SIZE } from '../constants';

const FORM_KOSONG = { guruId: '', mapel: '', namaGuruSekolah: '', judulBab: '', tanggal: '', catatanLink: '' };

/**
 * Mengelola kartu "Penilaian/Tugas Terdekat": form tambah/edit catatan
 * tugas/ulangan (dicatat manual oleh siswa), unggah gambar catatan opsional
 * ke bucket "catatan-tugas", simpan (insert/update) ke tabel
 * `tugas_penilaian`, dan hapus.
 */
export function useTugasPenilaian({ profile, setErrorMsg, loadAll }) {
  const [showTugasForm, setShowTugasForm] = useState(false);
  const [editingTugasId, setEditingTugasId] = useState(null);
  const [tugasForm, setTugasForm] = useState(FORM_KOSONG);
  const [catatanGambarFile, setCatatanGambarFile] = useState(null);
  const [catatanGambarPreview, setCatatanGambarPreview] = useState('');
  const [catatanGambarUrlLama, setCatatanGambarUrlLama] = useState('');
  const [catatanGambarDihapus, setCatatanGambarDihapus] = useState(false);
  const [submittingTugas, setSubmittingTugas] = useState(false);

  const [confirmDeleteTugasId, setConfirmDeleteTugasId] = useState(null);
  const [deletingTugasId, setDeletingTugasId] = useState(null);

  const openTugasForm = () => {
    setEditingTugasId(null);
    setTugasForm(FORM_KOSONG);
    setCatatanGambarFile(null);
    setCatatanGambarPreview('');
    setCatatanGambarUrlLama('');
    setCatatanGambarDihapus(false);
    setShowTugasForm(true);
  };

  const openEditTugasForm = (item) => {
    setEditingTugasId(item.id);
    setTugasForm({
      guruId: item.id_guru || '',
      mapel: item.mapel || '',
      namaGuruSekolah: item.nama_guru_sekolah || '',
      judulBab: item.judul_bab || item.materi || '',
      tanggal: item.tanggal || '',
      catatanLink: item.catatan_link || '',
    });
    setCatatanGambarFile(null);
    setCatatanGambarPreview(item.catatan_gambar_url || '');
    setCatatanGambarUrlLama(item.catatan_gambar_url || '');
    setCatatanGambarDihapus(false);
    setErrorMsg('');
    setShowTugasForm(true);
  };

  const closeTugasForm = () => {
    setShowTugasForm(false);
    setEditingTugasId(null);
  };

  const handleCatatanGambarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMsg('File catatan harus berupa gambar.');
      return;
    }
    if (file.size > MAX_CATATAN_GAMBAR_SIZE) {
      setErrorMsg('Ukuran gambar maksimal 5MB.');
      return;
    }
    setErrorMsg('');
    setCatatanGambarFile(file);
    setCatatanGambarPreview(URL.createObjectURL(file));
    setCatatanGambarDihapus(false);
  };

  const removeCatatanGambar = () => {
    setCatatanGambarFile(null);
    setCatatanGambarPreview('');
    // Kalau sebelumnya sudah ada gambar tersimpan (mode edit), tandai supaya
    // saat disimpan gambar itu benar-benar dihapus dari record.
    if (catatanGambarUrlLama) setCatatanGambarDihapus(true);
  };

  const submitTugasPenilaian = async () => {
    if (!tugasForm.guruId) {
      setErrorMsg('Pilih guru les terlebih dahulu.');
      return;
    }
    if (!tugasForm.mapel) {
      setErrorMsg('Pilih mapel terlebih dahulu.');
      return;
    }
    if (!tugasForm.namaGuruSekolah.trim()) {
      setErrorMsg('Nama guru pengajar di sekolah tidak boleh kosong.');
      return;
    }
    if (!tugasForm.judulBab.trim()) {
      setErrorMsg('Judul bab tidak boleh kosong.');
      return;
    }
    if (!tugasForm.tanggal) {
      setErrorMsg('Tanggal tidak boleh kosong.');
      return;
    }
    setSubmittingTugas(true);
    setErrorMsg('');
    try {
      let catatanGambarUrl = catatanGambarUrlLama || null;

      if (catatanGambarFile) {
        const ext = catatanGambarFile.name.split('.').pop();
        const filePath = `${profile.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('catatan-tugas').upload(filePath, catatanGambarFile);
        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage.from('catatan-tugas').getPublicUrl(filePath);
        catatanGambarUrl = publicUrlData?.publicUrl || null;
      } else if (catatanGambarDihapus) {
        catatanGambarUrl = null;
      }

      const payload = {
        // id_guru: guru LES yang punya akun -- menentukan tugas ini tampil di dashboard guru siapa.
        id_guru: tugasForm.guruId,
        mapel: tugasForm.mapel,
        // nama_guru_sekolah: cuma catatan teks, guru sekolah tidak punya akun/tidak ada di database.
        nama_guru_sekolah: tugasForm.namaGuruSekolah.trim(),
        judul_bab: tugasForm.judulBab.trim(),
        tanggal: tugasForm.tanggal,
        catatan_link: tugasForm.catatanLink.trim() || null,
        catatan_gambar_url: catatanGambarUrl,
      };

      if (editingTugasId) {
        const { error } = await checkedUpdate(
          supabase.from('tugas_penilaian').update(payload).eq('id', editingTugasId).eq('siswa_id', profile.id),
          { notFoundMessage: 'Perubahan tidak tersimpan (kemungkinan dibatasi oleh policy keamanan database). Hubungi admin.' }
        );
        if (error) throw error;
      } else {
        const { error } = await supabase.from('tugas_penilaian').insert({
          ...payload,
          nama_siswa: profile.full_name,
          siswa_id: profile.id,
          type: 'Tugas',
        });
        if (error) throw error;
      }

      closeTugasForm();
      setCatatanGambarFile(null);
      setCatatanGambarPreview('');
      setCatatanGambarUrlLama('');
      setCatatanGambarDihapus(false);
      await loadAll();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Gagal menyimpan penilaian/tugas.');
    } finally {
      setSubmittingTugas(false);
    }
  };

  const deleteTugasPenilaian = async (item) => {
    setDeletingTugasId(item.id);
    setErrorMsg('');
    try {
      const { error } = await supabase.from('tugas_penilaian').delete().eq('id', item.id).eq('siswa_id', profile.id);
      if (error) throw error;
      setConfirmDeleteTugasId(null);
      await loadAll();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Gagal menghapus penilaian/tugas.');
    } finally {
      setDeletingTugasId(null);
    }
  };

  return {
    showTugasForm,
    editingTugasId,
    tugasForm,
    setTugasForm,
    catatanGambarFile,
    catatanGambarPreview,
    submittingTugas,
    openTugasForm,
    openEditTugasForm,
    closeTugasForm,
    handleCatatanGambarChange,
    removeCatatanGambar,
    submitTugasPenilaian,
    confirmDeleteTugasId,
    setConfirmDeleteTugasId,
    deletingTugasId,
    deleteTugasPenilaian,
  };
}
