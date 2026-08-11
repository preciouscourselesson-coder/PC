// Hook untuk state modal "Tambah User" beserta submit-nya lewat Edge Function.
import { useState } from 'react';
import { createUserViaEdgeFunction } from '../utils/api';

const EMPTY_FORM = { full_name: '', email: '', password: '', role: 'student', gender: '', kelas: '' };

export default function useAddUserForm({ setToast, fetchUsers }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_FORM);
  const [addSubmitting, setAddSubmitting] = useState(false);

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!addForm.full_name || !addForm.email || !addForm.password) {
      setToast({ type: 'error', message: 'Semua field wajib diisi.' });
      return;
    }
    if (addForm.password.length < 6) {
      setToast({ type: 'error', message: 'Password minimal 6 karakter.' });
      return;
    }
    setAddSubmitting(true);
    try {
      await createUserViaEdgeFunction({ ...addForm, status: 'approved' });
      setToast({ type: 'success', message: `User ${addForm.full_name} berhasil ditambahkan.` });
      setAddForm(EMPTY_FORM);
      setShowAddModal(false);
      fetchUsers();
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setAddSubmitting(false);
    }
  };

  return { showAddModal, setShowAddModal, addForm, setAddForm, addSubmitting, handleAddUser };
}
