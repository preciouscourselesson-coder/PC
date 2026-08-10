// src/components/admin/adminHome/useScheduleChangeForm.js
//
// Custom hook untuk state form "Ajukan Perubahan Jadwal" (permanen atau
// sementara/satu kali) dan aksi hapus perubahan jadwal sementara. Dipisah
// dari komponen supaya ScheduleChangePanel jadi presentational.
import { useState } from 'react';
import { supabase } from '../../../supabaseClient';
import { checkedUpdate } from '../../../utils/supabaseUpdateGuard';

const EMPTY_CHANGE_FORM = {
  jadwal_id: '',
  jenis: 'Permanen',
  hari_baru: '',
  jam_mulai_baru: '',
  jam_selesai_baru: '',
  tanggal_temporary: '',
  alasan: '',
};

export function useScheduleChangeForm({ schedules, setSchedules, showToast }) {
  const [showChangeForm, setShowChangeForm] = useState(false);
  const [changeForm, setChangeForm] = useState(EMPTY_CHANGE_FORM);

  const handleScheduleChange = async (e) => {
    e.preventDefault();
    try {
      const original = schedules.find((s) => String(s.id) === String(changeForm.jadwal_id));
      if (!original) throw new Error('Jadwal asal tidak ditemukan');

      if (changeForm.jenis === 'Permanen') {
        const { data, error } = await checkedUpdate(
          supabase.from('jadwal_les').update({
            hari: changeForm.hari_baru || original.hari,
            jam_mulai: changeForm.jam_mulai_baru || original.jam_mulai,
            jam_selesai: changeForm.jam_selesai_baru || original.jam_selesai,
          }).eq('id', original.id)
        );
        if (error) throw error;
        setSchedules((prev) => prev.map((s) => (s.id === original.id ? data[0] : s)));
      } else {
        if (!changeForm.tanggal_temporary) throw new Error('Tanggal perubahan sementara wajib diisi');
        const { data, error } = await supabase.from('jadwal_les').insert([{
          guru_id: original.guru_id,
          kelas: original.kelas,
          siswa_ids: original.siswa_ids,
          tipe: original.tipe,
          jenis: original.jenis,
          hari: changeForm.hari_baru || original.hari,
          jam_mulai: changeForm.jam_mulai_baru || original.jam_mulai,
          jam_selesai: changeForm.jam_selesai_baru || original.jam_selesai,
          is_temporary: true,
          tanggal_temporary: changeForm.tanggal_temporary,
          alasan: changeForm.alasan,
        }]).select();
        if (error) throw error;
        setSchedules((prev) => [...prev, ...(data || [])]);
      }
      setChangeForm(EMPTY_CHANGE_FORM);
      setShowChangeForm(false);
    } catch (err) {
      showToast('error', 'Gagal menyimpan perubahan jadwal: ' + err.message);
    }
  };

  const handleDeleteScheduleChange = async (id) => {
    if (!window.confirm('Yakin ingin menghapus perubahan jadwal sementara ini?')) return;
    try {
      const { error } = await supabase.from('jadwal_les').delete().eq('id', id);
      if (error) throw error;
      setSchedules((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      showToast('error', 'Gagal menghapus perubahan jadwal: ' + err.message);
    }
  };

  return {
    showChangeForm,
    setShowChangeForm,
    changeForm,
    setChangeForm,
    handleScheduleChange,
    handleDeleteScheduleChange,
  };
}
