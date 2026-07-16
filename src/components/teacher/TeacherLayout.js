// src/components/teacher/TeacherLayout.js
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import logo from '../../Resource/PC_Horisontal.png';

const C = {
  gold: '#b4964b',
  green: '#2d6a4f',
  dark: '#171411',
  gray: '#444242',
  cream: '#f7f6f0',
  white: '#ffffff',
  border: '#e0ddd6',
  goldBg: 'rgba(180,150,75,0.10)',
};

const MOBILE_BREAKPOINT = 768;

// Hook kecil untuk deteksi ukuran layar (mobile vs desktop)
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= MOBILE_BREAKPOINT : false
  );
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return isMobile;
};

const navItems = [
  { label: 'Home',            path: '/guru',                icon: '🏠' },
  { label: 'Updates',         path: '/guru/updates',        icon: '🔔' },
  { label: 'Absensi & Materi',path: '/guru/absensi-materi', icon: '📖' },
  { label: 'Bahan Ajar',      path: '/guru/bahan-ajar',     icon: '📚' },
  { label: 'Arsip Materi',    path: '/guru/arsip-materi',   icon: '🗄️' },
  { label: 'Tugas',           path: '/guru/tugas',          icon: '📝' },
  { label: 'Daftar Siswa',    path: '/guru/daftar-siswa',   icon: '👨‍🎓' },
];

const Sidebar = ({ user, isMobile, open, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const handleLogout = async () => { await supabase.auth.signOut(); navigate('/login'); };

  const handleNavigate = (path) => {
    navigate(path);
    if (isMobile) onClose();
  };

  // Style dasar sidebar
  const baseStyle = {
    width: '220px',
    minHeight: '100vh',
    height: '100vh',
    flexShrink: 0,
    background: C.white,
    borderRight: `1.5px solid ${C.border}`,
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    padding: '1.5rem 0',
  };

  const mobileStyle = isMobile
    ? {
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 200,
        boxShadow: '4px 0 24px rgba(0,0,0,0.15)',
        transform: open ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.25s ease',
      }
    : {
        position: 'sticky',
        top: 0,
      };

  return (
    <>
      {/* Overlay gelap di belakang sidebar saat mobile & terbuka */}
      {isMobile && open && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.35)',
            zIndex: 150,
          }}
        />
      )}
      <div style={{ ...baseStyle, ...mobileStyle }}>
        <div style={{ padding: '0 1.2rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <img src={logo} alt="Precious Course" style={{ height: '44px' }} />
          {isMobile && (
            <button
              onClick={onClose}
              aria-label="Tutup menu"
              style={{ border: 'none', background: 'none', fontSize: '1.3rem', cursor: 'pointer', color: C.gray, lineHeight: 1 }}
            >
              ✕
            </button>
          )}
        </div>
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', padding: '0 0.8rem', overflowY: 'auto' }}>
          {navItems.map(item => {
            const active = location.pathname === item.path || (item.path === '/guru' && location.pathname === '/guru');
            return (
              <button
                key={item.path}
                onClick={() => handleNavigate(item.path)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', borderRadius: '12px',
                  border: 'none', background: active ? C.goldBg : 'transparent', color: active ? C.gold : C.gray,
                  fontWeight: active ? 'bold' : 'normal', fontSize: '0.95rem', cursor: 'pointer', fontFamily: 'inherit',
                  textAlign: 'left', width: '100%', transition: 'all 0.15s',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = C.cream; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>{item.label}
              </button>
            );
          })}
        </nav>
        <div style={{ padding: '0 0.8rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <button
            onClick={handleLogout}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', borderRadius: '12px', border: 'none', background: 'transparent', color: '#e74c3c', fontSize: '0.95rem', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', width: '100%' }}
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

const Topbar = ({ user, isMobile, onMenuClick }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [dropOpen, setDropOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const nama = user?.full_name || user?.nama || 'Guru';
  const initial = nama[0]?.toUpperCase() || 'G';

  const pageTitles = {
    '/guru': 'Home',
    '/guru/updates': 'Updates',
    '/guru/absensi-materi': 'Absensi & Materi',
    '/guru/bahan-ajar': 'Bahan Ajar',
    '/guru/arsip-materi': 'Arsip Materi',
    '/guru/tugas': 'Tugas',
    '/guru/daftar-siswa': 'Daftar Siswa',
    '/guru/profil': 'Profil',
    '/guru/pesan': 'Pesan',
  };
  const pageTitle = pageTitles[location.pathname] || 'Dashboard';

  // Ambil avatar dari storage
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

    // Listen event dari TeacherProfile
    const handleAvatarUpdate = () => {
      loadAvatar();
    };
    window.addEventListener('avatar-updated', handleAvatarUpdate);

    return () => {
      window.removeEventListener('avatar-updated', handleAvatarUpdate);
    };
  }, [loadAvatar]);

  const handleLogout = async () => { await supabase.auth.signOut(); navigate('/login'); };

  return (
    <div style={{
      height: '60px',
      background: C.white,
      borderBottom: `1.5px solid ${C.border}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: isMobile ? '0 1rem' : '0 2rem',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      flexShrink: 0,
      gap: '0.75rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
        {isMobile && (
          <button
            onClick={onMenuClick}
            aria-label="Buka menu"
            style={{ border: 'none', background: 'none', fontSize: '1.4rem', cursor: 'pointer', color: C.dark, lineHeight: 1, padding: '4px' }}
          >
            ☰
          </button>
        )}
        <span style={{
          fontWeight: 'bold', color: C.dark, fontSize: isMobile ? '0.95rem' : '1.05rem',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {pageTitle}
        </span>
      </div>

      {/* Bagian kanan: Pesan + User info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.5rem' : '1.5rem', flexShrink: 0 }}>
        {/* Tombol Pesan */}
        <button
          onClick={() => navigate('/guru/pesan')}
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
          {!isMobile && 'Pesan'}
        </button>

        {/* User info (avatar + nama + dropdown) */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => setDropOpen(!dropOpen)} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: C.gold, color: C.white, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1rem', overflow: 'hidden', flexShrink: 0 }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                initial
              )}
            </div>
            {!isMobile && (
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 'bold', color: C.dark, fontSize: '0.9rem' }}>{nama}</div>
                <div style={{ color: C.gray, fontSize: '0.75rem' }}>Guru</div>
              </div>
            )}
            <span style={{ color: C.gray, fontSize: '0.8rem' }}>▾</span>
          </button>
          {dropOpen && (
            <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', background: C.white, borderRadius: '14px', minWidth: '160px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', overflow: 'hidden', border: `1px solid ${C.border}`, zIndex: 100 }}>
              <button onClick={() => { setDropOpen(false); navigate('/guru/profil'); }} style={{ display: 'block', width: '100%', padding: '11px 16px', border: 'none', background: 'none', textAlign: 'left', fontSize: '0.9rem', color: C.dark, cursor: 'pointer', fontFamily: 'inherit', borderBottom: `1px solid ${C.border}` }} onMouseEnter={e => e.currentTarget.style.background = C.cream} onMouseLeave={e => e.currentTarget.style.background = 'none'}>👤 Profil Saya</button>
              <button onClick={handleLogout} style={{ display: 'block', width: '100%', padding: '11px 16px', border: 'none', background: 'none', textAlign: 'left', fontSize: '0.9rem', color: '#e74c3c', cursor: 'pointer', fontFamily: 'inherit' }} onMouseEnter={e => e.currentTarget.style.background = '#fff0f0'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>🚪 Keluar</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const TeacherLayout = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  // Tutup sidebar otomatis kalau layar berubah jadi desktop
  useEffect(() => {
    if (!isMobile) setSidebarOpen(false);
  }, [isMobile]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: C.cream, fontFamily: 'inherit' }}>
      <Sidebar
        user={user}
        isMobile={isMobile}
        open={isMobile ? sidebarOpen : true}
        onClose={() => setSidebarOpen(false)}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Topbar user={user} isMobile={isMobile} onMenuClick={() => setSidebarOpen(true)} />
        <main style={{ flex: 1, padding: isMobile ? '1rem' : '2rem', overflowY: 'auto', boxSizing: 'border-box' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default TeacherLayout;