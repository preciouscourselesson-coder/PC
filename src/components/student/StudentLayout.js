// src/components/student/StudentLayout.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  { label: 'Tugas',        path: '/siswa/tugas',     icon: '📝' },
  { label: 'Folder Share', path: '/siswa/folder-share', icon: '📁' },
];

// Tinggi bottom nav mobile (dipakai juga untuk padding-bottom konten agar tidak ketutupan)
const BOTTOM_NAV_HEIGHT = 60;
// Ukuran minimum target sentuh yang nyaman di layar HP (rekomendasi Apple/Google: ~44-48px)
const TOUCH_TARGET = 44;

// Bottom nav: Home, Absensi, Tugas, Folder Share, dan Lainnya (☰)
const bottomNavItems = [
  { label: 'Home',        path: '/siswa',              icon: '🏠' },
  { label: 'Absensi',     path: '/siswa/absensi',      icon: '📖' },
  { label: 'Tugas',       path: '/siswa/tugas',        icon: '📝' },
  { label: 'Folder Share',path: '/siswa/folder-share', icon: '📁' },
  { label: 'Lainnya',     path: '#',                   icon: '☰' },
];

// ─── Style global khusus kenyamanan mobile ───────────────────────────────────
// - Menghilangkan highlight biru/abu saat tap di iOS/Android
// - touch-action: manipulation supaya tidak ada delay 300ms & tidak zoom saat double-tap
// - overscroll-behavior-y supaya swipe di ujung halaman tidak memicu "pull refresh" browser
const GlobalMobileStyles = () => (
  <style>{`
    * { -webkit-tap-highlight-color: transparent; }
    button { touch-action: manipulation; }
    html, body { overscroll-behavior-y: contain; }
    body.no-scroll { overflow: hidden; position: fixed; width: 100%; }

    /* 100vh di browser mobile dihitung dari tinggi viewport maksimum (saat
       address bar tersembunyi), bukan tinggi yang benar-benar terlihat.
       Akibatnya konten bisa kepotong / muncul celah putih saat address bar
       muncul-hilang ketika di-scroll. 100dvh mengikuti tinggi viewport yang
       benar-benar terlihat saat itu juga; vh di atas dipertahankan sebagai
       fallback untuk browser lama yang belum mendukung dvh. */
    .sl-viewport-min-h { min-height: 100vh; min-height: 100dvh; }
    .sl-viewport-h { height: 100vh; height: 100dvh; }
  `}</style>
);

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

// ─── Sidebar (desktop) ────────────────────────────────────────────────────────
const DesktopSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div style={{
      width: '200px', flexShrink: 0,
      background: C.white, borderRight: `1.5px solid ${C.border}`,
      display: 'flex', flexDirection: 'column',
      boxSizing: 'border-box', padding: '1.5rem 0',
      overflowY: 'auto'
    }}>
      <div style={{ padding: '0 1.2rem', marginBottom: '2rem' }}>
        <img src={logo} alt="Precious Course" style={{ height: '48px' }} />
      </div>

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

      <div style={{ flex: 1 }} />
    </div>
  );
};

// ─── Mobile Sidebar (drawer) ────────────────────────────────────────────────
const MobileSidebar = ({ user, open, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const handleLogout = async () => { await supabase.auth.signOut(); navigate('/login'); };

  const handleNavigate = (path) => {
    navigate(path);
    onClose();
  };

  return (
    <>
      {open && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.35)',
            zIndex: 150,
          }}
        />
      )}
      <div className="sl-viewport-h" style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '220px',
        background: C.white,
        borderRight: `1.5px solid ${C.border}`,
        zIndex: 200,
        transform: open ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.25s ease',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        padding: '1.5rem 0',
      }}>
        <div style={{ padding: '0 1.2rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <img src={logo} alt="Precious Course" style={{ height: '40px' }} />
          <button onClick={onClose} aria-label="Tutup menu" style={{
            border: 'none', background: 'none', fontSize: '1.3rem', cursor: 'pointer', color: C.gray,
            minWidth: `${TOUCH_TARGET}px`, minHeight: `${TOUCH_TARGET}px`,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>✕</button>
        </div>
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', padding: '0 0.8rem', overflowY: 'auto' }}>
          {navItems.map(item => {
            const active = location.pathname === item.path;
            return (
              <button key={item.path} onClick={() => handleNavigate(item.path)} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '14px 14px', borderRadius: '12px', border: 'none',
                background: active ? C.goldBg : 'transparent',
                color: active ? C.gold : C.gray,
                fontWeight: active ? 'bold' : 'normal',
                fontSize: '1rem', cursor: 'pointer',
                fontFamily: 'inherit', textAlign: 'left',
                width: '100%', minHeight: '48px'
              }}>
                <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </nav>
        <div style={{ padding: '0 0.8rem' }}>
          <button onClick={handleLogout} style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '14px 14px', borderRadius: '12px', border: 'none',
            background: 'transparent', color: '#e74c3c',
            fontSize: '1rem', cursor: 'pointer', fontFamily: 'inherit',
            textAlign: 'left', width: '100%', minHeight: '48px'
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#fff0f0'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <span style={{ fontSize: '1.1rem' }}>🚪</span> Keluar
          </button>
        </div>
      </div>
    </>
  );
};

// ─── Bottom Nav (mobile) ──────────────────────────────────────────────────────
const BottomNav = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNav = (path) => {
    if (path === '#') {
      onMenuClick(); // buka sidebar
      return;
    }
    navigate(path);
  };

  return (
    <nav style={{
      position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 60,
      background: C.white, borderTop: `1.5px solid ${C.border}`,
      display: 'flex', alignItems: 'stretch', justifyContent: 'space-between',
      height: `${BOTTOM_NAV_HEIGHT}px`,
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      boxShadow: '0 -4px 16px rgba(0,0,0,0.06)'
    }}>
      {bottomNavItems.map(item => {
        const active = location.pathname === item.path;
        return (
          <button
            key={item.label}
            onClick={() => handleNav(item.path)}
            aria-label={item.label}
            style={{
              flex: '1 1 0', minWidth: 0, minHeight: `${TOUCH_TARGET}px`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: '2px', padding: '6px 2px', border: 'none',
              background: 'none', color: active ? C.gold : C.gray,
              fontFamily: 'inherit', cursor: 'pointer', WebkitTapHighlightColor: 'transparent'
            }}>
            <span style={{ fontSize: '1.3rem', lineHeight: 1 }}>{item.icon}</span>
            <span style={{ fontSize: '0.65rem', fontWeight: active ? 'bold' : 'normal', whiteSpace: 'nowrap' }}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

// ─── Topbar ───────────────────────────────────────────────────────────────────
const Topbar = ({ user, isMobile, onMenuClick }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [dropOpen, setDropOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const dropRef = useRef(null);

  // Tutup dropdown saat user tap di luar area dropdown (wajib di mobile, tidak ada hover)
  useEffect(() => {
    if (!dropOpen) return;
    const handleOutside = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setDropOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [dropOpen]);

  const nama    = user?.full_name || user?.nama || 'Siswa';
  const initial = nama[0]?.toUpperCase() || 'S';

  const pageTitles = {
    '/siswa':            'Home',
    '/siswa/updates':    'Updates',
    '/siswa/absensi':    'Absensi',
    '/siswa/tugas':      'Tugas',
    '/siswa/folder-share': 'Folder Share',
    '/siswa/pesan':      'Pesan',
    '/siswa/bantuan':    'Bantuan',
  };
  const pageTitle = pageTitles[location.pathname] || 'Dashboard';

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
    const handleAvatarUpdate = () => { loadAvatar(); };
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
      minHeight: isMobile ? '56px' : '64px', background: C.white, borderBottom: `1.5px solid ${C.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: isMobile ? '0 1rem' : '0 2rem',
      paddingTop: isMobile ? 'env(safe-area-inset-top, 0px)' : 0,
      position: 'sticky', top: 0, zIndex: 50, flexShrink: 0
    }}>
      {/* Kiri: judul halaman (tanpa hamburger) */}
      <span style={{
        fontWeight: 'bold', color: C.dark, fontSize: isMobile ? '0.95rem' : '1.05rem',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {pageTitle}
      </span>

      {/* Kanan: ikon pesan + avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.5rem' : '1.5rem' }}>
        <button
          onClick={() => navigate('/siswa/pesan')}
          aria-label="Pesan"
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'inherit', fontSize: '0.9rem', color: C.gray,
            minHeight: `${TOUCH_TARGET}px`, minWidth: `${TOUCH_TARGET}px`,
            padding: isMobile ? '6px 10px' : '6px 12px', borderRadius: '8px',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = C.cream}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <span style={{ fontSize: '1.1rem' }}>💬</span>
          {!isMobile && ' Pesan'}
        </button>

        <div ref={dropRef} style={{ position: 'relative' }}>
          <button onClick={() => setDropOpen(!dropOpen)} style={{
            display: 'flex', alignItems: 'center', gap: isMobile ? '4px' : '10px',
            minHeight: `${TOUCH_TARGET}px`, padding: isMobile ? '4px' : '4px 6px',
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
                style={{ display: 'block', width: '100%', minHeight: `${TOUCH_TARGET}px`, padding: '11px 16px', border: 'none', background: 'none', textAlign: 'left', fontSize: '0.9rem', color: C.dark, cursor: 'pointer', fontFamily: 'inherit', borderBottom: `1px solid ${C.border}` }}
                onMouseEnter={e => e.currentTarget.style.background = C.cream}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                👤 Profil Saya
              </button>
              <button onClick={handleLogout} style={{
                display: 'block', width: '100%', minHeight: `${TOUCH_TARGET}px`, padding: '11px 16px', border: 'none',
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/login'); return; }

      // Verifikasi role lewat tabel profiles -- BUKAN dari
      // session.user.user_metadata, karena user_metadata bisa diubah
      // sendiri oleh user lewat supabase.auth.updateUser() dan tidak
      // boleh dipercaya sebagai sumber kebenaran untuk otorisasi.
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, status')
        .eq('id', session.user.id)
        .single();

      if (cancelled) return;

      if (profileError || !profile) {
        await supabase.auth.signOut();
        navigate('/login');
        return;
      }

      if (profile.status === 'pending' || profile.status === 'rejected') {
        await supabase.auth.signOut();
        navigate('/login');
        return;
      }

      if (profile.role !== 'student') {
        const redirectByRole = { teacher: '/guru', admin: '/admin', parent: '/wali' };
        navigate(redirectByRole[profile.role] || '/login');
        return;
      }

      setUser(session.user.user_metadata);
      setCheckingAccess(false);
    };
    getUser();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) navigate('/login');
    });
    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, [navigate]);

  // Tutup sidebar saat layar berubah ke desktop
  useEffect(() => {
    if (!isMobile) setSidebarOpen(false);
  }, [isMobile]);

  // Kunci scroll body saat drawer (sidebar mobile) terbuka, supaya konten
  // di belakang overlay tidak ikut ter-scroll saat user swipe di dalam drawer.
  useEffect(() => {
    if (isMobile && sidebarOpen) {
      document.body.classList.add('no-scroll');
    } else {
      document.body.classList.remove('no-scroll');
    }
    return () => document.body.classList.remove('no-scroll');
  }, [isMobile, sidebarOpen]);

  if (checkingAccess) {
    return (
      <div className="sl-viewport-min-h" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.cream, color: C.gray, fontFamily: 'inherit' }}>
        Memeriksa akses...
      </div>
    );
  }

  return (
    <div className={isMobile ? 'sl-viewport-min-h' : 'sl-viewport-h'} style={{
      display: 'flex', background: C.cream, fontFamily: 'inherit',
      flexDirection: isMobile ? 'column' : 'row',
      overflowX: 'hidden',
      overflowY: isMobile ? 'visible' : 'hidden',
      width: '100%'
    }}>
      <GlobalMobileStyles />
      {!isMobile && <DesktopSidebar />}
      {isMobile && <MobileSidebar user={user} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
        <Topbar user={user} isMobile={isMobile} onMenuClick={() => setSidebarOpen(true)} />
        <main style={{
          flex: 1,
          padding: isMobile ? '1rem' : '2rem',
          paddingBottom: isMobile
            ? `calc(${BOTTOM_NAV_HEIGHT}px + env(safe-area-inset-bottom, 0px) + 1rem)`
            : '2rem',
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          boxSizing: 'border-box'
        }}>
          <Outlet />
        </main>
      </div>

      {isMobile && <BottomNav onMenuClick={() => setSidebarOpen(true)} />}
    </div>
  );
};

export default StudentLayout;