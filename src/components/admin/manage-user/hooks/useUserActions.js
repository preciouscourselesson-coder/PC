// Hook berisi seluruh aksi yang bisa dilakukan admin terhadap satu baris user:
// ubah role, gender, kelas, mapel, status, hapus profil, "login sebagai", dan kode referral.
import { useState } from 'react';
import { supabase } from '../../../../supabaseClient';
import { checkedUpdate } from '../../../../utils/supabaseUpdateGuard';
import { ROLE_LABEL, STATUS_LABEL, GENDER_LABEL } from '../constants';
import { generateReferralCode } from '../utils/referralCode';

export default function useUserActions({ setUsers, setToast, fetchUsers, setImporting }) {
  const [busyId, setBusyId] = useState(null);
  const [loginAsId, setLoginAsId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const handleRoleChange = async (id, name, newRole) => {
    setBusyId(id);
    const { error: updateError } = await checkedUpdate(
      supabase.from('profiles').update({ role: newRole }).eq('id', id)
    );
    setBusyId(null);

    if (updateError) {
      setToast({ type: 'error', message: `Gagal mengubah peran ${name}.` });
      return;
    }
    setUsers(prev => prev.map(u => u.id === id ? { ...u, role: newRole } : u));
    setToast({ type: 'success', message: `Peran ${name} diubah menjadi ${ROLE_LABEL[newRole]}.` });
  };

  const handleGenderChange = async (id, name, newGender) => {
    setBusyId(id);
    const { error: updateError } = await checkedUpdate(
      supabase.from('profiles').update({ gender: newGender || null }).eq('id', id)
    );
    setBusyId(null);

    if (updateError) {
      setToast({ type: 'error', message: `Gagal mengubah gender ${name}.` });
      return;
    }
    setUsers(prev => prev.map(u => u.id === id ? { ...u, gender: newGender || null } : u));
    setToast({ type: 'success', message: `Gender ${name} diubah menjadi ${GENDER_LABEL[newGender] || 'Belum diisi'}.` });
  };

  const handleKelasChange = async (id, name, newKelas) => {
    setBusyId(id);
    const { error: updateError } = await checkedUpdate(
      supabase.from('profiles').update({ kelas: newKelas || null }).eq('id', id)
    );
    setBusyId(null);

    if (updateError) {
      setToast({ type: 'error', message: `Gagal mengubah kelas ${name}.` });
      return;
    }
    setUsers(prev => prev.map(u => u.id === id ? { ...u, kelas: newKelas || null } : u));
    setToast({ type: 'success', message: `Kelas ${name} diubah menjadi ${newKelas || 'Belum diisi'}.` });
  };

  const handleMapelChange = async (id, name, newMapel) => {
    const mapelArray = Array.isArray(newMapel) ? newMapel : [];
    setBusyId(id);

    const { error } = await supabase.rpc('update_user_mapel', {
      user_id: id,
      new_mapel: mapelArray,
    });

    setBusyId(null);

    if (error) {
      console.error('Update mapel error:', error);
      setToast({ type: 'error', message: `Gagal mengubah mapel ${name}.` });
      return;
    }
    setUsers(prev => prev.map(u => u.id === id ? { ...u, mapel: mapelArray } : u));
    setToast({ type: 'success', message: `Mapel ${name} berhasil diperbarui.` });
  };

  const handleStatusChange = async (id, name, newStatus) => {
    setBusyId(id);
    const { error: updateError } = await checkedUpdate(
      supabase.from('profiles').update({ status: newStatus }).eq('id', id)
    );
    setBusyId(null);

    if (updateError) {
      setToast({ type: 'error', message: `Gagal mengubah status ${name}.` });
      return;
    }
    setUsers(prev => prev.map(u => u.id === id ? { ...u, status: newStatus } : u));
    setToast({ type: 'success', message: `Status ${name} diubah menjadi ${STATUS_LABEL[newStatus]}.` });
  };

  const handleDeleteProfile = async (id, name) => {
    setBusyId(id);
    const { error: deleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);
    setBusyId(null);
    setConfirmDelete(null);

    if (deleteError) {
      setToast({ type: 'error', message: `Gagal menghapus data ${name}.` });
      return;
    }
    setUsers(prev => prev.filter(u => u.id !== id));
    setToast({ type: 'success', message: `Data profil ${name} telah dihapus.` });
  };

  const handleLoginAs = async (id, name) => {
    setLoginAsId(id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error: fnError } = await supabase.functions.invoke('admin-login-as', {
        body: { user_id: id },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (fnError) throw new Error(fnError.message || 'Gagal membuat akses login.');
      if (data?.error) throw new Error(data.error);
      if (!data?.action_link) throw new Error('Link login tidak diterima dari server.');

      window.open(data.action_link, '_blank', 'noopener,noreferrer');
      setToast({
        type: 'success',
        message: `Tab baru dibuka untuk masuk sebagai ${name}. Gunakan jendela InPrivate/Incognito agar sesi admin Anda tidak ikut tertimpa.`,
      });
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setLoginAsId(null);
    }
  };

  const handleGenerateReferral = async (id, name) => {
    setBusyId(id);
    const code = generateReferralCode(name);
    const { error: updateError } = await checkedUpdate(
      supabase.from('profiles').update({ referral_code: code }).eq('id', id)
    );
    setBusyId(null);

    if (updateError) {
      setToast({ type: 'error', message: `Gagal membuat kode referral untuk ${name}.` });
      return;
    }
    setUsers(prev => prev.map(u => u.id === id ? { ...u, referral_code: code } : u));
    setToast({ type: 'success', message: `Kode referral ${name}: ${code}` });
  };

  const handleCopyReferral = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setToast({ type: 'success', message: `Kode ${code} disalin ke clipboard.` });
    } catch {
      setToast({ type: 'error', message: 'Gagal menyalin kode. Salin manual dari tabel.' });
    }
  };

  const handleGenerateAllReferrals = async (users) => {
    const targets = users.filter(u => !u.referral_code);
    if (!targets.length) {
      setToast({ type: 'success', message: 'Semua user sudah memiliki kode referral.' });
      return;
    }
    setImporting(true);
    let success = 0, fail = 0;
    for (const u of targets) {
      const code = generateReferralCode(u.full_name || u.email);
      const { error: updateError } = await checkedUpdate(
        supabase.from('profiles').update({ referral_code: code }).eq('id', u.id)
      );
      if (updateError) fail++;
      else success++;
    }
    setImporting(false);
    setToast({
      type: fail === 0 ? 'success' : 'error',
      message: `Kode referral dibuat untuk ${success} user${fail ? `, ${fail} gagal` : ''}.`,
    });
    fetchUsers();
  };

  return {
    busyId,
    loginAsId,
    confirmDelete,
    setConfirmDelete,
    handleRoleChange,
    handleGenderChange,
    handleKelasChange,
    handleMapelChange,
    handleStatusChange,
    handleDeleteProfile,
    handleLoginAs,
    handleGenerateReferral,
    handleCopyReferral,
    handleGenerateAllReferrals,
  };
}
