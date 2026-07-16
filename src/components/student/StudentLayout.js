import React, { useState, useEffect, useCallback } from 'react';
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

// ─── Hook: deteksi layar mobile ───────────────────────────────────────────────
const MOBILE_BREAKPOINT = 768;
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < MOBILE_BREAKPOINT : false
  );

  useEffect(() => {
    let raf;
    const handleResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
      });
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(raf);
    };
  }, []);

  return isMobile;
};

// ─── Sidebar (desktop/tablet) ─────────────────────────────────────────────────
const Sidebar = () => {
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

// ─── Bottom Nav (mobile) ───────────────────────────────────────────────────────
const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav style={{
      position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 60,
      background: C.white, borderTop: `1.5px solid ${C.border}`,
      display: 'flex', alignItems: 'stretch', justifyContent: 'space-between',
      overflowX: 'auto', WebkitOverflowScrolling: 'touch',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      boxShadow: '0 -4px 16px rgba(0,0,0,0.06)'
    }}>
      {navItems.map(item => {
        const active = location.pathname === item.path;
        return (
          <button key={item.path} onClick={() => navigate(item.path)} style={{
            flex: '1 0 auto', minWidth: '58px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: '2px', padding: '8px 4px 6px', border: 'none',
            background: 'none', color: active ? C.gold : C.gray,
            fontFamily: 'inherit', cursor: 'pointer'
          }}>
            <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>{item.icon}</span>
            <span style={{ fontSize: '0.62rem', fontWeight: active ? 'bold' : 'normal', whiteSpace: 'nowrap' }}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

// ─── Topbar ───────────────────────────────────────────────────────────────────
const Topbar = ({ user, isMobile }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [dropOpen, setDropOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);

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

  // Ambil foto profil dari storage
  const loadAvatar = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData?.user?.id;
    if (!uid) return;

    try {
      const path = `${uid}/avatar.jpg`;
      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(path);

      const { data: fileData, error: fileError } = await supabase.storage
        .from('avatars')
        .list(`${uid}/`);

      if (!fileError && fileData && fileData.length > 0) {
        setAvatarUrl(`${publicUrlData.publicUrl}?t=${Date.now()}`);
      } else {
        setAvatarUrl(null);
      }
    } catch (err) {
      setAvatarUrl(null);
    }
  }, []);

  useEffect(() => {
    loadAvatar();

    // Listen event dari StudentProfile saat foto/nama diperbarui
    const handleAvatarUpdate = () => {
      loadAvatar();
    };
    window.addEventListener('avatar-updated', handleAvatarUpdate);

    return () => {
      window.removeEventListener('avatar-updated', handleAvatarUpdate);
    };
  }, [loadAvatar]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div style={{
      height: isMobile ? '56px' : '64px', background: C.white, borderBottom: `1.5px solid ${C.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: isMobile ? '0 1rem' : '0 2rem', position: 'sticky', top: 0, zIndex: 50, flexShrink: 0
    }}>
      {isMobile ? (
        <img src={logo} alt="Precious Course" style={{ height: '30px' }} />
      ) : (
        <span style={{ fontWeight: 'bold', color: C.dark, fontSize: '1.05rem' }}>{pageTitle}</span>
      )}

      {/* Bagian tengah/kanan: Message + User info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.5rem' : '1.5rem' }}>
        {/* Tombol Message */}
        <button
          onClick={() => navigate('/siswa/pesan')}
          aria-label="Pesan"
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'inherit', fontSize: '0.9rem', color: C.gray,
            padding: isMobile ? '6px 8px' : '6px 12px', borderRadius: '8px',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = C.cream}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <span style={{ fontSize: '1.1rem' }}>💬</span>
          {!isMobile && ' Pesan'}
        </button>

        {/* User info (avatar + nama + dropdown) */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => setDropOpen(!dropOpen)} style={{
            display: 'flex', alignItems: 'center', gap: isMobile ? '4px' : '10px',
            background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit'
          }}>
            <div style={{
              width: isMobile ? '32px' : '36px', height: isMobile ? '32px' : '36px', borderRadius: '50%',
              background: C.gold, color: C.white,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 'bold', fontSize: '1rem', overflow: 'hidden', flexShrink: 0
            }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                initial
              )}
            </div>
            {!isMobile && (
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 'bold', color: C.dark, fontSize: '0.9rem' }}>{nama}</div>
                <div style={{ color: C.gray, fontSize: '0.75rem' }}>Siswa</div>
              </div>
            )}
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
  const isMobile = useIsMobile();

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
    <div style={{
      display: 'flex', minHeight: '100vh', background: C.cream, fontFamily: 'inherit',
      flexDirection: isMobile ? 'column' : 'row'
    }}>
      {/* Sidebar hanya tampil di desktop/tablet */}
      {!isMobile && <Sidebar />}

      {/* Konten */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Topbar user={user} isMobile={isMobile} />
        <main style={{
          flex: 1,
          padding: isMobile ? '1rem' : '2rem',
          paddingBottom: isMobile ? 'calc(64px + env(safe-area-inset-bottom, 0px) + 1rem)' : '2rem',
          overflowY: 'auto',
          boxSizing: 'border-box'
        }}>
          <Outlet />
        </main>
      </div>

      {/* Bottom nav hanya tampil di mobile */}
      {isMobile && <BottomNav />}
    </div>
  );
};

export default StudentLayout;