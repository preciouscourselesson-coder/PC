import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import logo from '../Resource/PC_Horisontal.png';

const C = {
  gold:   '#b4964b',
  dark:   '#171411',
  gray:   '#444242',
  cream:  '#f7f6f0',
  white:  '#ffffff',
  border: '#e0ddd6',
  goldBg: 'rgba(180,150,75,0.08)',
};

const fiturData = [
  { icon: '📖', title: 'Program Terstruktur', desc: 'Materi disusun sistematis sesuai kebutuhanmu.' },
  { icon: '👤', title: 'Mentor Berpengalaman', desc: 'Dibimbing oleh mentor profesional yang suportif.' },
  { icon: '📊', title: 'Pantau Perkembangan', desc: 'Lacak progres belajarmu secara berkala.' },
];

// ─── Kolom Kiri ──────────────────────────────────────────────────────────────
const LeftPanel = () => (
  <div style={{
    display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
    padding: '3rem', minHeight: '100%', background: C.cream, boxSizing: 'border-box'
  }}>
    {/* Logo */}
    <div>
      <img src={logo} alt="Precious Course" style={{ height: '84px' }} />
    </div>

    {/* Tagline + Fitur */}
    <div>
      <h1 style={{ fontSize: '2.2rem', color: C.dark, fontWeight: 'bold', lineHeight: 1.25, margin: '0 0 12px' }}>
        Belajar terarah,<br />
        <span style={{ color: C.gold }}>Wawasan</span> bertambah.
      </h1>
      <p style={{ color: C.gray, fontSize: '0.95rem', lineHeight: 1.6, margin: '0 0 2.5rem' }}>
        Precious Course hadir untuk membimbing perjalanan belajarmu mencapai tujuan terbaik.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
        {fiturData.map((f, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
              background: C.white, border: `1.5px solid ${C.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
            }}>
              {f.icon}
            </div>
            <div>
              <div style={{ fontWeight: 'bold', color: C.dark, fontSize: '0.95rem', marginBottom: '2px' }}>{f.title}</div>
              <div style={{ color: C.gray, fontSize: '0.85rem', lineHeight: 1.5 }}>{f.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Footer */}
    <div>
      <p style={{ color: C.gray, fontSize: '0.8rem', margin: 0, lineHeight: 1.7 }}>
        © 2026 Precious Course<br />
        Bimbingan Belajar & Mentoring
      </p>
    </div>
  </div>
);

// ─── Kolom Kanan (Form Login) ─────────────────────────────────────────────────
const LoginPage = () => {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword]     = useState('');
  const [showPass, setShowPass]     = useState(false);
  const [remember, setRemember]     = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);

  const handleLogin = async () => {
    if (!identifier || !password) {
      setError('Mohon isi email/WhatsApp dan kata sandi.');
      return;
    }
    setLoading(true);
    setError(null);

    // Tentukan apakah input adalah email atau nomor WhatsApp
    const isEmail = identifier.includes('@');
    const emailToUse = isEmail ? identifier : `${identifier.replace(/\D/g, '')}@precious.internal`;

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: emailToUse,
      password,
    });

    if (authError) {
      setLoading(false);
      setError('Email/WhatsApp atau kata sandi salah. Silakan coba lagi.');
      return;
    }

    // Fetch role & status dari tabel profiles
    const userId = authData.user.id;
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', userId)
      .single();

    setLoading(false);

    if (profileError || !profile) {
      setError('Gagal mengambil data profil. Hubungi admin.');
      return;
    }

    // Cek status approval sebelum izinkan masuk
    if (profile.status === 'pending') {
      await supabase.auth.signOut();
      setError('Akun Anda masih menunggu persetujuan admin.');
      return;
    }
    if (profile.status === 'rejected') {
      await supabase.auth.signOut();
      setError('Akun Anda ditolak. Hubungi admin untuk informasi lebih lanjut.');
      return;
    }

    // Redirect berdasarkan role
    const role = profile.role;
    if (role === 'student')  { navigate('/siswa');  return; }
    if (role === 'teacher')   { navigate('/guru');   return; }
    if (role === 'parent')   { navigate('/wali');   return; }
    if (role === 'admin')  { navigate('/admin');  return; }

    // Fallback jika role tidak dikenali
    setError(`Role "${role}" tidak dikenali. Hubungi admin.`);
  };

  const inputStyle = {
    width: '100%', padding: '12px 16px', borderRadius: '12px',
    border: `1.5px solid ${C.border}`, fontSize: '0.95rem',
    fontFamily: 'inherit', color: C.dark, background: C.white,
    outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s'
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* Top Bar */}
      <div style={{
        position: 'relative', zIndex: 10, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '1.5rem 3rem', boxSizing: 'border-box',
        background: C.cream, boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
      }}>
        <button onClick={() => navigate('/')} style={{
          display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none',
          color: C.gold, fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', fontFamily: 'inherit',
          padding: 0
        }}>
          <span style={{ fontSize: '1.1rem' }}>←</span> Kembali ke Beranda
        </button>

        <button onClick={() => navigate('/konsultasi')} style={{
          background: C.white, border: `1.5px solid ${C.gold}`, color: C.gold, fontWeight: 'bold',
          fontSize: '0.85rem', letterSpacing: '0.03em', padding: '10px 24px', borderRadius: '999px',
          cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.2s, color 0.2s'
        }}
        onMouseEnter={e => { e.currentTarget.style.background = C.gold; e.currentTarget.style.color = C.white; }}
        onMouseLeave={e => { e.currentTarget.style.background = C.white; e.currentTarget.style.color = C.gold; }}
        >
          KONSULTASI GRATIS
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', flex: 1 }}>

        {/* Kolom Kiri */}
        <LeftPanel />

        {/* Kolom Kanan */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '3rem', background: C.white, boxSizing: 'border-box'
        }}>
          <div style={{ width: '100%', maxWidth: '400px' }}>

            {/* Judul */}
          <h2 style={{ fontSize: '2rem', fontWeight: 'bold', color: C.dark, margin: '0 0 8px' }}>Masuk</h2>
          <p style={{ color: C.gray, fontSize: '0.92rem', margin: '0 0 2rem', lineHeight: 1.5 }}>
            Selamat datang dalam perjalanan belajar untuk meraih impianmu!
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>

            {/* Email / WhatsApp */}
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', color: C.dark, fontSize: '0.88rem', marginBottom: '6px' }}>
                Email atau Nomor WhatsApp
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Contoh: 0812 3456 7890 atau email@domain.com"
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  style={{ ...inputStyle, paddingRight: '44px' }}
                  onFocus={e => e.target.style.borderColor = C.gold}
                  onBlur={e => e.target.style.borderColor = C.border}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                />
                <span style={{
                  position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                  color: C.border, fontSize: '1.1rem'
                }}>👤</span>
              </div>
            </div>

            {/* Kata Sandi */}
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', color: C.dark, fontSize: '0.88rem', marginBottom: '6px' }}>
                Kata Sandi
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="Masukkan kata sandi Anda"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ ...inputStyle, paddingRight: '44px' }}
                  onFocus={e => e.target.style.borderColor = C.gold}
                  onBlur={e => e.target.style.borderColor = C.border}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                />
                <button onClick={() => setShowPass(!showPass)} style={{
                  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', padding: '4px'
                }}>
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Ingat saya + Lupa kata sandi */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
                  style={{ accentColor: C.gold, width: '16px', height: '16px' }} />
                <span style={{ fontSize: '0.88rem', color: C.gray }}>Ingat saya</span>
              </label>
              <button onClick={() => navigate('/lupa-sandi')} style={{
                background: 'none', border: 'none', color: C.gold, fontWeight: 'bold',
                fontSize: '0.88rem', cursor: 'pointer', fontFamily: 'inherit', padding: 0
              }}>
                Lupa kata sandi?
              </button>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                background: '#fff0f0', border: '1.5px solid #e74c3c', borderRadius: '12px',
                padding: '10px 16px', color: '#e74c3c', fontSize: '0.88rem', textAlign: 'center'
              }}>
                ⚠️ {error}
              </div>
            )}

            {/* Tombol Masuk */}
            <button onClick={handleLogin} disabled={loading} style={{
              width: '100%', background: loading ? '#ccc' : C.gold, border: 'none', color: 'white',
              padding: '14px', borderRadius: '12px', fontWeight: 'bold', fontSize: '1rem',
              cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'background 0.2s'
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#c8a84e'; }}
            onMouseLeave={e => { if (!loading) e.currentTarget.style.background = C.gold; }}
            >
              {loading ? '⏳ Memproses...' : 'Masuk'}
            </button>

            {/* Daftar */}
            <p style={{ textAlign: 'center', color: C.gray, fontSize: '0.88rem', margin: 0 }}>
              Belum punya akun?{' '}
              <button onClick={() => navigate('/daftar')} style={{
                background: 'none', border: 'none', color: C.gold, fontWeight: 'bold',
                fontSize: '0.88rem', cursor: 'pointer', fontFamily: 'inherit', padding: 0
              }}>
                Daftar sekarang
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
};

export default LoginPage;