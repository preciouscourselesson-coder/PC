import { useState } from 'react';
import { supabase } from '../../../../supabaseClient';
import { checkedUpdate } from '../../../../utils/supabaseUpdateGuard';

// ─── Upload jawaban tugas berupa file (PDF/gambar) ──────────────────────────
// `errorMsg`/`setErrorMsg` dioper dari luar (useStudentTasks) karena pesan
// error upload memang sengaja ditampilkan lewat banner error yang sama
// seperti pesan gagal memuat tugas, persis seperti perilaku file aslinya.
export const useUploadAnswer = ({ studentId, tasks, setTasks, errorMsg, setErrorMsg }) => {
  const [uploadingTaskId, setUploadingTaskId] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const openUploadModal = (taskId) => {
    setUploadingTaskId(taskId);
    setUploadFile(null);
    setShowUploadModal(true);
  };

  const closeUploadModal = () => {
    setShowUploadModal(false);
    setUploadingTaskId(null);
    setUploadFile(null);
  };

  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        setErrorMsg('Hanya file gambar atau PDF yang diizinkan.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg('Ukuran file maksimal 5MB.');
        return;
      }
      setUploadFile(file);
      setErrorMsg('');
    }
  };

  const submitUpload = async () => {
    if (!uploadFile || !uploadingTaskId) return;

    setUploading(true);
    setErrorMsg('');

    try {
      const task = tasks.find(t => t.id === uploadingTaskId);
      if (!task || !task.submission_id) {
        throw new Error('Data tugas tidak ditemukan.');
      }

      const fileName = `${studentId}/${Date.now()}_${uploadFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('tugas-siswa')
        .upload(fileName, uploadFile);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('tugas-siswa')
        .getPublicUrl(fileName);

      const { error: updateError } = await checkedUpdate(
        supabase
          .from('pengumpulan_tugas')
          .update({
            status: 'Sudah',
            file_name: uploadFile.name,
            file_url: publicUrlData.publicUrl,
          })
          .eq('id', task.submission_id)
      );

      if (updateError) throw updateError;

      setTasks(prev =>
        prev.map(t =>
          t.id === uploadingTaskId
            ? {
                ...t,
                status_pengumpulan: 'Sudah',
                submission_file_url: publicUrlData.publicUrl,
                submission_file_name: uploadFile.name,
              }
            : t
        )
      );

      closeUploadModal();
      setErrorMsg('');
    } catch (err) {
      console.error(err);
      setErrorMsg('Gagal mengupload jawaban: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  return {
    uploadingTaskId,
    uploadFile,
    uploading,
    showUploadModal,
    errorMsg,
    openUploadModal,
    closeUploadModal,
    handleFileChange,
    submitUpload,
  };
};
