import { useState } from 'react';
import { supabase } from '../../../../supabaseClient';
import { checkedUpdate } from '../../../../utils/supabaseUpdateGuard';

// Selalu urutkan pasangan id secara konsisten (string compare), supaya 1
// pasangan pengguna cuma pernah punya 1 baris `conversations` -- didup­likasi
// dari buildPair() di ChatMessages.js (tidak diekspor dari sana), HARUS
// tetap identik supaya percakapan guru-siswa yang dibuat dari sini nyambung
// dengan percakapan yang sama saat dibuka lewat halaman Pesan.
const buildPair = (a, b) => (a < b ? [a, b] : [b, a]);

/**
 * Mengelola respon guru atas permintaan materi dari siswa: tolak dengan
 * catatan, atau tandai selesai (upload/kirim materinya sendiri dilakukan
 * terpisah di halaman Arsip Materi -- lihat TeacherArsipMateri.js).
 */
export function useMateriRequest({ materiRequestList, setMateriRequestList, setErrorMsg, showToast }) {
  // ========== TOLAK / TANDAI SELESAI (dengan catatan) ==========
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

  // Kirim hasil respon (selesai/ditolak) sebagai PESAN CHAT dari guru ke
  // siswa -- bukan lagi ke tabel `notifikasi`. Memakai tabel `conversations`
  // + `messages` yang sama persis dengan ChatMessages.js, supaya pesan ini
  // muncul di halaman Pesan siswa sebagai chat biasa dari gurunya (siswa
  // bisa langsung membalas dari sana kalau perlu, tidak seperti notifikasi
  // satu-arah sebelumnya).
  const sendRespondAsChat = async (siswaId, pesan) => {
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr) throw authErr;
    const guruId = authData?.user?.id;
    if (!guruId) throw new Error('Sesi login guru tidak ditemukan.');

    // 1. Cari percakapan guru-siswa yang sudah ada, atau buat baru kalau
    //    belum pernah chat sama sekali (identik dengan startConversation()
    //    di ChatMessages.js).
    const [p1, p2] = buildPair(guruId, siswaId);
    const { data: found, error: findErr } = await supabase
      .from('conversations')
      .select('*')
      .eq('participant_one', p1)
      .eq('participant_two', p2)
      .maybeSingle();
    if (findErr) throw findErr;

    let convRow = found;
    if (!convRow) {
      const { data: created, error: createErr } = await supabase
        .from('conversations')
        .insert([{ participant_one: p1, participant_two: p2 }])
        .select()
        .single();
      if (createErr) throw createErr;
      convRow = created;
    }

    // 2. Insert pesan ke percakapan tsb, dikirim atas nama guru.
    const { error: msgErr } = await supabase
      .from('messages')
      .insert([{
        conversation_id: convRow.id,
        sender_id: guruId,
        content: pesan,
        is_read: false,
      }]);
    if (msgErr) throw msgErr;

    // 3. Perbarui ringkasan percakapan (last_message/last_message_at) supaya
    //    langsung terlihat di daftar Percakapan siswa -- best-effort, tidak
    //    membatalkan pengiriman kalau ini gagal (pesannya sendiri sudah
    //    tersimpan di langkah 2).
    const { error: updErr } = await supabase
      .from('conversations')
      .update({ last_message: pesan, last_message_at: new Date().toISOString() })
      .eq('id', convRow.id);
    if (updErr) console.error('Gagal memperbarui ringkasan percakapan:', updErr);
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

      // Kirim hasil respon sebagai chat ke siswa (berlaku untuk 'selesai'
      // MAUPUN 'ditolak' -- khusus penolakan ini penting supaya siswa tidak
      // menunggu tanpa kepastian). Status materi_request sendiri sudah
      // tersimpan di atas terlepas dari berhasil/tidaknya pengiriman chat
      // ini -- tapi kalau gagal, guru diberi tahu lewat toast (bukan cuma
      // silent console.error) supaya guru bisa menginformasikan siswa
      // secara manual kalau perlu.
      if (item?.siswa_id) {
        try {
          const label = materiRespondAksi === 'selesai' ? 'diselesaikan' : 'ditolak';
          const pesan = `Permintaan materi "${item.judul_materi}" telah ${label}.${materiCatatan ? ` Catatan: ${materiCatatan}` : ''}`;
          await sendRespondAsChat(item.siswa_id, pesan);
        } catch (chatErr) {
          console.error('Gagal mengirim pesan chat ke siswa:', chatErr);
          showToast('warning', `Status permintaan tersimpan, tapi pesan ke siswa gagal terkirim: ${chatErr.message}`);
        }
      } else {
        // materiRequestList tidak punya siswa_id pada item ini -- kemungkinan
        // query di useTeacherHomeData.js belum menyertakan kolom siswa_id.
        // Tanpa siswa_id, pesan TIDAK PERNAH bisa dikirim (baik untuk
        // 'selesai' maupun 'ditolak'), walau status di materi_request sendiri
        // sudah benar tersimpan.
        console.warn('materi_request tidak punya siswa_id -- pesan chat ke siswa dilewati.');
        showToast('warning', 'Status tersimpan, tapi siswa tidak bisa dikirimi pesan (data siswa_id tidak ditemukan pada permintaan ini).');
      }

      cancelMateriRespond();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Gagal memperbarui materi request.');
    } finally {
      setMateriResponding(false);
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
  };
}