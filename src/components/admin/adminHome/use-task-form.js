// src/components/admin/adminHome/useTaskForm.js
//
// Custom hook untuk state form Tugas/Penilaian dan aksi CRUD-nya
// (tambah & hapus). Toast/konfirmasi tetap jadi tanggung jawab pemanggil
// lewat parameter `showToast`, hook ini fokus ke state form + panggilan
// Supabase (sama pola dengan handler di usePaketSiswaData/FormTambahSiswa).
import { useState } from 'react';
import { supabase } from '../../../supabaseClient';

const EMPTY_TASK_FORM = { judul: '', kelas: '', tanggal: '', type: 'Tugas' };

export function useTaskForm({ setTasks, showToast }) {
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState(EMPTY_TASK_FORM);

  const openTaskFormForDate = (dateStr) => {
    setTaskForm((prev) => ({ ...prev, tanggal: dateStr }));
    setShowTaskForm(true);
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase.from('tugas_penilaian').insert([taskForm]).select();
      if (error) throw error;
      setTasks((prev) => [...prev, ...(data || [])]);
      setTaskForm(EMPTY_TASK_FORM);
      setShowTaskForm(false);
    } catch (err) {
      showToast('error', 'Gagal menyimpan tugas: ' + err.message);
    }
  };

  const handleDeleteTask = async (id) => {
    if (!window.confirm('Yakin ingin menghapus tugas/penilaian ini?')) return;
    try {
      const { error } = await supabase.from('tugas_penilaian').delete().eq('id', id);
      if (error) throw error;
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      showToast('error', 'Gagal menghapus: ' + err.message);
    }
  };

  return {
    showTaskForm,
    setShowTaskForm,
    taskForm,
    setTaskForm,
    openTaskFormForDate,
    handleAddTask,
    handleDeleteTask,
  };
}
