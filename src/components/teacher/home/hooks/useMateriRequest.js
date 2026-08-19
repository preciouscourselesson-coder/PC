import { useState } from 'react';
import { supabase } from '../../../../supabaseClient';
import { checkedUpdate } from '../../../../utils/supabaseUpdateGuard';

/**
 * Mengelola respon guru atas permintaan materi dari siswa: tolak dengan
 * catatan, atau selesaikan dengan mengirim materi yang dipilih dari Arsip
 * Materi (upload materi baru dilakukan di halaman Arsip Materi, bukan di
 * sini -- lihat TeacherArsipMateri.js).
 */
export function useMateriRequest({ materiRequestList, setMateriRequestList, materiArsip, setErrorMsg, showToast }) {
  // ========== TOLAK (dengan catatan) ==========
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

  // ========== KIRIM MATERI (pilih dari Arsip Materi yang sudah ada) ==========
  const [showKirimMateri, setShowKirimMateri] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [selectedMateriId, setSelectedMateriId] = useState('');
  const [kirimMateriNote, setKirimMateriNote] = useState('');
  const [kirimMateriSubmitting, setKirimMateriSubmitting] = useState(false);

  const openKirimMateri = (requestId) => {
    setSelectedRequestId(requestId);
    setSelectedMateriId('');
    setKirimMateriNote('');
    setShowKirimMateri(true);
  };

  const closeKirimMateri = () => {
    setShowKirimMateri(false);
    setSelectedRequestId(null);
    setSelectedMateriId('');
    setKirimMateriNote('');
  };

  // Menyelesaikan request materi + mengaitkan file materi (materi_file_id) yang menjawabnya,
  // lalu memberi notifikasi ke siswa.
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
    if (!selectedMateriId) {
      showToast('warning', 'Pilih materi yang akan dikirim.');
      return;
    }

    setKirimMateriSubmitting(true);
    try {
      // Dibandingkan sebagai string karena <select> selalu mengembalikan
      // e.target.value berupa string, sedangkan m.id dari database bisa
      // berupa number (bigint/serial) -- tanpa ini find() selalu gagal
      // walau item-nya kelihatan sudah terpilih di dropdown.
      const materi = materiArsip.find((m) => String(m.id) === String(selectedMateriId));
      if (!materi) throw new Error('Materi tidak ditemukan di arsip.');
      await selesaikanRequestDenganMateri(request, materi.id, materi.nama);
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
    selectedMateriId,
    setSelectedMateriId,
    kirimMateriNote,
    setKirimMateriNote,
    kirimMateriSubmitting,
    openKirimMateri,
    closeKirimMateri,
    submitKirimMateri,
  };
}
