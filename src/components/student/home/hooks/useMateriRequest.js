import { useState } from 'react';
import { supabase } from '../../../../supabaseClient';
import { MAX_MATERI_FILE_SIZE } from '../constants';

const FORM_KOSONG = { guruId: '', judul: '', deskripsi: '' };

/**
 * Mengelola form "Minta Materi": pilih guru tujuan, judul, deskripsi, dan
 * lampiran file opsional yang diunggah ke Supabase Storage bucket
 * "materi-request-files" sebelum baris `materi_request` disimpan.
 */
export function useMateriRequest({ profile, setErrorMsg, loadAll }) {
  const [materiForm, setMateriForm] = useState(FORM_KOSONG);
  const [materiFile, setMateriFile] = useState(null);
  const [submittingMateri, setSubmittingMateri] = useState(false);

  const handleMateriFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_MATERI_FILE_SIZE) {
      setErrorMsg('Ukuran file maksimal 10MB.');
      e.target.value = '';
      return;
    }
    setErrorMsg('');
    setMateriFile(file);
  };

  const removeMateriFile = () => {
    setMateriFile(null);
  };

  const submitMateriRequest = async () => {
    if (!materiForm.judul.trim()) {
      setErrorMsg('Judul materi tidak boleh kosong.');
      return;
    }
    if (!materiForm.guruId) {
      setErrorMsg('Pilih guru tujuan terlebih dahulu.');
      return;
    }
    setSubmittingMateri(true);
    setErrorMsg('');
    try {
      let fileUrl = null;
      let fileName = null;

      if (materiFile) {
        const ext = materiFile.name.split('.').pop();
        const filePath = `${profile.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('materi-request-files').upload(filePath, materiFile);
        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage.from('materi-request-files').getPublicUrl(filePath);
        fileUrl = publicUrlData?.publicUrl || null;
        fileName = materiFile.name;
      }

      const payload = {
        guru_id: materiForm.guruId,
        siswa_id: profile.id,
        siswa_nama: profile.full_name,
        kelas: profile.kelas || '-',
        judul_materi: materiForm.judul.trim(),
        deskripsi: materiForm.deskripsi.trim() || null,
        file_url: fileUrl,
        file_name: fileName,
        status: 'baru',
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('materi_request').insert(payload);
      if (error) throw error;

      try {
        const { data: guruData } = await supabase.from('guru').select('profile_id').eq('id', materiForm.guruId).single();
        if (guruData?.profile_id) {
          await supabase.from('notifikasi').insert({
            user_id: guruData.profile_id,
            pesan: `Siswa ${profile.full_name} meminta materi: "${materiForm.judul.trim()}"`,
            link: null,
          });
        }
      } catch (notifErr) {
        console.error('Gagal kirim notifikasi ke guru:', notifErr);
      }

      setMateriForm(FORM_KOSONG);
      setMateriFile(null);
      await loadAll();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Gagal mengirim permintaan materi.');
    } finally {
      setSubmittingMateri(false);
    }
  };

  return {
    materiForm,
    setMateriForm,
    materiFile,
    submittingMateri,
    handleMateriFileChange,
    removeMateriFile,
    submitMateriRequest,
  };
}
