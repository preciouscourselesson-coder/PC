import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import logo from '../../Resource/PC_Horisontal.png';

const C = {
  gold:    '#b4964b',
  green:   '#2d6a4f',
  dark:    '#171411',
  gray:    '#444242',
  cream:   '#f7f6f0',
  white:   '#ffffff',
  border:  '#e0ddd6',
  goldBg:  'rgba(180,150,75,0.10)',
};

const navItems = [
  { label: 'Home',         path: '/siswa',           icon: '🏠' },
  { label: 'Updates',      path: '/siswa/updates',   icon: '🔔' },
  { label: 'Absensi',      path: '/siswa/absensi',   icon: '📖' },
  { label: 'Materi',       path: '/siswa/materi',    icon: '📚' },
  { label: 'Tugas',        path: '/siswa/tugas',     icon: '📝' },
  { label: 'Arsip Soal',   path: '/siswa/arsip', icon: '📂' },
];

// ─── Sidebar ─────────────────────────────────────────────────────────────────
const Sidebar = ({ user }) => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div style={{
      width: '200px', minHeight: '100vh', flexShrink: 0,
      background: C.white, borderRight: `1.5px solid ${C.border}`,
      display: 'flex', flexDirection: 'column',
      position: 'sticky', top: 0, height: '100vh',
      boxSizing: 'border-box', padding: '1.5rem 0'
    }}>
      {/* Logo */}
      <div style={{ padding: '0 1.2rem', marginBottom: '2rem' }}>
        <img src={logo} alt="Precious Course" style={{ height: '48px' }} />
      </div>

      {/* Nav Items */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', padding: '0 0.8rem' }}>
        {navItems.map(item => {
          const active = location.pathname === item.path;
          return (
            <button key={item.path} onClick={() => navigate(item.path)} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '10px 14px', borderRadius: '12px', border: 'none',
              background: active ? C.goldBg : 'transparent',
              color: active ? C.gold : C.gray,
              fontWeight: active ? 'bold' : 'normal',
              fontSize: '0.95rem', cursor: 'pointer',
              fontFamily: 'inherit', textAlign: 'left',
              transition: 'all 0.15s', width: '100%'
            }}
            onMouseEnter={e => { if (!active) e.currentTarget.style.background = C.cream; }}
            onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Spacer kosong */}
      <div style={{ flex: 1 }} />
    </div>
  );
};

// ─── Topbar ───────────────────────────────────────────────────────────────────
const Topbar = ({ user }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [dropOpen, setDropOpen] = useState(false);

  // Ambil nama dari full_name (disimpan saat register)
  const nama    = user?.full_name || user?.nama || 'Siswa';
  const initial = nama[0]?.toUpperCase() || 'S';

  // Judul halaman otomatis dari path
  const pageTitles = {
    '/siswa':            'Home',
    '/siswa/updates':    'Updates',
    '/siswa/absensi':    'Absensi',
    '/siswa/materi':     'Materi',
    '/siswa/tugas':      'Tugas',
    '/siswa/arsip': 'Arsip Soal',
    '/siswa/pesan':      'Pesan',
    '/siswa/bantuan':    'Bantuan',
  };
  const pageTitle = pageTitles[location.pathname] || 'Dashboard';

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div style={{
      height: '64px', background: C.white, borderBottom: `1.5px solid ${C.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 2rem', position: 'sticky', top: 0, zIndex: 50, flexShrink: 0
    }}>
      <span style={{ fontWeight: 'bold', color: C.dark, fontSize: '1.05rem' }}>{pageTitle}</span>

      {/* Bagian tengah/kanan: Message + User info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        {/* Tombol Message */}
        <button
          onClick={() => navigate('/siswa/pesan')}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'inherit', fontSize: '0.9rem', color: C.gray,
            padding: '6px 12px', borderRadius: '8px',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = C.cream}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <span style={{ fontSize: '1.1rem' }}>💬</span> Pesan
        </button>

        {/* User info (avatar + nama + dropdown) */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => setDropOpen(!dropOpen)} style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit'
          }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: C.gold, color: C.white,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 'bold', fontSize: '1rem'
            }}>
              {initial}
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 'bold', color: C.dark, fontSize: '0.9rem' }}>{nama}</div>
              <div style={{ color: C.gray, fontSize: '0.75rem' }}>Siswa</div>
            </div>
            <span style={{ color: C.gray, fontSize: '0.8rem' }}>▾</span>
          </button>

          {dropOpen && (
            <div style={{
              position: 'absolute', right: 0, top: 'calc(100% + 8px)',
              background: C.white, borderRadius: '14px', minWidth: '160px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.1)', overflow: 'hidden',
              border: `1px solid ${C.border}`, zIndex: 100
            }}>
              <button onClick={() => { setDropOpen(false); navigate('/siswa/profil'); }} 
                style={{ display: 'block', width: '100%', padding: '11px 16px', border: 'none', background: 'none', textAlign: 'left', fontSize: '0.9rem', color: C.dark, cursor: 'pointer', fontFamily: 'inherit', borderBottom: `1px solid ${C.border}` }}
                onMouseEnter={e => e.currentTarget.style.background = C.cream}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                👤 Profil Saya
              </button>
              <button onClick={handleLogout} style={{
                display: 'block', width: '100%', padding: '11px 16px', border: 'none',
                background: 'none', textAlign: 'left', fontSize: '0.9rem', color: '#e74c3c',
                cursor: 'pointer', fontFamily: 'inherit'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#fff0f0'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                🚪 Keluar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Layout Utama ─────────────────────────────────────────────────────────────
const StudentLayout = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/login'); return; }
      setUser(session.user.user_metadata);
    };
    getUser();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) navigate('/login');
    });
    return () => listener.subscription.unsubscribe();
  }, [navigate]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: C.cream, fontFamily: 'inherit' }}>
      {/* Sidebar */}
      <Sidebar user={user} />

      {/* Konten */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Topbar user={user} />
        <main style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default StudentLayout;