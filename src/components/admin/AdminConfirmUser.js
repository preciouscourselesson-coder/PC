import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../supabaseClient';

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
};

const ROLE_LABEL = {
  student: 'Siswa',
  teacher: 'Guru',
  parent:  'Wali Siswa',
  admin:   'Admin',
};

const AdminConfirmUser = () => {
  const [users, setUsers]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [toast, setToast]           = useState(null);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    setLoading(false);

    if (fetchError) {
      setError('Gagal memuat daftar pendaftar. Silakan muat ulang halaman.');
      return;
    }
    setUsers(data || []);
  }, []);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleDecision = async (id, name, decision) => {
    setProcessingId(id);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ status: decision })
      .eq('id', id);

    setProcessingId(null);

    if (updateError) {
      setToast({ type: 'error', message: `Gagal memproses akun ${name}. Coba lagi.` });
      return;
    }

    setUsers(prev => prev.filter(u => u.id !== id));
    setToast({
      type: 'success',
      message: decision === 'approved'
        ? `Akun ${name} telah disetujui.`
        : `Akun ${name} telah ditolak.`,
    });
  };

  const formatDate = (iso) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div>
      <div style={{ maxWidth: '860px' }}>

        {/* Header */}
        <div style={{ marginBottom: '1.75rem' }}>
          <h1 style={{ fontSize: '1.7rem', fontWeight: 'bold', color: C.dark, margin: '0 0 6px' }}>
            Persetujuan Pendaftar Baru
          </h1>
          <p style={{ color: C.gray, fontSize: '0.92rem', margin: 0, lineHeight: 1.5 }}>
            Tinjau akun yang baru mendaftar sebelum mereka dapat masuk ke sistem.
          </p>
        </div>

        {/* Toast */}
        {toast && (
          <div style={{
            background: toast.type === 'success' ? C.successBg : C.dangerBg,
            border: `1.5px solid ${toast.type === 'success' ? C.success : C.danger}`,
            color: toast.type === 'success' ? C.success : C.danger,
            borderRadius: '12px', padding: '10px 16px', fontSize: '0.88rem',
            marginBottom: '1.25rem',
          }}>
            {toast.type === 'success' ? '✓ ' : '⚠️ '}{toast.message}
          </div>
        )}

        {/* Error state */}
        {error && (
          <div style={{
            background: C.dangerBg, border: `1.5px solid ${C.danger}`, color: C.danger,
            borderRadius: '12px', padding: '10px 16px', fontSize: '0.88rem', marginBottom: '1.25rem',
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div style={{
            background: C.white, border: `1.5px solid ${C.border}`, borderRadius: '16px',
            padding: '2.5rem', textAlign: 'center', color: C.gray, fontSize: '0.92rem',
          }}>
            Memuat daftar pendaftar...
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && users.length === 0 && (
          <div style={{
            background: C.white, border: `1.5px solid ${C.border}`, borderRadius: '16px',
            padding: '3rem 2rem', textAlign: 'center',
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📭</div>
            <p style={{ color: C.dark, fontWeight: 'bold', fontSize: '1rem', margin: '0 0 4px' }}>
              Tidak ada pendaftar yang menunggu
            </p>
            <p style={{ color: C.gray, fontSize: '0.88rem', margin: 0 }}>
              Semua akun baru sudah diproses.
            </p>
          </div>
        )}

        {/* List */}
        {!loading && users.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            {users.map(u => (
              <div key={u.id} style={{
                background: C.white, border: `1.5px solid ${C.border}`, borderRadius: '16px',
                padding: '1.2rem 1.4rem', display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap',
              }}>
                <div style={{ minWidth: '220px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 'bold', color: C.dark, fontSize: '0.98rem' }}>
                      {u.full_name || '(Tanpa nama)'}
                    </span>
                    <span style={{
                      background: C.goldBg, color: C.gold, fontSize: '0.72rem', fontWeight: 'bold',
                      padding: '2px 9px', borderRadius: '20px', textTransform: 'uppercase',
                      letterSpacing: '0.03em',
                    }}>
                      {ROLE_LABEL[u.role] || u.role}
                    </span>
                  </div>
                  <div style={{ color: C.gray, fontSize: '0.85rem' }}>{u.email}</div>
                  <div style={{ color: C.gray, fontSize: '0.78rem', marginTop: '2px' }}>
                    Mendaftar: {formatDate(u.created_at)}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.6rem' }}>
                  <button
                    onClick={() => handleDecision(u.id, u.full_name || u.email, 'rejected')}
                    disabled={processingId === u.id}
                    style={{
                      background: C.white, border: `1.5px solid ${C.danger}`, color: C.danger,
                      padding: '9px 18px', borderRadius: '10px', fontWeight: 'bold', fontSize: '0.85rem',
                      cursor: processingId === u.id ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                      opacity: processingId === u.id ? 0.6 : 1, transition: 'background 0.2s',
                    }}
                  >
                    Tolak
                  </button>
                  <button
                    onClick={() => handleDecision(u.id, u.full_name || u.email, 'approved')}
                    disabled={processingId === u.id}
                    style={{
                      background: processingId === u.id ? '#ccc' : C.gold, border: 'none', color: C.white,
                      padding: '9px 18px', borderRadius: '10px', fontWeight: 'bold', fontSize: '0.85rem',
                      cursor: processingId === u.id ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                      transition: 'background 0.2s',
                    }}
                  >
                    {processingId === u.id ? 'Memproses...' : 'Setujui'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminConfirmUser;