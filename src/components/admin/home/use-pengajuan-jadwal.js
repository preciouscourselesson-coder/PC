// src/components/admin/adminHome/usePengajuanJadwal.js
//
// Custom hook untuk menyetujui/menolak pengajuan perubahan jadwal yang
// datang dari guru/siswa dan sudah menunggu keputusan admin. Dipisah dari
// useScheduleChangeForm karena scope-nya beda: ini merespons pengajuan
// orang lain, bukan mengajukan perubahan sendiri.
//
// Saat admin MENYETUJUI perubahan PERMANEN, hook ini memanggil RPC
// `terapkan_keputusan_pengajuan_jadwal` (lihat file SQL terkait) yang secara
// atomik: mengecek bentrok jadwal, mengeluarkan siswa dari jadwal lama, dan
// memasukkannya ke jadwal baru -- semua dalam satu transaksi database.
import { useState } from 'react';
import { supabase } from '../../../supabaseClient';

const formatJam = (t) => (t ? t.slice(0, 5) : '');

// Kirim notifikasi ke siswa & guru yang terlibat dalam satu pengajuan setelah
// admin memutuskan (setuju/tolak). Kegagalan kirim notifikasi tidak boleh
// menggagalkan proses approve/reject itu sendiri, makanya dibungkus try/catch
// terpisah dan hanya di-log kalau error.
const kirimNotifikasiKeputusanAdmin = async (p, setuju) => {
  try {
    const jadwalBaru = `${p.hari_baru || '-'} ${formatJam(p.jam_mulai_baru)}${p.jam_mulai_baru ? '-' : ''}${formatJam(p.jam_selesai_baru)}`.trim();
    const pesan = setuju
      ? `Perubahan jadwal ke ${jadwalBaru} telah dikonfirmasi oleh admin.`
      : `Pengajuan perubahan jadwal ke ${jadwalBaru} ditolak oleh admin.`;

    const penerimaUserIds = new Set();

    // Siswa: siswa_id pada pengajuan_perubahan_jadwal sudah berupa profile id.
    if (p.siswa_id) {
      penerimaUserIds.add(p.siswa_id);
    }

    // Guru: guru_id merujuk ke tabel `guru`, perlu lookup profile_id-nya.
    if (p.guru_id) {
      const { data: guruData, error: guruError } = await supabase
        .from('guru')
        .select('profile_id')
        .eq('id', p.guru_id)
        .single();
      if (!guruError && guruData?.profile_id) {
        penerimaUserIds.add(guruData.profile_id);
      }
    }

    if (penerimaUserIds.size === 0) return;

    await supabase.from('notifikasi').insert(
      Array.from(penerimaUserIds).map((userId) => ({
        user_id: userId,
        pesan,
        link: null,
      }))
    );
  } catch (notifErr) {
    console.error('Gagal mengirim notifikasi keputusan admin:', notifErr);
  }
};

export function usePengajuanJadwal({ setPengajuanJadwal, setErrorMsg, setSchedules }) {
  const [respondingPengajuanId, setRespondingPengajuanId] = useState(null);

  const handleRespondPengajuanAdmin = async (p, setuju) => {
    setRespondingPengajuanId(p.id);
    setErrorMsg('');
    try {
      // Proses keputusan (setuju/tolak) secara atomik lewat RPC. Untuk
      // perubahan permanen, RPC ini juga yang mengurus pemindahan siswa dari
      // jadwal lama ke jadwal baru + cek bentrok jadwal guru.
      const { error } = await supabase.rpc('terapkan_keputusan_pengajuan_jadwal', {
        p_pengajuan_id: p.id,
        p_setuju: setuju,
      });

      if (error) throw error;

      // Beri tahu siswa & guru terkait bahwa admin sudah memutuskan.
      await kirimNotifikasiKeputusanAdmin(p, setuju);

      setPengajuanJadwal((prev) => prev.filter((item) => item.id !== p.id));

      // Kalau ini perubahan PERMANEN yang disetujui, jadwal_les di database
      // sudah berubah (siswa pindah dari slot lama ke slot baru) lewat RPC
      // di atas -- muat ulang daftar jadwal supaya tampilan admin ikut update.
      if (setuju && !p.is_temporary_baru && typeof setSchedules === 'function') {
        const { data: jadwalTerbaru, error: jadwalError } = await supabase
          .from('jadwal_les')
          .select('*');
        if (!jadwalError && jadwalTerbaru) {
          setSchedules(jadwalTerbaru);
        }
      }
    } catch (err) {
      console.error(err);
      // Pesan dari RAISE EXCEPTION di RPC (mis. bentrok jadwal) otomatis
      // muncul di err.message, jadi admin langsung tahu alasan kegagalannya.
      setErrorMsg(err.message || 'Gagal memperbarui pengajuan.');
    } finally {
      setRespondingPengajuanId(null);
    }
  };

  return { respondingPengajuanId, handleRespondPengajuanAdmin };
}