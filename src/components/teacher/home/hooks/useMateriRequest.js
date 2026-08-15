import { useState } from 'react';
import { supabase } from '../../../../supabaseClient';
import { checkedUpdate } from '../../../../utils/supabaseUpdateGuard';

const KIRIM_BARU_KOSONG = { judul: '', mapel: '', bab: '', bentuk: 'File', file: null, link: '' };

const uploadMateriFile = async (file, authUid) => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}.${fileExt}`;
  const filePath = `${authUid}/${fileName}`;
  const { error } = await supabase.storage.from('materi').upload(filePath, file, { cacheControl: '3600', upsert: false });
  if (error) throw error;
  const { data: urlData } = supabase.storage.from('materi').getPublicUrl(filePath);
  return urlData.publicUrl;
};

/**
 * Mengelola respon guru atas permintaan materi dari siswa: tandai
 * selesai/tolak langsung, atau kirim materi (pilih dari arsip yang sudah ada,
 * atau upload file/link baru yang otomatis tersimpan ke arsip dengan
 * kategori 'Request').
 */
export function useMateriRequest({ guru, profileId, materiRequestList, setMateriRequestList, materiArsip, setMateriArsip, setErrorMsg, showToast }) {
  // ========== RESPON LANGSUNG (Selesai / Tolak) ==========
  const [materiRespondId, setMateriRespondId] = useState(null);
  const [materiRespondAksi, setMateriRespondAksi] = useState(null);
  const [materiCatatan, setMateriCatatan] = useState('');
  const [materiResponding, setMateriResponding] = useState(false);

  const openMateriRespond = (id, aksi) => {
    setMateriRespondId(id);
    setMateriRespondAksi(aksi);
    setMateriCatatan('');
  };

  const cancelMateriRespond = () => {
    setMateriRespondId(null);
    setMateriRespondAksi(null);
    setMateriCatatan('');
  };

  const submitMateriRespond = async () => {
    if (!materiRespondId || !materiRespondAksi) return;
    setMateriResponding(true);
    setErrorMsg('');
    try {
      const item = materiRequestList.find((m) => m.id === materiRespondId);
      const { error } = await checkedUpdate(
        supabase
          .from('materi_request')
          .update({
            status: materiRespondAksi,
            catatan_guru: materiCatatan || null,
            responded_at: new Date().toISOString(),
          })
          .eq('id', materiRespondId)
      );
      if (error) throw error;
      setMateriRequestList((list) =>
        list.map((m) => (m.id === materiRespondId ? { ...m, status: materiRespondAksi, catatan_guru: materiCatatan || null } : m))
      );
      if (item?.siswa_id) {
        try {
          const label = materiRespondAksi === 'selesai' ? 'diselesaikan' : 'ditolak';
          await supabase.from('notifikasi').insert({
            user_id: item.siswa_id,
            pesan: `Permintaan materi "${item.judul_materi}" telah ${label} oleh guru.${materiCatatan ? ` Catatan: ${materiCatatan}` : ''}`,
            link: null,
          });
        } catch (notifErr) {
          console.error('Gagal mengirim notifikasi ke siswa:', notifErr);
        }
      }
      cancelMateriRespond();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Gagal memperbarui materi request.');
    } finally {
      setMateriResponding(false);
    }
  };

  // ========== KIRIM MATERI (dari arsip, atau upload baru yang otomatis masuk arsip) ==========
  const [showKirimMateri, setShowKirimMateri] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [kirimMateriMode, setKirimMateriMode] = useState('arsip'); // 'arsip' | 'baru'
  const [selectedMateriId, setSelectedMateriId] = useState('');
  const [kirimMateriNote, setKirimMateriNote] = useState('');
  const [kirimBaruForm, setKirimBaruForm] = useState(KIRIM_BARU_KOSONG);
  const [kirimMateriSubmitting, setKirimMateriSubmitting] = useState(false);

  const openKirimMateri = (requestId) => {
    const request = materiRequestList.find((m) => m.id === requestId);
    setSelectedRequestId(requestId);
    setKirimMateriMode('arsip');
    setSelectedMateriId('');
    setKirimMateriNote('');
    setKirimBaruForm({ ...KIRIM_BARU_KOSONG, judul: request?.judul_materi || '' });
    setShowKirimMateri(true);
  };

  const closeKirimMateri = () => {
    setShowKirimMateri(false);
    setSelectedRequestId(null);
    setSelectedMateriId('');
    setKirimMateriNote('');
    setKirimBaruForm(KIRIM_BARU_KOSONG);
  };

  // Menyelesaikan request materi + mengaitkan file materi (materi_file_id) yang menjawabnya,
  // lalu memberi notifikasi ke siswa. Dipakai oleh kedua mode (pilih arsip / upload baru).
  const selesaikanRequestDenganMateri = async (request, materiFileId, materiNama) => {
    const catatan = `Materi "${materiNama}" telah dikirimkan.${kirimMateriNote ? ` Catatan: ${kirimMateriNote}` : ''}`;
    const { error } = await checkedUpdate(
      supabase
        .from('materi_request')
        .update({
          status: 'selesai',
          catatan_guru: catatan,
          responded_at: new Date().toISOString(),
          materi_file_id: materiFileId,
        })
        .eq('id', request.id)
    );
    if (error) throw error;
    if (request.siswa_id) {
      await supabase.from('notifikasi').insert({
        user_id: request.siswa_id,
        pesan: `Guru telah mengirimkan materi "${materiNama}" untuk permintaan "${request.judul_materi}". Silakan cek materi di dashboard Anda.`,
        link: null,
      });
    }
    setMateriRequestList((list) =>
      list.map((m) => (m.id === request.id ? { ...m, status: 'selesai', catatan_guru: catatan, materi_file_id: materiFileId } : m))
    );
  };

  const submitKirimMateri = async () => {
    const request = materiRequestList.find((m) => m.id === selectedRequestId);
    if (!request) {
      showToast('warning', 'Data permintaan tidak ditemukan.');
      return;
    }

    setKirimMateriSubmitting(true);
    try {
      if (kirimMateriMode === 'arsip') {
        if (!selectedMateriId) {
          showToast('warning', 'Pilih materi yang akan dikirim.');
          return;
        }
        // Dibandingkan sebagai string karena <select> selalu mengembalikan
        // e.target.value berupa string, sedangkan m.id dari database bisa
        // berupa number (bigint/serial) -- tanpa ini find() selalu gagal
        // walau item-nya kelihatan sudah terpilih di dropdown.
        const materi = materiArsip.find((m) => String(m.id) === String(selectedMateriId));
        if (!materi) throw new Error('Materi tidak ditemukan di arsip.');
        await selesaikanRequestDenganMateri(request, materi.id, materi.nama);
      } else {
        // Mode upload baru: guru mengunggah file/link baru khusus untuk request ini.
        // File ini otomatis tersimpan ke materi_file dengan kategori 'Request', sehingga
        // langsung muncul juga di halaman Arsip Materi (TeacherArsipMateri.js).
        if (!kirimBaruForm.judul.trim()) {
          showToast('warning', 'Isi judul materi.');
          return;
        }
        if (kirimBaruForm.bentuk === 'File' && !kirimBaruForm.file) {
          showToast('warning', 'Pilih file untuk diunggah.');
          return;
        }
        if (kirimBaruForm.bentuk === 'Link' && !kirimBaruForm.link.trim()) {
          showToast('warning', 'Isi tautan (link) materi.');
          return;
        }

        let finalUrl = '';
        let tipe = 'link';
        if (kirimBaruForm.bentuk === 'File') {
          finalUrl = await uploadMateriFile(kirimBaruForm.file, profileId);
          tipe = kirimBaruForm.file.type || kirimBaruForm.file.name.split('.').pop();
        } else {
          finalUrl = kirimBaruForm.link.trim();
          tipe = 'link';
        }

        const { data: inserted, error: insertError } = await supabase
          .from('materi_file')
          .insert({
            mapel: kirimBaruForm.mapel.trim() || null,
            bab: kirimBaruForm.bab.trim() || null,
            sub_bab: null,
            user_id: profileId,
            nama: kirimBaruForm.judul.trim(),
            tipe,
            diupload_oleh: guru?.nama || '',
            tanggal: new Date().toISOString(),
            url: finalUrl,
            kelas: request.kelas || null,
            deskripsi: request.deskripsi || null,
            status: 'Dipublish',
            kategori: 'Request',
            folder_id: null,
            bentuk: kirimBaruForm.bentuk,
            pengajar: null,
            jenis: null,
          })
          .select('id, nama, mapel, bab, sub_bab, kategori, kelas, tipe, url, status')
          .single();
        if (insertError) throw insertError;

        setMateriArsip((prev) => [inserted, ...prev]);
        await selesaikanRequestDenganMateri(request, inserted.id, inserted.nama);
      }
      closeKirimMateri();
    } catch (err) {
      console.error(err);
      showToast('error', 'Gagal mengirim materi: ' + err.message);
    } finally {
      setKirimMateriSubmitting(false);
    }
  };

  return {
    materiRespondId,
    materiRespondAksi,
    materiCatatan,
    setMateriCatatan,
    materiResponding,
    openMateriRespond,
    cancelMateriRespond,
    submitMateriRespond,

    showKirimMateri,
    selectedRequestId,
    kirimMateriMode,
    setKirimMateriMode,
    selectedMateriId,
    setSelectedMateriId,
    kirimMateriNote,
    setKirimMateriNote,
    kirimBaruForm,
    setKirimBaruForm,
    kirimMateriSubmitting,
    openKirimMateri,
    closeKirimMateri,
    submitKirimMateri,
  };
}
