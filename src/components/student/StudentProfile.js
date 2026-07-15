// src/components/student/StudentProfile.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../supabaseClient';

const C = {
  gold: '#b4964b',
  goldBg: '#f6efdc',
  green: '#2d6a4f',
  greenBg: '#e4efe9',
  red: '#b3423a',
  redBg: '#fbeceb',
  dark: '#171411',
  gray: '#444242',
  grayLight: '#8a8782',
  cream: '#f7f6f0',
  white: '#ffffff',
  border: '#e0ddd6',
};

const cardStyle = {
  background: C.white,
  border: `1px solid ${C.border}`,
  borderRadius: '16px',
  padding: '1.5rem',
  maxWidth: '600px',
  margin: '0 auto',
};

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '10px',
  border: `1px solid ${C.border}`,
  fontFamily: 'inherit',
  fontSize: '0.9rem',
  boxSizing: 'border-box',
  background: C.white,
  color: C.dark,
};

const labelStyle = {
  display: 'block',
  fontWeight: 600,
  marginBottom: '4px',
  fontSize: '0.85rem',
  color: C.gray,
};

const buttonSimpan = {
  background: C.gold,
  color: C.white,
  border: 'none',
  borderRadius: '10px',
  padding: '10px 24px',
  fontWeight: 600,
  fontSize: '0.9rem',
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const buttonBatal = {
  background: 'none',
  border: 'none',
  color: C.gray,
  padding: '10px 16px',
  fontWeight: 600,
  fontSize: '0.9rem',
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const AVATAR_PALETTE = [
  { bg: '#e4efe9', color: '#2d6a4f' },
  { bg: '#f6efdc', color: '#b4964b' },
  { bg: '#eaf0fb', color: '#3a5ba0' },
  { bg: '#fbeceb', color: '#b3423a' },
  { bg: '#f1e8f7', color: '#7a4fa0' },
];

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return (parts[0][0] || '?').toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const getAvatarStyle = (name) => {
  const sum = (name || '?').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_PALETTE[sum % AVATAR_PALETTE.length];
};

const formatTanggalLengkap = (isoDate) => {
  if (!isoDate) return '-';
  const d = new Date(isoDate);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
};

// Fungsi untuk refresh avatar di header (dispatch event)
const refreshAvatarInHeader = () => {
  window.dispatchEvent(new CustomEvent('avatar-updated'));
};

const StudentProfile = () => {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [editName, setEditName] = useState(false);
  const [editPassword, setEditPassword] = useState(false);
  const [form, setForm] = useState({ full_name: '', gender: '' });
  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const checkAvatar = useCallback(async (uid) => {
    try {
      const path = `${uid}/avatar.jpg`;
      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(path);
      
      const { data: fileData, error: fileError } = await supabase.storage
        .from('avatars')
        .list(`${uid}/`);
      
      if (!fileError && fileData && fileData.length > 0) {
        const bustedUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;
        setAvatarUrl(bustedUrl);
        return bustedUrl;
      } else {
        setAvatarUrl(null);
        return null;
      }
    } catch (err) {
      console.warn('Gagal cek avatar:', err);
      setAvatarUrl(null);
      return null;
    }
  }, []);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      const uid = userData?.user?.id;
      if (!uid) throw new Error('Tidak ada sesi login.');

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .single();

      if (error) throw error;
      setProfile(data);
      setForm({ full_name: data.full_name || '', gender: data.gender || '' });

      await checkAvatar(uid);
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: err.message || 'Gagal memuat profil.' });
    } finally {
      setLoading(false);
    }
  }, [checkAvatar]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveName = async () => {
    if (!form.full_name.trim()) {
      setMessage({ type: 'error', text: 'Nama tidak boleh kosong.' });
      return;
    }

    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: form.full_name.trim(),
          gender: form.gender || null,
        })
        .eq('id', profile.id);

      if (error) throw error;

      setProfile(prev => ({ ...prev, full_name: form.full_name.trim(), gender: form.gender || null }));
      setEditName(false);
      setMessage({ type: 'success', text: 'Nama berhasil diperbarui.' });

      await supabase.auth.updateUser({
        data: { full_name: form.full_name.trim() }
      });

      refreshAvatarInHeader();
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: err.message || 'Gagal menyimpan perubahan.' });
    } finally {
      setSaving(false);
    }
  };

  const handleSavePassword = async () => {
    const { oldPassword, newPassword, confirmPassword } = passwordForm;
    if (!oldPassword || !newPassword || !confirmPassword) {
      setMessage({ type: 'error', text: 'Semua field password harus diisi.' });
      return;
    }
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password baru minimal 6 karakter.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Password baru dan konfirmasi tidak cocok.' });
      return;
    }

    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const { data: userData } = await supabase.auth.getUser();
      const email = userData?.user?.email;
      if (!email) throw new Error('Email tidak ditemukan.');

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: oldPassword,
      });

      if (signInError) {
        setMessage({ type: 'error', text: 'Password lama salah.' });
        setSaving(false);
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      setMessage({ type: 'success', text: 'Password berhasil diubah.' });
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setEditPassword(false);
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: err.message || 'Gagal mengubah password.' });
    } finally {
      setSaving(false);
    }
  };

  const handleUploadAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'File harus berupa gambar.' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Ukuran gambar maksimal 2MB.' });
      return;
    }

    setUploading(true);
    setMessage({ type: '', text: '' });
    try {
      const uid = profile.id;
      const path = `${uid}/avatar.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(path);
      
      setAvatarUrl(`${publicUrlData.publicUrl}?t=${Date.now()}`);
      setMessage({ type: 'success', text: 'Foto profil berhasil diunggah.' });

      refreshAvatarInHeader();
    } catch (err) {
      console.error('Upload error:', err);
      setMessage({ type: 'error', text: err.message || 'Gagal upload foto.' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    if (!avatarUrl) return;
    setUploading(true);
    setMessage({ type: '', text: '' });
    try {
      const uid = profile.id;
      const path = `${uid}/avatar.jpg`;
      const { error } = await supabase.storage
        .from('avatars')
        .remove([path]);
      if (error) throw error;
      setAvatarUrl(null);
      setMessage({ type: 'success', text: 'Foto profil dihapus.' });

      refreshAvatarInHeader();
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: err.message || 'Gagal hapus foto.' });
    } finally {
      setUploading(false);
    }
  };

  const cancelEditName = () => {
    setForm({ full_name: profile?.full_name || '', gender: profile?.gender || '' });
    setEditName(false);
    setMessage({ type: '', text: '' });
  };

  const cancelEditPassword = () => {
    setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    setEditPassword(false);
    setMessage({ type: '', text: '' });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', padding: '2rem' }}>
        <p style={{ color: C.grayLight }}>Memuat profil...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', padding: '2rem' }}>
        <p style={{ color: C.red }}>Profil tidak ditemukan.</p>
        <button onClick={loadProfile} style={{ ...buttonSimpan, marginTop: '1rem' }}>Muat Ulang</button>
      </div>
    );
  }

  const avatarStyle = getAvatarStyle(profile.full_name);
  const initials = getInitials(profile.full_name);

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: C.dark, margin: 0 }}>Profil Siswa</h1>
        <p style={{ fontSize: '0.85rem', color: C.grayLight, margin: '4px 0 0' }}>Kelola informasi akun Anda</p>
      </div>

      {message.text && (
        <div
          style={{
            background: message.type === 'error' ? C.redBg : C.greenBg,
            color: message.type === 'error' ? C.red : C.green,
            padding: '0.75rem 1rem',
            borderRadius: '10px',
            marginBottom: '1.5rem',
            fontSize: '0.9rem',
          }}
        >
          {message.text}
        </div>
      )}

      <div style={cardStyle}>
        {/* Foto Profil */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '1.5rem' }}>
          <div style={{ position: 'relative' }}>
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: `2px solid ${C.gold}`,
                }}
              />
            ) : (
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: avatarStyle.bg,
                  color: avatarStyle.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '2rem',
                  flexShrink: 0,
                  border: `2px solid ${C.gold}`,
                }}
              >
                {initials}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleUploadAvatar}
              style={{ display: 'none' }}
              id="avatar-upload"
            />
          </div>
          <div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <label htmlFor="avatar-upload" style={{ ...buttonSimpan, fontSize: '0.8rem', padding: '6px 14px', cursor: uploading ? 'default' : 'pointer', opacity: uploading ? 0.6 : 1 }}>
                {uploading ? 'Mengunggah...' : 'Upload Foto'}
              </label>
              {avatarUrl && (
                <button
                  onClick={handleRemoveAvatar}
                  disabled={uploading}
                  style={{ ...buttonBatal, color: C.red, fontSize: '0.8rem', padding: '6px 14px' }}
                >
                  Hapus
                </button>
              )}
            </div>
            <div style={{ fontSize: '0.7rem', color: C.grayLight, marginTop: '4px' }}>
              Maks. 2MB, format JPG/PNG
            </div>
          </div>
        </div>

        {/* Nama & Gender */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: C.grayLight }}>Nama Lengkap</div>
              <div style={{ fontSize: '1rem', color: C.dark, fontWeight: 500 }}>
                {profile.full_name}
              </div>
            </div>
            {!editName && (
              <button onClick={() => setEditName(true)} style={{ ...buttonBatal, fontSize: '0.8rem', color: C.gold }}>
                ✎ Edit
              </button>
            )}
          </div>
          {editName && (
            <div style={{ marginTop: '0.5rem' }}>
              <input
                type="text"
                name="full_name"
                value={form.full_name}
                onChange={handleChange}
                style={inputStyle}
                placeholder="Nama lengkap"
              />
              <select
                name="gender"
                value={form.gender || ''}
                onChange={handleChange}
                style={{ ...inputStyle, marginTop: '0.5rem', cursor: 'pointer' }}
              >
                <option value="">Pilih Gender</option>
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button onClick={cancelEditName} style={buttonBatal}>Batal</button>
                <button onClick={handleSaveName} disabled={saving} style={{ ...buttonSimpan, padding: '6px 16px', fontSize: '0.85rem', opacity: saving ? 0.6 : 1 }}>
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Email */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.75rem', color: C.grayLight }}>Email</div>
          <div style={{ fontSize: '1rem', color: C.dark, fontWeight: 500 }}>{profile.email}</div>
        </div>

        {/* Role & Join Date */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: C.grayLight }}>Role</div>
            <div style={{ fontSize: '0.95rem', color: C.dark, fontWeight: 500, textTransform: 'capitalize' }}>{profile.role}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: C.grayLight }}>Bergabung Sejak</div>
            <div style={{ fontSize: '0.95rem', color: C.dark, fontWeight: 500 }}>
              {formatTanggalLengkap(profile.created_at)}
            </div>
          </div>
        </div>

        {/* Ubah Password */}
        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: '1rem', marginTop: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: C.dark }}>Ubah Password</div>
            {!editPassword && (
              <button onClick={() => setEditPassword(true)} style={{ ...buttonBatal, fontSize: '0.8rem', color: C.gold }}>
                ✎ Ubah
              </button>
            )}
          </div>
          {editPassword && (
            <div style={{ marginTop: '0.5rem' }}>
              <div style={{ marginBottom: '0.5rem' }}>
                <label style={labelStyle}>Password Lama</label>
                <input
                  type="password"
                  name="oldPassword"
                  value={passwordForm.oldPassword}
                  onChange={handlePasswordChange}
                  style={inputStyle}
                  placeholder="Masukkan password lama"
                />
              </div>
              <div style={{ marginBottom: '0.5rem' }}>
                <label style={labelStyle}>Password Baru</label>
                <input
                  type="password"
                  name="newPassword"
                  value={passwordForm.newPassword}
                  onChange={handlePasswordChange}
                  style={inputStyle}
                  placeholder="Minimal 6 karakter"
                />
              </div>
              <div style={{ marginBottom: '0.5rem' }}>
                <label style={labelStyle}>Konfirmasi Password Baru</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={passwordForm.confirmPassword}
                  onChange={handlePasswordChange}
                  style={inputStyle}
                  placeholder="Ulangi password baru"
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button onClick={cancelEditPassword} style={buttonBatal}>Batal</button>
                <button onClick={handleSavePassword} disabled={saving} style={{ ...buttonSimpan, padding: '6px 16px', fontSize: '0.85rem', opacity: saving ? 0.6 : 1 }}>
                  {saving ? 'Menyimpan...' : 'Simpan Password'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Logout */}
        <div style={{ marginTop: '1.5rem', borderTop: `1px solid ${C.border}`, paddingTop: '1rem' }}>
          <button onClick={handleLogout} style={{ ...buttonBatal, color: C.red, fontSize: '0.9rem' }}>
            🚪 Keluar
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentProfile;