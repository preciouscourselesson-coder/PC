import React, { useState, useEffect, useCallback } from 'react';
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
  { label: 'Testimoni',               path: '/admin/testimoni',            icon: '⭐' },
  { label: 'Pengaturan Materi',       path: '/admin/pengaturan-materi',    icon: '📁' },
  { label: 'Paket & Siswa',           path: '/admin/paket-siswa',          icon: '📦' },
  { label: 'Payment',                 path: '/admin/payment',              icon: '💳' },
  { label: 'Perubahan Jadwal',        path: '/admin/recap-perubahan-jadwal', icon: '🔄' },
  { label: 'Rekap Absensi',           path: '/admin/rekap-absensi',        icon: '📋' },
  { label: 'Rekap Tugas',             path: '/admin/rekap-tugas',          icon: '📄' },
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

const Topbar = ({ user, avatarUrl, notifCounts }) => {
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
    '/admin/payment': 'Payment',
    '/admin/recap-perubahan-jadwal': 'Perubahan Jadwal',
    '/admin/rekap-absensi': 'Rekap Absensi',
    '/admin/profil': 'Profil Admin',
    '/admin/rekap-tugas': 'Rekap Tugas',
  };
  const pageTitle = pageTitles[location.pathname] || 'Dashboard';

  const handleLogout = async () => { await supabase.auth.signOut(); navigate('/login'); };

  const goToUpdates = () => navigate('/admin/updates');
  const goToMessages = () => navigate('/admin/message');
  const goToPricelist = () => navigate('/admin/pricelist');
  const goToKonsultasi = () => navigate('/admin/konsultasi');

  const IconButton = ({ onClick, icon, badgeCount, title }) => (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        onClick={onClick}
        style={{
          background: 'transparent',
          border: 'none',
          fontSize: '1.4rem',
          cursor: 'pointer',
          padding: '4px 8px',
          borderRadius: '8px',
          transition: 'background 0.2s',
          position: 'relative'
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = C.cream}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        title={title}
      >
        {icon}
      </button>
      {badgeCount > 0 && (
        <span style={{
          position: 'absolute',
          top: '-2px',
          right: '-2px',
          background: C.red,
          color: C.white,
          borderRadius: '50%',
          padding: '2px 6px',
          fontSize: '0.65rem',
          fontWeight: 'bold',
          lineHeight: '1',
          minWidth: '18px',
          textAlign: 'center',
          border: `2px solid ${C.white}`,
        }}>
          {badgeCount}
        </span>
      )}
    </div>
  );

  return (
    <div style={{ height: '64px', background: C.white, borderBottom: `1.5px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2rem', position: 'sticky', top: 0, zIndex: 50, flexShrink: 0 }}>
      <span style={{ fontWeight: 'bold', color: C.dark, fontSize: '1.05rem' }}>{pageTitle}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <IconButton onClick={goToUpdates} icon="🔔" badgeCount={notifCounts?.updates || 0} title="Updates" />
        <IconButton onClick={goToMessages} icon="✉️" badgeCount={notifCounts?.messages || 0} title="Messages" />
        <IconButton onClick={goToKonsultasi} icon="💬" badgeCount={notifCounts?.konsultasi || 0} title="Konsultasi Gratis" />
        <IconButton onClick={goToPricelist} icon="💰" badgeCount={0} title="Pricelist" />
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
  const [notifCounts, setNotifCounts] = useState({ updates: 0, messages: 0, konsultasi: 0 });
  // Gerbang render: mencegah shell UI admin (sidebar/menu) sempat tampil
  // sebelum role user terverifikasi benar-benar 'admin'.
  const [checkingAccess, setCheckingAccess] = useState(true);

  // Helper aman: jika tabel tidak ada, return 0 tanpa error mengganggu
  const fetchCount = useCallback(async (table, filter = null) => {
    try {
      let query = supabase.from(table).select('*', { count: 'exact', head: true });
      if (filter) {
        query = query.eq(filter.field, filter.value);
      }
      const { count, error } = await query;
      if (error) {
        // Tabel mungkin belum dibuat – abaikan dan return 0
        console.warn(`Table "${table}" not found or query error:`, error.message);
        return 0;
      }
      return count || 0;
    } catch (e) {
      console.warn(`Error fetching count from "${table}":`, e.message);
      return 0;
    }
  }, []);

  const fetchNotifCounts = useCallback(async () => {
    // Query hanya untuk tabel yang sudah ada
    const konsultasiCount = await fetchCount('konsultasi', { field: 'status', value: 'pending' });
    // Untuk messages & updates, jika tabel belum ada, fetchCount otomatis return 0 tanpa error
    const messagesCount = await fetchCount('messages', { field: 'is_read', value: false });
    const updatesCount = await fetchCount('updates', { field: 'is_read', value: false });

    setNotifCounts({
      konsultasi: konsultasiCount,
      messages: messagesCount,
      updates: updatesCount,
    });
  }, [fetchCount]);

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

      if (profile.role !== 'admin') {
        // Bukan admin -- jangan biarkan shell UI admin ter-render sama
        // sekali, langsung lempar ke area yang sesuai role-nya.
        const redirectByRole = { student: '/siswa', teacher: '/guru', parent: '/wali' };
        navigate(redirectByRole[profile.role] || '/login');
        return;
      }

      const userMeta = session.user.user_metadata;
      setUser(userMeta);
      setCheckingAccess(false);

      const uid = session.user.id;
      if (uid) {
        const path = `${uid}/avatar.jpg`;
        const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(path);
        const { data: fileData, error: fileError } = await supabase.storage.from('avatars').list(`${uid}/`);
        if (!fileError && fileData && fileData.length > 0) {
          setAvatarUrl(`${publicUrlData.publicUrl}?t=${Date.now()}`);
        } else {
          setAvatarUrl(null);
        }
      }
      fetchNotifCounts();
    };
    getUser();

    window.addEventListener('notif-updated', fetchNotifCounts);

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) navigate('/login');
    });

    return () => {
      cancelled = true;
      window.removeEventListener('notif-updated', fetchNotifCounts);
      listener.subscription.unsubscribe();
    };
  }, [navigate, fetchNotifCounts]);

  // Jangan render shell admin (sidebar, menu, konten) sampai role
  // terverifikasi. Mencegah "kelip" UI admin sebelum redirect terjadi.
  if (checkingAccess) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: C.cream, color: C.gray, fontFamily: 'inherit' }}>
        Memeriksa akses...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: C.cream, fontFamily: 'inherit' }}>
      <Sidebar user={user} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Topbar user={user} avatarUrl={avatarUrl} notifCounts={notifCounts} />
        <main style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}><Outlet /></main>
      </div>
    </div>
  );
};

export default AdminLayout;