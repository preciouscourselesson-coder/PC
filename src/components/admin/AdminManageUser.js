import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { checkedUpdate } from '../../utils/supabaseUpdateGuard';
import * as XLSX from 'xlsx';

const C = {
  gold:   '#b4964b',
  dark:   '#171411',
  gray:   '#444242',
  cream:  '#f7f6f0',
  white:  '#ffffff',
  border: '#e0ddd6',
  goldBg: 'rgba(180,150,75,0.08)',
  danger: '#e74c3c',
  dangerBg: '#fff0f0',
  success: '#2e9e5b',
  successBg: '#eefaf2',
  warn: '#b7791f',
  warnBg: '#fdf6ec',
};

const ROLE_LABEL = {
  student: 'Siswa',
  teacher: 'Guru',
  parent:  'Wali Siswa',
  admin:   'Admin',
};

const STATUS_LABEL = {
  approved: 'Disetujui',
  pending:  'Menunggu',
  rejected: 'Ditolak',
};

const STATUS_COLOR = {
  approved: { color: C.success, bg: C.successBg },
  pending:  { color: C.warn,    bg: C.warnBg },
  rejected: { color: C.danger,  bg: C.dangerBg },
};

const GENDER_LABEL = {
  L: 'Laki-laki',
  P: 'Perempuan',
};

const KELAS_OPTIONS = ['VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const MAPEL_OPTIONS = ['Matematika', 'Fisika', 'Kimia', 'Bahasa Inggris'];

// Small dependency-free inline icons used for row actions.
const IconCheck = ({ size = 15, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const IconX = ({ size = 15, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const IconTrash = ({ size = 15, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" /><path d="M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);
const IconLogIn = ({ size = 15, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
    <polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" />
  </svg>
);
const IconCopy = ({ size = 14, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);
const IconRefresh = ({ size = 14, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);
const IconTicket = ({ size = 14, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 9a3 3 0 0 1 0 6v3a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-3a3 3 0 0 1 0-6V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" />
    <line x1="13" y1="5" x2="13" y2="19" strokeDasharray="3 3" />
  </svg>
);

// Round icon-only button used across the Aksi column.
const IconBtn = ({ onClick, disabled, title, color, bg, border, children }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    aria-label={title}
    style={{
      width: '30px', height: '30px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      borderRadius: '8px', border: `1.5px solid ${border}`, background: bg, color,
      cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1, padding: 0,
    }}
  >
    {children}
  </button>
);

const AdminManageUser = () => {
  const [users, setUsers]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [toast, setToast]         = useState(null);
  const [busyId, setBusyId]       = useState(null);
  const [search, setSearch]       = useState('');
  const [roleFilter, setRoleFilter]     = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const fileInputRef = useRef(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ full_name: '', email: '', password: '', role: 'student', gender: '', kelas: '' });
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [mapelDropdownOpenId, setMapelDropdownOpenId] = useState(null);
  const [loginAsId, setLoginAsId] = useState(null);
  const mapelDropdownRef = useRef(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, status, gender, kelas, created_at, mapel, referral_code')
      .order('created_at', { ascending: false });

    setLoading(false);

    if (fetchError) {
      console.error('Fetch error:', fetchError);
      setError('Gagal memuat daftar user. Silakan muat ulang halaman.');
      return;
    }
    setUsers(data || []);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (mapelDropdownOpenId === null) return;
    const handleClickOutside = (e) => {
      if (mapelDropdownRef.current && !mapelDropdownRef.current.contains(e.target)) {
        setMapelDropdownOpenId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mapelDropdownOpenId]);

  const filtered = useMemo(() => {
    return users.filter(u => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (statusFilter !== 'all' && u.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const nameMatch = (u.full_name || '').toLowerCase().includes(q);
        const emailMatch = (u.email || '').toLowerCase().includes(q);
        if (!nameMatch && !emailMatch) return false;
      }
      return true;
    });
  }, [users, roleFilter, statusFilter, search]);

  const handleRoleChange = async (id, name, newRole) => {
    setBusyId(id);
    const { error: updateError } = await checkedUpdate(
      supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', id)
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
      supabase
        .from('profiles')
        .update({ gender: newGender || null })
        .eq('id', id)
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
      supabase
        .from('profiles')
        .update({ kelas: newKelas || null })
        .eq('id', id)
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
      new_mapel: mapelArray
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
      supabase
        .from('profiles')
        .update({ status: newStatus })
        .eq('id', id)
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

  const generateReferralCode = (name) => {
    const base = (name || 'USER')
      .toUpperCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Z]/g, '')
      .slice(0, 5) || 'USER';
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `${base}${rand}`;
  };

  const handleGenerateReferral = async (id, name) => {
    setBusyId(id);
    const code = generateReferralCode(name);
    const { error: updateError } = await checkedUpdate(
      supabase
        .from('profiles')
        .update({ referral_code: code })
        .eq('id', id)
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

  const handleGenerateAllReferrals = async () => {
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
        supabase
          .from('profiles')
          .update({ referral_code: code })
          .eq('id', u.id)
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

  const createUserViaEdgeFunction = async ({ full_name, email, password, role, status, gender, kelas }) => {
    const { data: { session } } = await supabase.auth.getSession();
    const { data, error: fnError } = await supabase.functions.invoke('create-user', {
      body: { full_name, email, password, role, status, gender, kelas: role === 'student' ? (kelas || null) : null },
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    if (fnError) throw new Error(fnError.message || 'Gagal memanggil fungsi pembuatan user.');
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!addForm.full_name || !addForm.email || !addForm.password) {
      setToast({ type: 'error', message: 'Semua field wajib diisi.' });
      return;
    }
    if (addForm.password.length < 6) {
      setToast({ type: 'error', message: 'Password minimal 6 karakter.' });
      return;
    }
    setAddSubmitting(true);
    try {
      await createUserViaEdgeFunction({ ...addForm, status: 'approved' });
      setToast({ type: 'success', message: `User ${addForm.full_name} berhasil ditambahkan.` });
      setAddForm({ full_name: '', email: '', password: '', role: 'student', gender: '', kelas: '' });
      setShowAddModal(false);
      fetchUsers();
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setAddSubmitting(false);
    }
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      { Nama: 'Contoh Nama', Email: 'contoh@email.com', Role: 'Guru', Gender: 'L', Kelas: '', Password: 'password123' },
      { Nama: '', Email: '', Role: 'Siswa', Gender: 'P', Kelas: 'X', Password: '' },
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    ws['!cols'] = [{ wch: 25 }, { wch: 30 }, { wch: 12 }, { wch: 10 }, { wch: 8 }, { wch: 18 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template User');
    XLSX.writeFile(wb, 'template_import_user.xlsx');
    setToast({ type: 'success', message: 'Template berhasil didownload.' });
  };

  const handleExport = () => {
    if (users.length === 0) {
      setToast({ type: 'error', message: 'Tidak ada data untuk diekspor.' });
      return;
    }
    const exportData = users.map(u => ({
      Nama: u.full_name || '',
      Email: u.email,
      Role: ROLE_LABEL[u.role] || u.role,
      Gender: GENDER_LABEL[u.gender] || '-',
      Kelas: u.role === 'student' ? (u.kelas || '-') : '-',
      Mapel: u.role === 'teacher' ? (u.mapel || []).join(', ') : '-',
      'Kode Referral': u.referral_code || '-',
      Status: STATUS_LABEL[u.status] || u.status,
      Terdaftar: u.created_at ? new Date(u.created_at).toLocaleDateString('id-ID') : '',
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pengguna');
    XLSX.writeFile(wb, `pengguna_${new Date().toISOString().slice(0, 19)}.xlsx`);
    setToast({ type: 'success', message: `Ekspor ${users.length} user berhasil.` });
  };

  const parseRoleFromSheet = (raw) => {
    const v = (raw || '').toString().trim().toLowerCase();
    if (v === 'guru' || v === 'teacher') return 'teacher';
    if (v === 'siswa' || v === 'student') return 'student';
    if (v === 'wali_siswa' || v === 'wali siswa' || v === 'parent') return 'parent';
    return null;
  };

  const parseGenderFromSheet = (raw) => {
    const v = (raw || '').toString().trim().toLowerCase();
    if (v === 'l' || v === 'laki-laki' || v === 'laki laki' || v === 'male') return 'L';
    if (v === 'p' || v === 'perempuan' || v === 'female') return 'P';
    return null;
  };

  const parseKelasFromSheet = (raw) => {
    const v = (raw || '').toString().trim().toUpperCase();
    const match = KELAS_OPTIONS.find(k => k.toUpperCase() === v);
    return match || null;
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet);
        if (!rows.length) throw new Error('File kosong.');

        const usersToImport = [];
        const skipped = [];
        for (const row of rows) {
          const name = row.Nama || row.nama || '';
          const email = row.Email || row.email || '';
          const password = (row.Password || row.password || '').toString();
          const role = parseRoleFromSheet(row.Role || row.role);
          const gender = parseGenderFromSheet(row.Gender || row.gender);
          const kelas = role === 'student' ? parseKelasFromSheet(row.Kelas || row.kelas) : null;

          if (!name || !email || !password || !role) {
            if (name || email) skipped.push(email || name);
            continue;
          }
          if (password.length < 6) {
            skipped.push(email);
            continue;
          }
          usersToImport.push({ full_name: name, email, password, role, gender, kelas });
        }

        if (!usersToImport.length) throw new Error('Tidak ada baris valid untuk diimpor.');

        let success = 0, fail = 0;
        for (const u of usersToImport) {
          try {
            await createUserViaEdgeFunction({ ...u, status: 'approved' });
            success++;
          } catch (err) {
            fail++;
          }
        }

        const skippedNote = skipped.length ? ` (${skipped.length} baris dilewati karena data tidak lengkap)` : '';
        setToast({
          type: fail === 0 ? 'success' : 'error',
          message: `Import selesai: ${success} berhasil, ${fail} gagal.${skippedNote}`,
        });
        fetchUsers();
      } catch (err) {
        setToast({ type: 'error', message: err.message });
      } finally {
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.onerror = () => {
      setImporting(false);
      setToast({ type: 'error', message: 'Gagal membaca file.' });
    };
    reader.readAsArrayBuffer(file);
  };

  const formatDate = (iso) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  };

  const filterBtnStyle = (active) => ({
    padding: '7px 14px', borderRadius: '20px', border: `1.5px solid ${active ? C.gold : C.border}`,
    background: active ? C.goldBg : C.white, color: active ? C.gold : C.gray,
    fontSize: '0.83rem', fontWeight: active ? 'bold' : 'normal', cursor: 'pointer',
    fontFamily: 'inherit', whiteSpace: 'nowrap',
  });

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.7rem', fontWeight: 'bold', color: C.dark, margin: '0 0 6px' }}>
          Manajemen User
        </h1>
        <p style={{ color: C.gray, fontSize: '0.92rem', margin: 0, lineHeight: 1.5 }}>
          Kelola peran dan status seluruh pengguna yang terdaftar.
        </p>
      </div>

      {toast && (
        <div style={{
          background: toast.type === 'success' ? C.successBg : C.dangerBg,
          border: `1.5px solid ${toast.type === 'success' ? C.success : C.danger}`,
          color: toast.type === 'success' ? C.success : C.danger,
          borderRadius: '12px', padding: '10px 16px', fontSize: '0.88rem', marginBottom: '1.1rem',
        }}>
          {toast.type === 'success' ? '✓ ' : '⚠️ '}{toast.message}
        </div>
      )}

      {error && (
        <div style={{
          background: C.dangerBg, border: `1.5px solid ${C.danger}`, color: C.danger,
          borderRadius: '12px', padding: '10px 16px', fontSize: '0.88rem', marginBottom: '1.1rem',
        }}>
          ⚠️ {error}
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '1rem' }}>
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            padding: '9px 16px', borderRadius: '10px', border: 'none',
            background: C.gold, color: C.white, fontSize: '0.85rem', fontWeight: 'bold',
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          + Tambah User
        </button>
        <button
          onClick={handleDownloadTemplate}
          style={{
            padding: '9px 16px', borderRadius: '10px', border: `1.5px solid ${C.border}`,
            background: C.white, color: C.gray, fontSize: '0.85rem', fontWeight: 'bold',
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          📋 Download Template
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
          style={{
            padding: '9px 16px', borderRadius: '10px', border: `1.5px solid ${C.border}`,
            background: C.white, color: C.gray, fontSize: '0.85rem', fontWeight: 'bold',
            cursor: importing ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            opacity: importing ? 0.6 : 1,
          }}
        >
          {importing ? 'Mengimpor...' : '📂 Import Excel'}
        </button>
        <input
          type="file" accept=".xlsx,.xls" ref={fileInputRef}
          onChange={handleImport} style={{ display: 'none' }}
        />
        <button
          onClick={handleExport}
          style={{
            padding: '9px 16px', borderRadius: '10px', border: `1.5px solid ${C.border}`,
            background: C.white, color: C.gray, fontSize: '0.85rem', fontWeight: 'bold',
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          📎 Ekspor Excel
        </button>
        <button
          onClick={handleGenerateAllReferrals}
          disabled={importing}
          style={{
            padding: '9px 16px', borderRadius: '10px', border: `1.5px solid ${C.gold}`,
            background: C.white, color: C.gold, fontSize: '0.85rem', fontWeight: 'bold',
            cursor: importing ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            opacity: importing ? 0.6 : 1,
          }}
        >
          🎟️ Generate Kode Referral
        </button>
      </div>

      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '0.7rem', alignItems: 'center',
        marginBottom: '1.25rem',
      }}>
        <input
          type="text"
          placeholder="Cari nama atau email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: '1 1 220px', padding: '9px 14px', borderRadius: '10px',
            border: `1.5px solid ${C.border}`, fontSize: '0.88rem', fontFamily: 'inherit',
            outline: 'none', boxSizing: 'border-box', color: C.dark,
          }}
        />

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {['all', 'student', 'teacher', 'parent', 'admin'].map(r => (
            <button key={r} onClick={() => setRoleFilter(r)} style={filterBtnStyle(roleFilter === r)}>
              {r === 'all' ? 'Semua Peran' : ROLE_LABEL[r]}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {['all', 'pending', 'approved', 'rejected'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} style={filterBtnStyle(statusFilter === s)}>
              {s === 'all' ? 'Semua Status' : STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div style={{
          background: C.white, border: `1.5px solid ${C.border}`, borderRadius: '16px',
          padding: '2.5rem', textAlign: 'center', color: C.gray, fontSize: '0.92rem',
        }}>
          Memuat daftar user...
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div style={{
          background: C.white, border: `1.5px solid ${C.border}`, borderRadius: '16px',
          padding: '3rem 2rem', textAlign: 'center',
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔍</div>
          <p style={{ color: C.dark, fontWeight: 'bold', fontSize: '1rem', margin: '0 0 4px' }}>
            Tidak ada user yang cocok
          </p>
          <p style={{ color: C.gray, fontSize: '0.88rem', margin: 0 }}>
            Coba ubah kata kunci pencarian atau filter.
          </p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div style={{
          background: C.white, border: `1.5px solid ${C.border}`, borderRadius: '16px',
          overflow: 'hidden',
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '960px' }}>
              <thead>
                <tr style={{ background: C.cream }}>
                  {['Nama', 'Email', 'Peran', 'Gender', 'Kelas', 'Mapel', 'Referral', 'Status', 'Terdaftar', 'Aksi'].map(h => (
                    <th key={h} style={{
                      textAlign: 'left', padding: '12px 16px', fontSize: '0.78rem',
                      color: C.gray, fontWeight: 'bold', textTransform: 'uppercase',
                      letterSpacing: '0.03em', borderBottom: `1.5px solid ${C.border}`,
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => {
                  const sc = STATUS_COLOR[u.status] || { color: C.gray, bg: C.cream };
                  const isBusy = busyId === u.id;
                  return (
                    <tr key={u.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: '12px 16px', fontSize: '0.88rem', color: C.dark, fontWeight: 'bold' }}>
                        {u.full_name || '(Tanpa nama)'}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: C.gray }}>
                        {u.email}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <select
                          value={u.role}
                          disabled={isBusy}
                          onChange={e => handleRoleChange(u.id, u.full_name || u.email, e.target.value)}
                          style={{
                            padding: '6px 10px', borderRadius: '8px', border: `1.5px solid ${C.border}`,
                            fontSize: '0.83rem', fontFamily: 'inherit', color: C.dark, background: C.white,
                            cursor: isBusy ? 'not-allowed' : 'pointer',
                          }}
                        >
                          <option value="student">Siswa</option>
                          <option value="teacher">Guru</option>
                          <option value="parent">Wali Siswa</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <select
                          value={u.gender || ''}
                          disabled={isBusy}
                          onChange={e => handleGenderChange(u.id, u.full_name || u.email, e.target.value)}
                          style={{
                            padding: '6px 10px', borderRadius: '8px', border: `1.5px solid ${C.border}`,
                            fontSize: '0.83rem', fontFamily: 'inherit', color: C.dark, background: C.white,
                            cursor: isBusy ? 'not-allowed' : 'pointer',
                          }}
                        >
                          <option value="">Belum diisi</option>
                          <option value="L">Laki-laki</option>
                          <option value="P">Perempuan</option>
                        </select>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {u.role === 'student' ? (
                          <select
                            value={u.kelas || ''}
                            disabled={isBusy}
                            onChange={e => handleKelasChange(u.id, u.full_name || u.email, e.target.value)}
                            style={{
                              padding: '6px 10px', borderRadius: '8px', border: `1.5px solid ${C.border}`,
                              fontSize: '0.83rem', fontFamily: 'inherit', color: C.dark, background: C.white,
                              cursor: isBusy ? 'not-allowed' : 'pointer',
                            }}
                          >
                            <option value="">Belum diisi</option>
                            {KELAS_OPTIONS.map(k => (
                              <option key={k} value={k}>{k}</option>
                            ))}
                          </select>
                        ) : (
                          <span style={{ color: C.gray, fontSize: '0.83rem' }}>-</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {u.role === 'teacher' ? (
                          <div
                            ref={mapelDropdownOpenId === u.id ? mapelDropdownRef : null}
                            style={{ position: 'relative', minWidth: '160px' }}
                          >
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => setMapelDropdownOpenId(mapelDropdownOpenId === u.id ? null : u.id)}
                              style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                textAlign: 'left',
                                padding: '6px 10px',
                                borderRadius: '8px',
                                border: `1.5px solid ${mapelDropdownOpenId === u.id ? C.gold : C.border}`,
                                fontSize: '0.83rem',
                                fontFamily: 'inherit',
                                color: C.dark,
                                background: C.white,
                                cursor: isBusy ? 'not-allowed' : 'pointer',
                              }}
                            >
                              {(u.mapel && u.mapel.length > 0) ? (
                                <span style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', flex: 1 }}>
                                  {u.mapel.map(m => (
                                    <span key={m} style={{
                                      background: C.goldBg, color: C.gold, fontSize: '0.72rem', fontWeight: 'bold',
                                      padding: '2px 8px', borderRadius: '10px', whiteSpace: 'nowrap',
                                    }}>
                                      {m}
                                    </span>
                                  ))}
                                </span>
                              ) : (
                                <span style={{ color: C.gray, flex: 1 }}>Pilih mapel</span>
                              )}
                              <span style={{ color: C.gray, fontSize: '0.7rem' }}>▾</span>
                            </button>

                            {mapelDropdownOpenId === u.id && (
                              <div style={{
                                position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 30,
                                minWidth: '190px', background: C.white, border: `1.5px solid ${C.border}`,
                                borderRadius: '10px', boxShadow: '0 8px 20px rgba(23,20,17,0.14)', padding: '6px',
                              }}>
                                {MAPEL_OPTIONS.map(m => {
                                  const checked = (u.mapel || []).includes(m);
                                  return (
                                    <label
                                      key={m}
                                      style={{
                                        display: 'flex', alignItems: 'center', gap: '9px', padding: '7px 8px',
                                        borderRadius: '6px', cursor: 'pointer', fontSize: '0.83rem', color: C.dark,
                                      }}
                                      onMouseEnter={e => { e.currentTarget.style.background = C.cream; }}
                                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        disabled={isBusy}
                                        onChange={() => {
                                          const current = u.mapel || [];
                                          const next = checked ? current.filter(x => x !== m) : [...current, m];
                                          handleMapelChange(u.id, u.full_name || u.email, next);
                                        }}
                                        style={{ accentColor: C.gold, width: '15px', height: '15px', cursor: 'pointer' }}
                                      />
                                      {m}
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: C.gray, fontSize: '0.83rem' }}>-</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {u.referral_code ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{
                              fontFamily: 'monospace', fontSize: '0.82rem', fontWeight: 'bold',
                              color: C.dark, background: C.cream, padding: '4px 8px', borderRadius: '6px',
                              letterSpacing: '0.3px', whiteSpace: 'nowrap',
                            }}>
                              {u.referral_code}
                            </span>
                            <IconBtn
                              title="Salin kode"
                              color={C.gray} bg={C.white} border={C.border}
                              onClick={() => handleCopyReferral(u.referral_code)}
                            >
                              <IconCopy />
                            </IconBtn>
                            <IconBtn
                              title="Buat ulang kode"
                              disabled={isBusy}
                              color={C.gold} bg={C.white} border={C.border}
                              onClick={() => handleGenerateReferral(u.id, u.full_name || u.email)}
                            >
                              <IconRefresh />
                            </IconBtn>
                          </div>
                        ) : (
                          <IconBtn
                            title="Buat kode referral"
                            disabled={isBusy}
                            color={C.gold} bg={C.goldBg} border={C.gold}
                            onClick={() => handleGenerateReferral(u.id, u.full_name || u.email)}
                          >
                            <IconTicket />
                          </IconBtn>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          background: sc.bg, color: sc.color, fontSize: '0.76rem', fontWeight: 'bold',
                          padding: '4px 11px', borderRadius: '20px', whiteSpace: 'nowrap',
                        }}>
                          {STATUS_LABEL[u.status] || u.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '0.83rem', color: C.gray, whiteSpace: 'nowrap' }}>
                        {formatDate(u.created_at)}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {u.status !== 'approved' && (
                            <IconBtn
                              title="Setujui"
                              disabled={isBusy}
                              color={C.white} bg={C.gold} border={C.gold}
                              onClick={() => handleStatusChange(u.id, u.full_name || u.email, 'approved')}
                            >
                              <IconCheck />
                            </IconBtn>
                          )}
                          {u.status !== 'rejected' && (
                            <IconBtn
                              title="Tolak"
                              disabled={isBusy}
                              color={C.danger} bg={C.white} border={C.danger}
                              onClick={() => handleStatusChange(u.id, u.full_name || u.email, 'rejected')}
                            >
                              <IconX />
                            </IconBtn>
                          )}
                          {(u.role === 'teacher' || u.role === 'student') && u.status === 'approved' && (
                            <IconBtn
                              title={loginAsId === u.id ? 'Membuka...' : `Masuk sebagai ${u.full_name || u.email}`}
                              disabled={isBusy || loginAsId === u.id}
                              color={C.gold} bg={C.white} border={C.gold}
                              onClick={() => handleLoginAs(u.id, u.full_name || u.email)}
                            >
                              {loginAsId === u.id ? <IconRefresh /> : <IconLogIn />}
                            </IconBtn>
                          )}
                          <IconBtn
                            title="Hapus"
                            disabled={isBusy}
                            color={C.gray} bg={C.white} border={C.border}
                            onClick={() => setConfirmDelete(u)}
                          >
                            <IconTrash />
                          </IconBtn>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(23,20,17,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
          padding: '1rem',
        }}>
          <div style={{
            background: C.white, borderRadius: '18px', padding: '1.75rem', maxWidth: '400px',
            width: '100%', boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
          }}>
            <h3 style={{ margin: '0 0 10px', fontSize: '1.1rem', color: C.dark, fontWeight: 'bold' }}>
              Hapus data user ini?
            </h3>
            <p style={{ margin: '0 0 8px', fontSize: '0.88rem', color: C.gray, lineHeight: 1.6 }}>
              Data profil <strong>{confirmDelete.full_name || confirmDelete.email}</strong> akan dihapus secara permanen.
            </p>
            <p style={{ margin: '0 0 20px', fontSize: '0.8rem', color: C.warn, background: C.warnBg, padding: '10px 12px', borderRadius: '10px', lineHeight: 1.5 }}>
              ⚠️ Ini hanya menghapus data profil. Akun login user ini tidak otomatis terhapus dari sistem autentikasi dan perlu dihapus terpisah oleh admin lewat Supabase Dashboard bila diperlukan.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setConfirmDelete(null)}
                style={{
                  padding: '9px 18px', borderRadius: '10px', border: `1.5px solid ${C.border}`,
                  background: C.white, color: C.gray, fontSize: '0.85rem', fontWeight: 'bold',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Batal
              </button>
              <button
                onClick={() => handleDeleteProfile(confirmDelete.id, confirmDelete.full_name || confirmDelete.email)}
                style={{
                  padding: '9px 18px', borderRadius: '10px', border: 'none',
                  background: C.danger, color: C.white, fontSize: '0.85rem', fontWeight: 'bold',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
      {showAddModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(23,20,17,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
          padding: '1rem',
        }}>
          <div style={{
            background: C.white, borderRadius: '18px', padding: '1.75rem', maxWidth: '420px',
            width: '100%', boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
          }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem', color: C.dark, fontWeight: 'bold' }}>
              Tambah User Baru
            </h3>
            <form onSubmit={handleAddUser} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input
                type="text" placeholder="Nama Lengkap" value={addForm.full_name}
                onChange={e => setAddForm({ ...addForm, full_name: e.target.value })}
                style={{
                  padding: '10px 14px', borderRadius: '10px', border: `1.5px solid ${C.border}`,
                  fontSize: '0.9rem', fontFamily: 'inherit', outline: 'none', color: C.dark,
                }}
              />
              <input
                type="email" placeholder="Email" value={addForm.email}
                onChange={e => setAddForm({ ...addForm, email: e.target.value })}
                style={{
                  padding: '10px 14px', borderRadius: '10px', border: `1.5px solid ${C.border}`,
                  fontSize: '0.9rem', fontFamily: 'inherit', outline: 'none', color: C.dark,
                }}
              />
              <input
                type="password" placeholder="Password (min 6 karakter)" value={addForm.password}
                onChange={e => setAddForm({ ...addForm, password: e.target.value })}
                style={{
                  padding: '10px 14px', borderRadius: '10px', border: `1.5px solid ${C.border}`,
                  fontSize: '0.9rem', fontFamily: 'inherit', outline: 'none', color: C.dark,
                }}
              />
              <select
                value={addForm.role}
                onChange={e => setAddForm({ ...addForm, role: e.target.value })}
                style={{
                  padding: '10px 14px', borderRadius: '10px', border: `1.5px solid ${C.border}`,
                  fontSize: '0.9rem', fontFamily: 'inherit', outline: 'none', color: C.dark, background: C.white,
                }}
              >
                <option value="student">Siswa</option>
                <option value="teacher">Guru</option>
                <option value="parent">Wali Siswa</option>
                <option value="admin">Admin</option>
              </select>

              <select
                value={addForm.gender}
                onChange={e => setAddForm({ ...addForm, gender: e.target.value })}
                style={{
                  padding: '10px 14px', borderRadius: '10px', border: `1.5px solid ${C.border}`,
                  fontSize: '0.9rem', fontFamily: 'inherit', outline: 'none', color: C.dark, background: C.white,
                }}
              >
                <option value="">Pilih Gender (opsional)</option>
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>

              {addForm.role === 'student' && (
                <select
                  value={addForm.kelas}
                  onChange={e => setAddForm({ ...addForm, kelas: e.target.value })}
                  style={{
                    padding: '10px 14px', borderRadius: '10px', border: `1.5px solid ${C.border}`,
                    fontSize: '0.9rem', fontFamily: 'inherit', outline: 'none', color: C.dark, background: C.white,
                  }}
                >
                  <option value="">Pilih Kelas (opsional)</option>
                  {KELAS_OPTIONS.map(k => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    padding: '9px 18px', borderRadius: '10px', border: `1.5px solid ${C.border}`,
                    background: C.white, color: C.gray, fontSize: '0.85rem', fontWeight: 'bold',
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={addSubmitting}
                  style={{
                    padding: '9px 18px', borderRadius: '10px', border: 'none',
                    background: addSubmitting ? '#ccc' : C.gold, color: C.white, fontSize: '0.85rem', fontWeight: 'bold',
                    cursor: addSubmitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                  }}
                >
                  {addSubmitting ? 'Menyimpan...' : 'Tambah User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminManageUser;