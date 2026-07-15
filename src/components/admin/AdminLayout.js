import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import logo from '../../Resource/PC_Horisontal.png';

const C = {
  gold: '#b4964b',
  goldDark: '#96793a',
  green: '#2d6a4f',
  greenBg: 'rgba(45,106,79,0.10)',
  amber: '#a3760f',
  amberBg: 'rgba(180,150,75,0.14)',
  red: '#b0413e',
  redBg: 'rgba(176,65,62,0.10)',
  blue: '#3f7ea6',
  blueBg: 'rgba(63,126,166,0.12)',
  dark: '#171411',
  gray: '#726d66',
  grayBg: 'rgba(114,109,102,0.12)',
  grayLight: '#a8a29a',
  cream: '#f7f6f0',
  white: '#ffffff',
  border: '#e6e2d8',
};

const navItems = [
  { label: 'Dashboard',               path: '/admin',                      icon: '📊' },
  { label: 'User Baru',               path: '/admin/user-baru',            icon: '👤' },
  { label: 'Manajemen User',          path: '/admin/manajemen-user',       icon: '👥' },
  { label: 'Konsultasi Gratis',       path: '/admin/konsultasi',           icon: '💬' },
  { label: 'Testimoni',               path: '/admin/testimoni',            icon: '⭐' },
  { label: 'Pengaturan Materi',       path: '/admin/pengaturan-materi',    icon: '📁' },
  { label: 'Paket & Siswa',           path: '/admin/paket-siswa',          icon: '📦' },
  { label: 'Perubahan Jadwal',        path: '/admin/recap-perubahan-jadwal',     icon: '🔄' }, // <-- menu baru
];

const Sidebar = ({ user }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const handleLogout = async () => { await supabase.auth.signOut(); navigate('/login'); };
  return (
    <div style={{ width: '200px', minHeight: '100vh', flexShrink: 0, background: C.white, borderRight: `1.5px solid ${C.border}`, display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh', boxSizing: 'border-box', padding: '1.5rem 0' }}>
      <div style={{ padding: '0 1.2rem', marginBottom: '2rem' }}><img src={logo} alt="Precious Course" style={{ height: '48px' }} /></div>
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', padding: '0 0.8rem', overflowY: 'auto' }}>
        {navItems.map(item => {
          const active = location.pathname === item.path || (item.path === '/admin' && location.pathname === '/admin');
          return (
            <button key={item.path} onClick={() => navigate(item.path)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '12px', border: 'none', background: active ? C.goldBg : 'transparent', color: active ? C.gold : C.gray, fontWeight: active ? 'bold' : 'normal', fontSize: '0.95rem', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', width: '100%', transition: 'all 0.15s' }} onMouseEnter={e => { if (!active) e.currentTarget.style.background = C.cream; }} onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}><span style={{ fontSize: '1.1rem' }}>{item.icon}</span>{item.label}</button>
          );
        })}
      </nav>
      <div style={{ padding: '0 0.8rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '12px', border: 'none', background: 'transparent', color: '#e74c3c', fontSize: '0.95rem', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', width: '100%' }} onMouseEnter={e => e.currentTarget.style.background = '#fff0f0'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}><span style={{ fontSize: '1.1rem' }}>🚪</span> Keluar</button>
      </div>
    </div>
  );
};

const Topbar = ({ user, avatarUrl }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [dropOpen, setDropOpen] = useState(false);
  const nama = user?.full_name || user?.nama || 'Admin';
  const initial = nama[0]?.toUpperCase() || 'A';

  const pageTitles = {
    '/admin': 'Dashboard',
    '/admin/user-baru': 'User Baru',
    '/admin/manajemen-user': 'Manajemen User',
    '/admin/konsultasi': 'Konsultasi Gratis',
    '/admin/message': 'Message',
    '/admin/testimoni': 'Testimoni',
    '/admin/pengaturan-materi': 'Pengaturan Materi',
    '/admin/pricelist': 'Pricelist',
    '/admin/paket-siswa': 'Paket & Siswa',
    '/admin/recap-perubahan-jadwal': 'Perubahan Jadwal', // tambahan
    '/admin/profil': 'Profil Admin',
  };
  const pageTitle = pageTitles[location.pathname] || 'Dashboard';

  const handleLogout = async () => { await supabase.auth.signOut(); navigate('/login'); };

  const goToUpdates = () => navigate('/admin/updates');
  const goToMessages = () => navigate('/admin/message');
  const goToPricelist = () => navigate('/admin/pricelist');

  return (
    <div style={{ height: '64px', background: C.white, borderBottom: `1.5px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2rem', position: 'sticky', top: 0, zIndex: 50, flexShrink: 0 }}>
      <span style={{ fontWeight: 'bold', color: C.dark, fontSize: '1.05rem' }}>{pageTitle}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button onClick={goToUpdates} style={{ background: 'transparent', border: 'none', fontSize: '1.4rem', cursor: 'pointer', padding: '4px 8px', borderRadius: '8px', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = C.cream} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'} title="Updates">🔔</button>
        <button onClick={goToMessages} style={{ background: 'transparent', border: 'none', fontSize: '1.4rem', cursor: 'pointer', padding: '4px 8px', borderRadius: '8px', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = C.cream} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'} title="Message">✉️</button>
        <button onClick={goToPricelist} style={{ background: 'transparent', border: 'none', fontSize: '1.4rem', cursor: 'pointer', padding: '4px 8px', borderRadius: '8px', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = C.cream} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'} title="Pricelist">💰</button>
        <div style={{ position: 'relative' }}>
          <button onClick={() => setDropOpen(!dropOpen)} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${C.gold}` }} />
            ) : (
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: C.gold, color: C.white, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1rem' }}>{initial}</div>
            )}
            <div style={{ textAlign: 'left' }}><div style={{ fontWeight: 'bold', color: C.dark, fontSize: '0.9rem' }}>{nama}</div><div style={{ color: C.gray, fontSize: '0.75rem' }}>Super Admin</div></div>
            <span style={{ color: C.gray, fontSize: '0.8rem' }}>▾</span>
          </button>
          {dropOpen && (
            <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', background: C.white, borderRadius: '14px', minWidth: '160px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', overflow: 'hidden', border: `1px solid ${C.border}`, zIndex: 100 }}>
              <button onClick={() => { setDropOpen(false); navigate('/admin/profil'); }} style={{ display: 'block', width: '100%', padding: '11px 16px', border: 'none', background: 'none', textAlign: 'left', fontSize: '0.9rem', color: C.dark, cursor: 'pointer', fontFamily: 'inherit', borderBottom: `1px solid ${C.border}` }} onMouseEnter={e => e.currentTarget.style.background = C.cream} onMouseLeave={e => e.currentTarget.style.background = 'none'}>👤 Profil Admin</button>
              <button onClick={handleLogout} style={{ display: 'block', width: '100%', padding: '11px 16px', border: 'none', background: 'none', textAlign: 'left', fontSize: '0.9rem', color: '#e74c3c', cursor: 'pointer', fontFamily: 'inherit' }} onMouseEnter={e => e.currentTarget.style.background = '#fff0f0'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>🚪 Keluar</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const AdminLayout = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/login'); return; }
      const userMeta = session.user.user_metadata;
      setUser(userMeta);
      // Ambil foto profil dari storage
      const uid = session.user.id;
      if (uid) {
        const path = `${uid}/avatar.jpg`;
        const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(path);
        // Cek apakah file ada
        const { data: fileData, error: fileError } = await supabase.storage.from('avatars').list(`${uid}/`);
        if (!fileError && fileData && fileData.length > 0) {
          // Cache-bust supaya foto baru langsung tampil, bukan versi lama dari cache browser
          setAvatarUrl(`${publicUrlData.publicUrl}?t=${Date.now()}`);
        } else {
          setAvatarUrl(null);
        }
      }
    };
    getUser();
    // Refresh nama & foto profil di header saat AdminProfile menyimpan perubahan
    window.addEventListener('avatar-updated', getUser);
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) navigate('/login');
    });
    return () => {
      window.removeEventListener('avatar-updated', getUser);
      listener.subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: C.cream, fontFamily: 'inherit' }}>
      <Sidebar user={user} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Topbar user={user} avatarUrl={avatarUrl} />
        <main style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}><Outlet /></main>
      </div>
    </div>
  );
};

export default AdminLayout;