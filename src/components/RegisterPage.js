import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import LeftPanel from './LeftPanel';

const C = {
  gold:   '#b4964b',
  dark:   '#171411',
  gray:   '#444242',
  cream:  '#f7f6f0',
  white:  '#ffffff',
  border: '#e0ddd6',
  goldBg: 'rgba(180,150,75,0.08)',
};

const RegisterPage = () => {
  const navigate = useNavigate();

  const [nama, setNama]             = useState('');
  const [email, setEmail]           = useState('');
  const [whatsapp, setWhatsapp]     = useState('');
  const [role, setRole]             = useState('siswa');
  const [password, setPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass]     = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [success, setSuccess]       = useState(false);

  const handleRegister = async () => {
    if (!nama.trim()) {
      setError('Nama lengkap wajib diisi.');
      return;
    }
    if (!email.trim()) {
      setError('Email wajib diisi.');
      return;
    }
    if (!password) {
      setError('Kata sandi wajib diisi.');
      return;
    }
    if (password.length < 6) {
      setError('Kata sandi minimal 6 karakter.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    setLoading(true);
    setError(null);

    const { error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: nama.trim(),
          whatsapp: whatsapp.trim() || null,
          role: role,
        },
      },
    });

    setLoading(false);

    if (signUpError) {
      setError(signUpError.message || 'Gagal mendaftar. Silakan coba lagi.');
      return;
    }

    setSuccess(true);
  };

  const inputStyle = {
    width: '100%', padding: '12px 16px', borderRadius: '12px',
    border: `1.5px solid ${C.border}`, fontSize: '0.95rem',
    fontFamily: 'inherit', color: C.dark, background: C.white,
    outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s'
  };

  if (success) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: '100vh' }}>
        <LeftPanel />
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '3rem', background: C.white, boxSizing: 'border-box'
        }}>
          <div style={{ width: '100%', maxWidth: '400px', textAlign: 'center' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', color: C.dark, margin: '0 0 8px' }}>
              Pendaftaran Berhasil!
            </h2>
            <p style={{ color: C.gray, fontSize: '0.95rem', lineHeight: 1.6, margin: '0 0 1.5rem' }}>
              Akun Anda dengan email <strong>{email}</strong> sedang menunggu persetujuan admin.<br />
              Anda akan dapat masuk setelah akun Anda disetujui.
            </p>
            <button
              onClick={() => navigate('/login')}
              style={{
                background: C.gold, border: 'none', color: C.white,
                padding: '12px 32px', borderRadius: '40px', fontWeight: 'bold',
                fontSize: '0.95rem', cursor: 'pointer', fontFamily: 'inherit',
                transition: 'background 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#c8a84e'}
              onMouseLeave={e => e.currentTarget.style.background = C.gold}
            >
              Kembali ke Halaman Masuk
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: '100vh' }}>
      <LeftPanel />

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '3rem', background: C.white, boxSizing: 'border-box'
      }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 'bold', color: C.dark, margin: '0 0 8px' }}>Daftar</h2>
          <p style={{ color: C.gray, fontSize: '0.92rem', margin: '0 0 2rem', lineHeight: 1.5 }}>
            Buat akun untuk memulai perjalanan belajarmu.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            {/* Nama Lengkap */}
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', color: C.dark, fontSize: '0.88rem', marginBottom: '6px' }}>
                Nama Lengkap <span style={{ color: C.gold }}>*</span>
              </label>
              <input
                type="text"
                placeholder="Contoh: Jefferson William"
                value={nama}
                onChange={e => setNama(e.target.value)}
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = C.gold}
                onBlur={e => e.target.style.borderColor = C.border}
              />
            </div>

            {/* Email */}
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', color: C.dark, fontSize: '0.88rem', marginBottom: '6px' }}>
                Email <span style={{ color: C.gold }}>*</span>
              </label>
              <input
                type="email"
                placeholder="Contoh: jefferson@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = C.gold}
                onBlur={e => e.target.style.borderColor = C.border}
              />
            </div>

            {/* WhatsApp (opsional) */}
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', color: C.dark, fontSize: '0.88rem', marginBottom: '6px' }}>
                Nomor WhatsApp (opsional)
              </label>
              <input
                type="tel"
                placeholder="Contoh: 0812 3456 7890"
                value={whatsapp}
                onChange={e => setWhatsapp(e.target.value)}
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = C.gold}
                onBlur={e => e.target.style.borderColor = C.border}
              />
            </div>

            {/* Role */}
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', color: C.dark, fontSize: '0.88rem', marginBottom: '6px' }}>
                Peran <span style={{ color: C.gold }}>*</span>
              </label>
              <select
                value={role}
                onChange={e => setRole(e.target.value)}
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: '12px',
                  border: `1.5px solid ${C.border}`, fontSize: '0.95rem',
                  fontFamily: 'inherit', color: C.dark, background: C.white,
                  outline: 'none', boxSizing: 'border-box'
                }}
                onFocus={e => e.target.style.borderColor = C.gold}
                onBlur={e => e.target.style.borderColor = C.border}
              >
                <option value="siswa">Siswa</option>
                <option value="guru">Guru</option>
                <option value="wali_siswa">Wali Siswa</option>
              </select>
            </div>

            {/* Password */}
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', color: C.dark, fontSize: '0.88rem', marginBottom: '6px' }}>
                Kata Sandi <span style={{ color: C.gold }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="Minimal 6 karakter"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ ...inputStyle, paddingRight: '44px' }}
                  onFocus={e => e.target.style.borderColor = C.gold}
                  onBlur={e => e.target.style.borderColor = C.border}
                />
                <button onClick={() => setShowPass(!showPass)} style={{
                  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', padding: '4px'
                }}>
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Konfirmasi Password */}
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', color: C.dark, fontSize: '0.88rem', marginBottom: '6px' }}>
                Konfirmasi Kata Sandi <span style={{ color: C.gold }}>*</span>
              </label>
              <input
                type={showPass ? 'text' : 'password'}
                placeholder="Ulangi kata sandi"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = C.gold}
                onBlur={e => e.target.style.borderColor = C.border}
              />
            </div>

            {error && (
              <div style={{
                background: '#fff0f0', border: '1.5px solid #e74c3c', borderRadius: '12px',
                padding: '10px 16px', color: '#e74c3c', fontSize: '0.88rem', textAlign: 'center'
              }}>
                ⚠️ {error}
              </div>
            )}

            <button onClick={handleRegister} disabled={loading} style={{
              width: '100%', background: loading ? '#ccc' : C.gold, border: 'none', color: C.white,
              padding: '14px', borderRadius: '12px', fontWeight: 'bold', fontSize: '1rem',
              cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'background 0.2s'
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#c8a84e'; }}
            onMouseLeave={e => { if (!loading) e.currentTarget.style.background = C.gold; }}
            >
              {loading ? '⏳ Mendaftar...' : 'Daftar'}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ flex: 1, height: '1px', background: C.border }} />
              <span style={{ color: C.gray, fontSize: '0.85rem' }}>atau</span>
              <div style={{ flex: 1, height: '1px', background: C.border }} />
            </div>

            <p style={{ textAlign: 'center', color: C.gray, fontSize: '0.88rem', margin: 0 }}>
              Sudah punya akun?{' '}
              <button onClick={() => navigate('/login')} style={{
                background: 'none', border: 'none', color: C.gold, fontWeight: 'bold',
                fontSize: '0.88rem', cursor: 'pointer', fontFamily: 'inherit', padding: 0
              }}>
                Masuk sekarang
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;