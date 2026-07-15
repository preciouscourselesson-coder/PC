import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient';

const C = {
  gold: '#b4964b',
  goldBg: '#f6efdc',
  green: '#2d6a4f',
  greenBg: '#e4efe9',
  red: '#b3423a',
  redBg: '#fbeceb',
  dark: '#171411',
  gray: '#444242',
  grayLight: '#8a8782',
  cream: '#f7f6f0',
  white: '#ffffff',
  border: '#e0ddd6',
};

const cardStyle = {
  background: C.white,
  border: `1px solid ${C.border}`,
  borderRadius: '16px',
  padding: '1.5rem',
};

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '10px',
  border: `1px solid ${C.border}`,
  fontFamily: 'inherit',
  fontSize: '0.9rem',
  boxSizing: 'border-box',
};

const AVATAR_PALETTE = [
  { bg: '#e4efe9', color: '#2d6a4f' },
  { bg: '#f6efdc', color: '#b4964b' },
  { bg: '#eaf0fb', color: '#3a5ba0' },
  { bg: '#fbeceb', color: '#b3423a' },
  { bg: '#f1e8f7', color: '#7a4fa0' },
];

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return (parts[0][0] || '?').toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const getAvatarStyle = (name) => {
  const sum = (name || '?').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_PALETTE[sum % AVATAR_PALETTE.length];
};

const Avatar = ({ name, size = 40 }) => {
  const style = getAvatarStyle(name);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: style.bg,
        color: style.color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: size < 36 ? '0.75rem' : '0.85rem',
        flexShrink: 0,
      }}
    >
      {getInitials(name)}
    </div>
  );
};

const RoleBadge = ({ role }) => {
  const isAdmin = role === 'admin';
  return (
    <span
      style={{
        fontSize: '0.72rem',
        fontWeight: 600,
        color: isAdmin ? C.gold : C.green,
      }}
    >
      {isAdmin ? 'Admin' : 'Guru'}
    </span>
  );
};

const formatTanggalLengkap = (isoDate) => {
  if (!isoDate) return '';
  const d = new Date(isoDate);
  const tgl = d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
  const jam = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  return `${tgl} · ${jam}`;
};

// ─── Komponen Utama ──────────────────────────────────────────────────────────
const StudentUpdates = () => {
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState(null);
  const [profileName, setProfileName] = useState('');
  const [updates, setUpdates] = useState([]);
  const [comments, setComments] = useState({}); // { updateId: [komentar] }
  const [errorMsg, setErrorMsg] = useState('');

  // State untuk form komentar per update
  const [commentTexts, setCommentTexts] = useState({});
  const [submitting, setSubmitting] = useState({});

  // Refs untuk scroll ke komentar baru
  const commentRefs = useRef({});

  // ── Load data awal ──────────────────────────────────────────────────────────
  const loadData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      // Ambil user session
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      const pid = userData?.user?.id;
      if (!pid) throw new Error('Tidak ada sesi login.');
      setProfileId(pid);

      // Ambil nama siswa dari tabel profiles
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', pid)
        .single();
      if (profileError) throw profileError;
      setProfileName(profileData?.full_name || 'Siswa');

      // Ambil semua updates (terbaru di atas)
      const { data: updatesData, error: updatesError } = await supabase
        .from('updates')
        .select('*')
        .order('created_at', { ascending: false });
      if (updatesError) throw updatesError;
      setUpdates(updatesData || []);

      // Ambil semua komentar untuk updates yang ada (join dengan profiles)
      if (updatesData && updatesData.length > 0) {
        const updateIds = updatesData.map(u => u.id);
        const { data: commentsData, error: commentsError } = await supabase
          .from('komentar_updates')
          .select('*, profiles!profile_id(full_name)') // join ke profiles
          .in('update_id', updateIds)
          .order('created_at', { ascending: true });
        if (commentsError) throw commentsError;

        // Kelompokkan komentar berdasarkan update_id
        const grouped = {};
        commentsData.forEach(c => {
          if (!grouped[c.update_id]) grouped[c.update_id] = [];
          grouped[c.update_id].push(c);
        });
        setComments(grouped);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Gagal memuat data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ── Kirim komentar ─────────────────────────────────────────────────────────
  const handleCommentSubmit = async (updateId) => {
    const text = (commentTexts[updateId] || '').trim();
    if (!text) {
      setErrorMsg('Komentar tidak boleh kosong.');
      return;
    }

    setSubmitting(prev => ({ ...prev, [updateId]: true }));
    setErrorMsg('');

    try {
      // Insert komentar – RLS akan memastikan hanya student yang bisa menambah
      const { data, error } = await supabase
        .from('komentar_updates')
        .insert({
          update_id: updateId,
          profile_id: profileId,
          isi: text,
        })
        .select('*, profiles!profile_id(full_name)');
      if (error) throw error;

      const inserted = data && data[0] ? data[0] : null;
      if (inserted) {
        // Tambahkan komentar ke state
        setComments(prev => ({
          ...prev,
          [updateId]: [...(prev[updateId] || []), inserted],
        }));
      }

      // Kosongkan input
      setCommentTexts(prev => ({ ...prev, [updateId]: '' }));

      // Scroll ke komentar baru
      setTimeout(() => {
        const ref = commentRefs.current[updateId];
        if (ref) ref.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Gagal mengirim komentar.');
    } finally {
      setSubmitting(prev => ({ ...prev, [updateId]: false }));
    }
  };

  // ── Hapus komentar (hanya milik sendiri) ──────────────────────────────────
  const handleDeleteComment = async (commentId, updateId) => {
    if (!window.confirm('Hapus komentar ini?')) return;
    try {
      // RLS akan membatasi hanya profile_id yang sama yang bisa menghapus
      const { error } = await supabase
        .from('komentar_updates')
        .delete()
        .eq('id', commentId)
        .eq('profile_id', profileId); // opsional, RLS juga membatasi
      if (error) throw error;

      // Hapus dari state
      setComments(prev => ({
        ...prev,
        [updateId]: (prev[updateId] || []).filter(c => c.id !== commentId),
      }));
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Gagal menghapus komentar.');
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: '760px', margin: '0 auto', fontFamily: 'inherit' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: C.dark, margin: 0 }}>Updates</h1>
        <p style={{ color: C.grayLight, marginTop: '4px' }}>Lihat pengumuman dari guru dan beri komentar</p>
      </div>

      {errorMsg && (
        <div style={{ background: C.redBg, color: C.red, padding: '0.75rem 1rem', borderRadius: '10px', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          {errorMsg}
        </div>
      )}

      <div style={cardStyle}>
        {loading ? (
          <p style={{ color: C.gray, fontSize: '0.9rem' }}>Memuat...</p>
        ) : updates.length === 0 ? (
          <p style={{ color: C.gray, fontSize: '0.9rem' }}>Belum ada update dari guru.</p>
        ) : (
          updates.map((u, idx) => {
            const komentarList = comments[u.id] || [];
            const isSubmitting = submitting[u.id] || false;

            return (
              <div
                key={u.id}
                style={{
                  padding: '1.5rem 0',
                  borderBottom: idx < updates.length - 1 ? `1px solid ${C.border}` : 'none',
                }}
              >
                {/* Header update */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <Avatar name={u.nama_pembuat} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, color: C.dark, fontSize: '0.92rem' }}>{u.nama_pembuat}</span>
                      <span style={{ color: C.grayLight, fontSize: '0.75rem' }}>▸</span>
                      <RoleBadge role={u.role_pembuat} />
                    </div>

                    {/* Konten update */}
                    {u.konten && (
                      <div
                        style={{ marginTop: '0.4rem', fontSize: '0.9rem', color: C.dark, lineHeight: 1.55 }}
                        dangerouslySetInnerHTML={{ __html: u.konten }}
                      />
                    )}

                    {u.image_url && (
                      <div style={{ marginTop: '0.6rem' }}>
                        <img
                          src={u.image_url}
                          alt="Lampiran update"
                          style={{ maxWidth: '100%', maxHeight: '360px', borderRadius: '10px', border: `1px solid ${C.border}`, display: 'block' }}
                        />
                      </div>
                    )}

                    {u.link_url && (
                      <a
                        href={u.link_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          marginTop: '0.6rem',
                          padding: '7px 12px',
                          background: C.cream,
                          border: `1px solid ${C.border}`,
                          borderRadius: '8px',
                          fontSize: '0.82rem',
                          color: C.gold,
                          fontWeight: 600,
                          textDecoration: 'none',
                          wordBreak: 'break-all',
                        }}
                      >
                        🔗 {u.link_url}
                      </a>
                    )}

                    <div style={{ marginTop: '0.6rem', fontSize: '0.75rem', color: C.grayLight }}>
                      {formatTanggalLengkap(u.created_at)}
                    </div>
                  </div>
                </div>

                {/* ─── Bagian Komentar ─── */}
                <div style={{ marginTop: '1.2rem', paddingLeft: '52px' }}>
                  {/* Form komentar */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <Avatar name={profileName} size={32} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <textarea
                        value={commentTexts[u.id] || ''}
                        onChange={(e) => setCommentTexts(prev => ({ ...prev, [u.id]: e.target.value }))}
                        placeholder="Tulis komentar..."
                        rows={2}
                        style={{
                          ...inputStyle,
                          resize: 'vertical',
                          fontSize: '0.85rem',
                          padding: '8px 10px',
                          width: '100%',
                        }}
                        disabled={isSubmitting}
                      />
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                        <button
                          onClick={() => handleCommentSubmit(u.id)}
                          disabled={isSubmitting || !(commentTexts[u.id] || '').trim()}
                          style={{
                            background: C.gold,
                            color: C.white,
                            border: 'none',
                            borderRadius: '8px',
                            padding: '5px 16px',
                            fontWeight: 600,
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            opacity: isSubmitting || !(commentTexts[u.id] || '').trim() ? 0.5 : 1,
                            transition: 'all 0.15s',
                          }}
                        >
                          {isSubmitting ? 'Mengirim...' : 'Kirim'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Daftar komentar */}
                  {komentarList.length > 0 && (
                    <div style={{ marginTop: '0.8rem' }}>
                      {komentarList.map((kom, kIdx) => {
                        // Nama pembuat komentar diambil dari hasil join (profiles)
                        const komentarNama = kom.profiles?.full_name || 'Siswa';
                        const isOwn = kom.profile_id === profileId;
                        return (
                          <div
                            key={kom.id}
                            ref={(el) => {
                              if (kIdx === komentarList.length - 1) {
                                commentRefs.current[u.id] = el;
                              }
                            }}
                            style={{
                              display: 'flex',
                              gap: '8px',
                              padding: '8px 0',
                              borderBottom: kIdx < komentarList.length - 1 ? `1px solid ${C.border}` : 'none',
                            }}
                          >
                            <Avatar name={komentarNama} size={28} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 600, color: C.dark, fontSize: '0.8rem' }}>
                                  {komentarNama}
                                </span>
                                <span style={{ fontSize: '0.65rem', color: C.grayLight }}>
                                  {formatTanggalLengkap(kom.created_at)}
                                </span>
                                {isOwn && (
                                  <button
                                    onClick={() => handleDeleteComment(kom.id, u.id)}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: C.grayLight,
                                      fontSize: '0.7rem',
                                      cursor: 'pointer',
                                      padding: '0 4px',
                                      textDecoration: 'underline',
                                      fontFamily: 'inherit',
                                    }}
                                  >
                                    Hapus
                                  </button>
                                )}
                              </div>
                              <div style={{ fontSize: '0.85rem', color: C.dark, marginTop: '2px', wordBreak: 'break-word' }}>
                                {kom.isi}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default StudentUpdates;