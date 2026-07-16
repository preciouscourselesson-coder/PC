import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
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

const cardStyle = {
  background: C.white,
  border: `1px solid ${C.border}`,
  borderRadius: '16px',
  padding: '1.5rem',
  boxSizing: 'border-box',
};

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '10px',
  border: `1px solid ${C.border}`,
  fontFamily: 'inherit',
  fontSize: '16px',
  boxSizing: 'border-box',
};

const buttonKirim = {
  background: C.gold,
  color: C.white,
  border: 'none',
  borderRadius: '10px',
  padding: '9px 20px',
  fontWeight: 600,
  fontSize: '0.9rem',
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const buttonBatal = {
  background: 'none',
  border: 'none',
  color: C.gray,
  padding: '9px 14px',
  fontWeight: 600,
  fontSize: '0.9rem',
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const linkBtn = {
  background: 'none',
  border: 'none',
  color: C.gold,
  fontWeight: 600,
  fontSize: '0.85rem',
  cursor: 'pointer',
  fontFamily: 'inherit',
  padding: 0,
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

// ─── Sanitizer & Utilities ──────────────────────────────────────────────────
const ALLOWED_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'UL', 'OL', 'LI', 'BR', 'DIV', 'SPAN', 'P', 'A']);
const sanitizeHtml = (html) => {
  const template = document.createElement('template');
  template.innerHTML = html || '';
  const clean = (node) => {
    Array.from(node.childNodes).forEach(child => {
      if (child.nodeType === 1) {
        if (!ALLOWED_TAGS.has(child.tagName)) {
          child.replaceWith(document.createTextNode(child.textContent));
          return;
        }
        Array.from(child.attributes).forEach(attr => {
          if (child.tagName === 'A' && attr.name === 'href') {
            if (!/^https?:\/\//i.test(attr.value)) child.removeAttribute('href');
          } else {
            child.removeAttribute(attr.name);
          }
        });
        if (child.tagName === 'A') {
          child.setAttribute('target', '_blank');
          child.setAttribute('rel', 'noopener noreferrer');
        }
        clean(child);
      } else if (child.nodeType === 8) {
        child.remove();
      }
    });
  };
  clean(template.content);
  return template.innerHTML;
};

const stripHtml = (html) => {
  const div = document.createElement('div');
  div.innerHTML = html || '';
  return (div.textContent || div.innerText || '').trim();
};

const formatTanggalLengkap = (isoDate) => {
  if (!isoDate) return '';
  const d = new Date(isoDate);
  const tgl = d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
  const jam = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  return `${tgl} · ${jam}`;
};

const isValidUrl = (str) => {
  if (!str) return true;
  try {
    const u = new URL(str);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
};

const ToolbarButton = ({ onCommand, title, active, children }) => (
  <button
    type="button"
    title={title}
    onMouseDown={(e) => { e.preventDefault(); onCommand(); }}
    style={{
      minWidth: '34px',
      height: '34px',
      padding: '0 6px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: 'none',
      borderRadius: '6px',
      background: active ? C.goldBg : 'transparent',
      color: C.dark,
      cursor: 'pointer',
      fontSize: '0.85rem',
      fontFamily: 'inherit',
    }}
  >
    {children}
  </button>
);

const ToolbarDivider = () => <div style={{ width: '1px', alignSelf: 'stretch', background: C.border, margin: '2px 4px' }} />;

// ─── KOMPONEN UTAMA ──────────────────────────────────────────────────────────
const TeacherUpdates = () => {
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState(null);
  const [guru, setGuru] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');

  // ── State komentar ──
  const [comments, setComments] = useState({}); // { updateId: [komentar] }
  const [replyTo, setReplyTo] = useState({}); // { commentId: true } untuk toggle form balasan
  const [replyTexts, setReplyTexts] = useState({}); // { commentId: text }
  const [submittingReply, setSubmittingReply] = useState({});

  // ── State composer update ──
  const [composerOpen, setComposerOpen] = useState(false);
  const [isEditorEmpty, setIsEditorEmpty] = useState(true);
  const [linkUrl, setLinkUrl] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmHapusId, setConfirmHapusId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef(null);

  const [expandedIds, setExpandedIds] = useState(new Set());
  const [overflowIds, setOverflowIds] = useState(new Set());

  const editorRef = useRef(null);
  const contentRefs = useRef({});

  // ── Load data ──
  const loadAll = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      const pid = userData?.user?.id;
      if (!pid) throw new Error('Tidak ada sesi login.');
      setProfileId(pid);

      const { data: guruData, error: guruError } = await supabase
        .from('guru')
        .select('*')
        .eq('profile_id', pid)
        .single();
      if (guruError) throw guruError;
      setGuru(guruData);

      // Ambil updates
      const { data: updatesData, error: updatesError } = await supabase
        .from('updates')
        .select('*')
        .order('created_at', { ascending: false });
      if (updatesError) throw updatesError;
      setUpdates(updatesData || []);

      // Ambil komentar (termasuk parent_comment_id)
      if (updatesData && updatesData.length > 0) {
        const updateIds = updatesData.map(u => u.id);
        const { data: commentsData, error: commentsError } = await supabase
          .from('komentar_updates')
          .select('*, profiles!profile_id(full_name)')
          .in('update_id', updateIds)
          .order('created_at', { ascending: true });
        if (commentsError) throw commentsError;

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
    loadAll();
  }, []);

  // ── Efek preview ──
  useEffect(() => () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
  }, [imagePreview]);

  useEffect(() => {
    if (composerOpen && editorRef.current) {
      editorRef.current.focus();
    }
  }, [composerOpen]);

  useLayoutEffect(() => {
    const ids = new Set();
    updates.forEach(u => {
      const el = contentRefs.current[u.id];
      if (el && el.scrollHeight > el.clientHeight + 2) {
        ids.add(u.id);
      }
    });
    setOverflowIds(ids);
  }, [updates]);

  const toggleExpand = (id) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── Composer update ──
  const handleEditorInput = () => {
    const text = editorRef.current?.textContent || '';
    setIsEditorEmpty(text.trim().length === 0);
  };

  const handleImageChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMsg('File harus berupa gambar.');
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setErrorMsg('');
  };

  const handleRemoveImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const handleBatal = () => {
    if (editorRef.current) editorRef.current.innerHTML = '';
    setIsEditorEmpty(true);
    setLinkUrl('');
    setShowLinkInput(false);
    setComposerOpen(false);
    setErrorMsg('');
    handleRemoveImage();
  };

  const submitUpdate = async () => {
    const html = editorRef.current ? editorRef.current.innerHTML : '';
    const plainText = stripHtml(html);
    const linkTrim = linkUrl.trim();

    if (!plainText && !linkTrim && !imageFile) {
      setErrorMsg('Isi pengumuman, tambahkan link, atau lampirkan gambar.');
      return;
    }
    if (linkTrim && !isValidUrl(linkTrim)) {
      setErrorMsg('Link tidak valid.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    try {
      let imageUrl = null;
      if (imageFile) {
        setUploadingImage(true);
        const path = `${profileId}/${Date.now()}_${imageFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from('updates')
          .upload(path, imageFile);
        setUploadingImage(false);
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from('updates').getPublicUrl(path);
        imageUrl = publicUrlData?.publicUrl || null;
      }

      const payload = {
        dibuat_oleh: profileId,
        nama_pembuat: guru?.nama || 'Guru',
        role_pembuat: 'teacher',
        konten: plainText ? sanitizeHtml(html) : null,
        link_url: linkTrim || null,
        image_url: imageUrl,
      };
      const { error } = await supabase.from('updates').insert(payload);
      if (error) throw error;

      // Notifikasi ke siswa
      try {
        const { data: siswaProfiles, error: siswaError } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'student')
          .eq('status', 'approved');
        if (!siswaError && siswaProfiles && siswaProfiles.length > 0) {
          const cuplikan = plainText
            ? (plainText.length > 80 ? `${plainText.slice(0, 80)}...` : plainText)
            : 'Lihat link terbaru';
          const pesan = `Guru ${guru?.nama || ''} mempublikasikan update baru: "${cuplikan}"`;
          const rows = siswaProfiles.map(s => ({ user_id: s.id, pesan, link: null }));
          await supabase.from('notifikasi').insert(rows);
        }
      } catch (notifErr) { /* ignore */ }

      handleBatal();
      await loadAll();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Gagal mempublikasikan update.');
    } finally {
      setSubmitting(false);
    }
  };

  const hapusUpdate = async (id) => {
    setDeletingId(id);
    setErrorMsg('');
    try {
      const target = updates.find(u => u.id === id);
      const { error } = await supabase.from('updates').delete().eq('id', id);
      if (error) throw error;

      if (target?.image_url) {
        try {
          const marker = '/object/public/updates/';
          const idx = target.image_url.indexOf(marker);
          if (idx !== -1) {
            const filePath = target.image_url.slice(idx + marker.length);
            await supabase.storage.from('updates').remove([filePath]);
          }
        } catch (cleanupErr) { /* ignore */ }
      }

      setUpdates(list => list.filter(u => u.id !== id));
      setConfirmHapusId(null);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Gagal menghapus update.');
    } finally {
      setDeletingId(null);
    }
  };

  // ── KOMENTAR & BALASAN ──
  const handleReplyToggle = (commentId) => {
    setReplyTo(prev => {
      const next = { ...prev };
      if (next[commentId]) {
        delete next[commentId];
        setReplyTexts(prevText => ({ ...prevText, [commentId]: '' }));
      } else {
        next[commentId] = true;
      }
      return next;
    });
  };

  const handleReplySubmit = async (updateId, parentCommentId) => {
    const text = (replyTexts[parentCommentId] || '').trim();
    if (!text) {
      setErrorMsg('Balasan tidak boleh kosong.');
      return;
    }

    setSubmittingReply(prev => ({ ...prev, [parentCommentId]: true }));
    setErrorMsg('');

    try {
      const { data, error } = await supabase
        .from('komentar_updates')
        .insert({
          update_id: updateId,
          profile_id: profileId,
          isi: text,
          parent_comment_id: parentCommentId, // penting!
        })
        .select('*, profiles!profile_id(full_name)');
      if (error) throw error;

      const inserted = data && data[0] ? data[0] : null;
      if (inserted) {
        setComments(prev => ({
          ...prev,
          [updateId]: [...(prev[updateId] || []), inserted],
        }));
      }

      // Reset state
      setReplyTexts(prev => ({ ...prev, [parentCommentId]: '' }));
      setReplyTo(prev => {
        const next = { ...prev };
        delete next[parentCommentId];
        return next;
      });
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Gagal mengirim balasan.');
    } finally {
      setSubmittingReply(prev => ({ ...prev, [parentCommentId]: false }));
    }
  };

  // ── Hapus komentar (hanya milik sendiri) ──
  const handleDeleteComment = async (commentId, updateId) => {
    if (!window.confirm('Hapus komentar ini?')) return;
    try {
      const { error } = await supabase
        .from('komentar_updates')
        .delete()
        .eq('id', commentId)
        .eq('profile_id', profileId);
      if (error) throw error;
      setComments(prev => ({
        ...prev,
        [updateId]: (prev[updateId] || []).filter(c => c.id !== commentId),
      }));
    } catch (err) {
      setErrorMsg(err.message || 'Gagal hapus komentar.');
    }
  };

  // ── RENDER ──
  return (
    <div style={{ maxWidth: '760px', margin: '0 auto', fontFamily: 'inherit' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: isMobile ? '1.35rem' : '1.6rem', fontWeight: 700, color: C.dark, margin: 0 }}>Updates</h1>
      </div>

      {errorMsg && (
        <div style={{ background: C.redBg, color: C.red, padding: '0.75rem 1rem', borderRadius: '10px', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          {errorMsg}
        </div>
      )}

      {/* Composer Update (sama seperti sebelumnya) */}
      <div style={{ ...cardStyle, marginBottom: '1.5rem', padding: isMobile ? (composerOpen ? '0.9rem' : '0.5rem 0.8rem') : (composerOpen ? '1.1rem' : '0.6rem 1.1rem') }}>
        <div style={{ display: 'flex', gap: isMobile ? '8px' : '12px', alignItems: composerOpen ? 'flex-start' : 'center' }}>
          <Avatar name={guru?.nama} size={isMobile ? 32 : 40} />
          <div style={{ flex: 1, minWidth: 0 }}>
            {!composerOpen ? (
              <button
                onClick={() => setComposerOpen(true)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '10px 16px',
                  borderRadius: '999px',
                  border: `1px solid ${C.border}`,
                  background: C.cream,
                  color: C.grayLight,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: '0.9rem',
                }}
              >
                Tulis pengumuman untuk siswa...
              </button>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginBottom: '0.6rem', paddingBottom: '0.6rem', borderBottom: `1px solid ${C.border}`, flexWrap: 'wrap' }}>
                  <ToolbarButton title="Tebal" onCommand={() => document.execCommand('bold')}><b>B</b></ToolbarButton>
                  <ToolbarButton title="Miring" onCommand={() => document.execCommand('italic')}><i>I</i></ToolbarButton>
                  <ToolbarButton title="Garis bawah" onCommand={() => document.execCommand('underline')}><u>U</u></ToolbarButton>
                  <ToolbarDivider />
                  <ToolbarButton title="Daftar poin" onCommand={() => document.execCommand('insertUnorderedList')}>☰•</ToolbarButton>
                  <ToolbarButton title="Daftar bernomor" onCommand={() => document.execCommand('insertOrderedList')}>☰1</ToolbarButton>
                  <ToolbarDivider />
                  <ToolbarButton title="Tambah link" active={showLinkInput} onCommand={() => setShowLinkInput(s => !s)}>🔗</ToolbarButton>
                  <ToolbarButton title="Sisipkan gambar" onCommand={() => imageInputRef.current?.click()}>🖼️</ToolbarButton>
                  <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
                </div>

                <div style={{ position: 'relative' }}>
                  {isEditorEmpty && (
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, color: C.grayLight, fontSize: '0.92rem', pointerEvents: 'none' }}>
                      Tulis pengumuman untuk siswa...
                    </div>
                  )}
                  <div
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={handleEditorInput}
                    style={{ minHeight: '90px', fontSize: '16px', color: C.dark, lineHeight: 1.55, outline: 'none' }}
                  />
                </div>

                {showLinkInput && (
                  <div style={{ marginTop: '0.75rem' }}>
                    <input type="url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://..." style={inputStyle} autoFocus />
                  </div>
                )}

                {imagePreview && (
                  <div style={{ position: 'relative', marginTop: '0.75rem', display: 'inline-block' }}>
                    <img src={imagePreview} alt="Preview" style={{ maxWidth: '100%', maxHeight: '220px', borderRadius: '10px', border: `1px solid ${C.border}`, display: 'block' }} />
                    <button onClick={handleRemoveImage} title="Hapus gambar" style={{ position: 'absolute', top: '6px', right: '6px', width: '24px', height: '24px', borderRadius: '50%', border: 'none', background: 'rgba(23,20,17,0.65)', color: C.white, cursor: 'pointer', fontSize: '0.8rem', lineHeight: 1 }}>✕</button>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                  <button onClick={handleBatal} style={{ ...buttonBatal, flex: isMobile ? '1 1 auto' : 'initial' }}>Batal</button>
                  <button onClick={submitUpdate} disabled={submitting} style={{ ...buttonKirim, opacity: submitting ? 0.6 : 1, flex: isMobile ? '1 1 auto' : 'initial' }}>
                    {submitting ? (uploadingImage ? 'Mengunggah gambar...' : 'Mempublikasikan...') : 'Publikasikan'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Feed Updates + Komentar */}
      <div style={{ ...cardStyle, padding: isMobile ? '1rem' : '1.5rem' }}>
        <h3 style={{ margin: '0 0 0.5rem 0', color: C.dark }}>Recent Activity</h3>
        {loading ? (
          <p style={{ color: C.gray, fontSize: '0.9rem' }}>Memuat...</p>
        ) : updates.length === 0 ? (
          <p style={{ color: C.gray, fontSize: '0.9rem' }}>Belum ada update.</p>
        ) : (
          updates.map((u, idx) => {
            const expanded = expandedIds.has(u.id);
            const hasOverflow = overflowIds.has(u.id);
            const komentarList = comments[u.id] || [];

            // Kelompokkan komentar: induk (parent null) dan balasan
            const rootComments = komentarList.filter(c => c.parent_comment_id === null);
            const replies = komentarList.filter(c => c.parent_comment_id !== null);

            return (
              <div key={u.id} style={{ padding: isMobile ? '0.9rem 0' : '1.1rem 0', borderBottom: idx < updates.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                {/* ── Update Card ── */}
                <div style={{ display: 'flex', gap: isMobile ? '8px' : '12px' }}>
                  <Avatar name={u.nama_pembuat} size={isMobile ? 32 : 40} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, color: C.dark, fontSize: '0.92rem' }}>{u.nama_pembuat}</span>
                      <span style={{ color: C.grayLight, fontSize: '0.75rem' }}>▸</span>
                      <RoleBadge role={u.role_pembuat} />
                    </div>

                    {u.konten && (
                      <div style={{ position: 'relative', marginTop: '0.4rem' }}>
                        <div
                          ref={(el) => { contentRefs.current[u.id] = el; }}
                          style={{
                            fontSize: '0.9rem',
                            color: C.dark,
                            lineHeight: 1.55,
                            maxHeight: expanded ? 'none' : '96px',
                            overflow: 'hidden',
                          }}
                          dangerouslySetInnerHTML={{ __html: u.konten }}
                        />
                        {!expanded && hasOverflow && (
                          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '30px', background: `linear-gradient(to bottom, rgba(255,255,255,0), ${C.white})`, pointerEvents: 'none' }} />
                        )}
                      </div>
                    )}
                    {hasOverflow && (
                      <button onClick={() => toggleExpand(u.id)} style={{ ...linkBtn, fontSize: '0.8rem', marginTop: '0.3rem' }}>
                        {expanded ? '▴ Show Less' : '▾ Show More'}
                      </button>
                    )}

                    {u.image_url && (
                      <div style={{ marginTop: '0.6rem' }}>
                        <img src={u.image_url} alt="Lampiran update" style={{ maxWidth: '100%', maxHeight: '360px', borderRadius: '10px', border: `1px solid ${C.border}`, display: 'block' }} />
                      </div>
                    )}

                    {u.link_url && (
                      <a href={u.link_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '0.6rem', padding: '7px 12px', background: C.cream, border: `1px solid ${C.border}`, borderRadius: '8px', fontSize: '0.82rem', color: C.gold, fontWeight: 600, textDecoration: 'none', wordBreak: 'break-all' }}>
                        🔗 {u.link_url}
                      </a>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '0.6rem' }}>
                      <span style={{ fontSize: '0.75rem', color: C.grayLight }}>{formatTanggalLengkap(u.created_at)}</span>
                      {u.dibuat_oleh === profileId && (
                        confirmHapusId === u.id ? (
                          <span style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', fontSize: '0.75rem' }}>
                            <span style={{ color: C.grayLight }}>Hapus?</span>
                            <button onClick={() => hapusUpdate(u.id)} disabled={deletingId === u.id} style={{ ...linkBtn, color: C.red, fontSize: '0.75rem' }}>
                              {deletingId === u.id ? '...' : 'Ya'}
                            </button>
                            <button onClick={() => setConfirmHapusId(null)} style={{ ...linkBtn, color: C.grayLight, fontSize: '0.75rem' }}>Batal</button>
                          </span>
                        ) : (
                          <button onClick={() => setConfirmHapusId(u.id)} style={{ ...linkBtn, color: C.grayLight, fontSize: '0.75rem' }}>· Hapus</button>
                        )
                      )}
                    </div>
                  </div>
                </div>

                {/* ─── BAGIAN KOMENTAR / BALASAN ─── */}
                <div style={{ marginTop: '1.2rem', paddingLeft: isMobile ? '36px' : '52px' }}>
                  {rootComments.length === 0 && replies.length === 0 && (
                    <p style={{ fontSize: '0.85rem', color: C.grayLight, margin: 0 }}>Belum ada komentar.</p>
                  )}

                  {/* Tampilkan komentar induk dan balasannya */}
                  {rootComments.map((root) => {
                    const childReplies = replies.filter(r => r.parent_comment_id === root.id);
                    const isReplying = replyTo[root.id] || false;
                    const isSubmitting = submittingReply[root.id] || false;

                    return (
                      <div key={root.id} style={{ marginBottom: '1rem' }}>
                        {/* Komentar induk */}
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                          <Avatar name={root.profiles?.full_name || 'Siswa'} size={isMobile ? 24 : 28} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 600, color: C.dark, fontSize: '0.8rem' }}>
                                {root.profiles?.full_name || 'Siswa'}
                              </span>
                              <span style={{ fontSize: '0.65rem', color: C.grayLight }}>
                                {formatTanggalLengkap(root.created_at)}
                              </span>
                              {root.profile_id === profileId && (
                                <button
                                  onClick={() => handleDeleteComment(root.id, u.id)}
                                  style={{ background: 'none', border: 'none', color: C.grayLight, fontSize: '0.7rem', cursor: 'pointer', padding: '0 4px', textDecoration: 'underline', fontFamily: 'inherit' }}
                                >
                                  Hapus
                                </button>
                              )}
                            </div>
                            <div style={{ fontSize: '0.85rem', color: C.dark, marginTop: '2px', wordBreak: 'break-word' }}>
                              {root.isi}
                            </div>
                            {/* Tombol Balas (untuk teacher) */}
                            <button
                              onClick={() => handleReplyToggle(root.id)}
                              style={{ ...linkBtn, fontSize: '0.75rem', marginTop: '4px' }}
                            >
                              {isReplying ? 'Batal' : 'Balas'}
                            </button>
                          </div>
                        </div>

                        {/* Form balasan untuk komentar ini */}
                        {isReplying && (
                          <div style={{ marginTop: '8px', marginLeft: isMobile ? '20px' : '36px' }}>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                              <Avatar name={guru?.nama} size={isMobile ? 24 : 28} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <textarea
                                  value={replyTexts[root.id] || ''}
                                  onChange={(e) => setReplyTexts(prev => ({ ...prev, [root.id]: e.target.value }))}
                                  placeholder="Tulis balasan..."
                                  rows={2}
                                  style={{
                                    ...inputStyle,
                                    resize: 'vertical',
                                    fontSize: '16px',
                                    padding: '8px 10px',
                                    width: '100%',
                                  }}
                                  disabled={isSubmitting}
                                />
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                                  <button
                                    onClick={() => handleReplySubmit(u.id, root.id)}
                                    disabled={isSubmitting || !(replyTexts[root.id] || '').trim()}
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
                                      opacity: isSubmitting || !(replyTexts[root.id] || '').trim() ? 0.5 : 1,
                                    }}
                                  >
                                    {isSubmitting ? 'Mengirim...' : 'Kirim Balasan'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Tampilkan balasan (child) dengan indentasi */}
                        {childReplies.length > 0 && (
                          <div style={{ marginLeft: isMobile ? '20px' : '36px', marginTop: '8px', borderLeft: `2px solid ${C.border}`, paddingLeft: isMobile ? '8px' : '12px' }}>
                            {childReplies.map((reply) => (
                              <div key={reply.id} style={{ display: 'flex', gap: '8px', padding: '4px 0', borderBottom: `1px solid ${C.border}` }}>
                                <Avatar name={reply.profiles?.full_name || 'Guru'} size={isMobile ? 20 : 24} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>
                                    <span style={{ fontWeight: 600, color: C.dark, fontSize: '0.75rem' }}>
                                      {reply.profiles?.full_name || 'Guru'}
                                    </span>
                                    {/* Tampilkan badge jika reply dari guru (profile_id == profileId) */}
                                    {reply.profile_id === profileId && <RoleBadge role="teacher" />}
                                    <span style={{ fontSize: '0.6rem', color: C.grayLight }}>
                                      {formatTanggalLengkap(reply.created_at)}
                                    </span>
                                    {reply.profile_id === profileId && (
                                      <button
                                        onClick={() => handleDeleteComment(reply.id, u.id)}
                                        style={{ background: 'none', border: 'none', color: C.grayLight, fontSize: '0.65rem', cursor: 'pointer', padding: '0 4px', textDecoration: 'underline', fontFamily: 'inherit' }}
                                      >
                                        Hapus
                                      </button>
                                    )}
                                  </div>
                                  <div style={{ fontSize: '0.8rem', color: C.dark, marginTop: '2px', wordBreak: 'break-word' }}>
                                    {reply.isi}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default TeacherUpdates;