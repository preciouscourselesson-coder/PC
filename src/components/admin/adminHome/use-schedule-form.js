// src/components/admin/adminHome/useScheduleForm.js
//
// Custom hook untuk state form "Tambah Jadwal Baru" dan aksi tambah/hapus
// jadwal les. Dipisah dari komponen supaya form panel jadi presentational
// dan validasi/penyimpanan bisa dites terpisah dari markup.
import { useState } from 'react';
import { supabase } from '../../../supabaseClient';

const EMPTY_SCHEDULE_FORM = {
  guru_id: '',
  hari: 'Senin',
  jam_mulai: '',
  jam_selesai: '',
  kelas: '',
  siswa_ids: [],
  tipe: 'Online',
  jenis: 'Private',
  nama_group: '',
};

export function useScheduleForm({ setSchedules, showToast }) {
  const [scheduleForm, setScheduleForm] = useState(EMPTY_SCHEDULE_FORM);

  const handleAddSchedule = async (e) => {
    e.preventDefault();
    try {
      if (scheduleForm.siswa_ids.length === 0) {
        showToast('warning', 'Pilih minimal satu siswa.');
        return;
      }
      let kelasValue = scheduleForm.kelas;
      if (scheduleForm.jenis === 'Group') {
        if (!scheduleForm.nama_group.trim()) {
          showToast('warning', 'Nama Group wajib diisi.');
          return;
        }
        kelasValue = scheduleForm.nama_group.trim();
      } else {
        if (!scheduleForm.kelas.trim()) {
          showToast('warning', 'Kelas wajib diisi.');
          return;
        }
        kelasValue = scheduleForm.kelas.trim();
      }

      const payload = {
        guru_id: scheduleForm.guru_id,
        hari: scheduleForm.hari,
        jam_mulai: scheduleForm.jam_mulai,
        jam_selesai: scheduleForm.jam_selesai,
        kelas: kelasValue,
        siswa_ids: scheduleForm.siswa_ids,
        tipe: scheduleForm.tipe,
        jenis: scheduleForm.jenis,
        is_temporary: false,
      };
      const { data, error } = await supabase.from('jadwal_les').insert([payload]).select();
      if (error) throw error;
      setSchedules((prev) => [...prev, ...(data || [])]);
      setScheduleForm(EMPTY_SCHEDULE_FORM);
    } catch (err) {
      showToast('error', 'Gagal menyimpan jadwal guru: ' + err.message);
    }
  };

  const handleDeleteJadwal = async (id) => {
    if (!window.confirm('Yakin ingin menghapus jadwal ini? Tindakan ini tidak bisa dibatalkan.')) return;
    try {
      const { error } = await supabase.from('jadwal_les').delete().eq('id', id);
      if (error) throw error;
      setSchedules((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      showToast('error', 'Gagal menghapus jadwal: ' + err.message);
    }
  };

  return {
    scheduleForm,
    setScheduleForm,
    handleAddSchedule,
    handleDeleteJadwal,
  };
}
