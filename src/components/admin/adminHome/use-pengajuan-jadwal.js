// src/components/admin/adminHome/usePengajuanJadwal.js
//
// Custom hook untuk menyetujui/menolak pengajuan perubahan jadwal yang
// datang dari guru/siswa dan sudah menunggu keputusan admin. Dipisah dari
// useScheduleChangeForm karena scope-nya beda: ini merespons pengajuan
// orang lain, bukan mengajukan perubahan sendiri.
import { useState } from 'react';
import { supabase } from '../../../supabaseClient';
import { checkedUpdate } from '../../../utils/supabaseUpdateGuard';

export function usePengajuanJadwal({ setPengajuanJadwal, setErrorMsg }) {
  const [respondingPengajuanId, setRespondingPengajuanId] = useState(null);

  const handleRespondPengajuanAdmin = async (p, setuju) => {
    setRespondingPengajuanId(p.id);
    setErrorMsg('');
    try {
      const newStatus = setuju ? 'disetujui_admin' : 'ditolak_admin';
      const { error } = await checkedUpdate(
        supabase
          .from('pengajuan_perubahan_jadwal')
          .update({ status: newStatus })
          .eq('id', p.id),
        { notFoundMessage: 'Perubahan tidak tersimpan (kemungkinan dibatasi oleh policy keamanan database).' }
      );

      if (error) throw error;

      setPengajuanJadwal((prev) => prev.filter((item) => item.id !== p.id));
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Gagal memperbarui pengajuan.');
    } finally {
      setRespondingPengajuanId(null);
    }
  };

  return { respondingPengajuanId, handleRespondPengajuanAdmin };
}
