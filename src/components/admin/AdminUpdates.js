// src/components/admin/AdminUpdates.js
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
        background: isAdmin ? C.goldBg : C.greenBg,
        padding: '2px 10px',
        borderRadius: '999px',
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
      minWidth: '30px',
      height: '30px',
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
const AdminUpdates = () => {
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState(null);
  const [adminName, setAdminName] = useState('Admin');
  const [updates, setUpdates] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');

  // ── State komentar ──
  const [comments, setComments] = useState({}); // { updateId: [komentar] }
  const [replyTo, setReplyTo] = useState({});   // { commentId: true } untuk toggle form balasan
  const [replyTexts, setReplyTexts] = useState({});
  const [submittingReply, setSubmittingReply] = useState({});

  // ── State composer update ──
  const [composerOpen, setComposerOpen] = useState(false);
  const [isEditorEmpty, setIsEditorEmpty] = useState(true);
  const [linkUrl, setLinkUrl] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef(null);
  const editorRef = useRef(null);

  // ── Edit modal state ──
  const [editingId, setEditingId] = useState(null);
  const [editKonten, setEditKonten] = useState('');
  const [editLink, setEditLink] = useState('');
  const [editImageFile, setEditImageFile] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState(null);
  const [editImageExisting, setEditImageExisting] = useState(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  // ── Delete update ──
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // ── Expand / overflow ──
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [overflowIds, setOverflowIds] = useState(new Set());
  const contentRefs = useRef({});

  // ── Load data ──
  const loadAll = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      const uid = userData?.user?.id;
      if (!uid) throw new Error('Tidak ada sesi login.');
      setProfileId(uid);

      // Ambil nama admin dari profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', uid)
        .single();
      if (!profileError && profile) setAdminName(profile.full_name || 'Admin');

      // Ambil semua updates
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
      setErrorMsg(err.message || 'Gagal memuat updates.');
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
        const path = `admin/${profileId}/${Date.now()}_${imageFile.name}`;
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
        nama_pembuat: adminName,
        role_pembuat: 'admin',
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
          const pesan = `Admin ${adminName} mempublikasikan update baru: "${cuplikan}"`;
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

  // ── Delete update ──
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
      setConfirmDeleteId(null);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Gagal menghapus update.');
    } finally {
      setDeletingId(null);
    }
  };

  // ── Edit update ──
  const openEditModal = (update) => {
    setEditingId(update.id);
    setEditKonten(update.konten || '');
    setEditLink(update.link_url || '');
    setEditImageExisting(update.image_url || null);
    setEditImagePreview(null);
    setEditImageFile(null);
    setErrorMsg('');
  };

  const closeEditModal = () => {
    setEditingId(null);
    setEditKonten('');
    setEditLink('');
    if (editImagePreview) URL.revokeObjectURL(editImagePreview);
    setEditImagePreview(null);
    setEditImageFile(null);
    setEditImageExisting(null);
    setErrorMsg('');
  };

  const handleEditImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMsg('File harus berupa gambar.');
      return;
    }
    if (editImagePreview) URL.revokeObjectURL(editImagePreview);
    setEditImageFile(file);
    setEditImagePreview(URL.createObjectURL(file));
    setErrorMsg('');
  };

  const removeEditImage = () => {
    if (editImagePreview) URL.revokeObjectURL(editImagePreview);
    setEditImageFile(null);
    setEditImagePreview(null);
    setEditImageExisting(null);
  };

  const saveEdit = async () => {
    const plainText = stripHtml(editKonten);
    if (!plainText && !editLink && !editImageFile && !editImageExisting) {
      setErrorMsg('Konten, link, atau gambar harus diisi.');
      return;
    }
    if (editLink && !isValidUrl(editLink)) {
      setErrorMsg('Link tidak valid.');
      return;
    }

    setEditSubmitting(true);
    setErrorMsg('');
    try {
      let imageUrl = editImageExisting;
      if (editImageFile) {
        const path = `admin-edit/${Date.now()}_${editImageFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from('updates')
          .upload(path, editImageFile);
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from('updates').getPublicUrl(path);
        imageUrl = publicUrlData?.publicUrl || null;
        if (editImageExisting) {
          try {
            const marker = '/object/public/updates/';
            const idx = editImageExisting.indexOf(marker);
            if (idx !== -1) {
              const oldPath = editImageExisting.slice(idx + marker.length);
              await supabase.storage.from('updates').remove([oldPath]);
            }
          } catch (cleanupErr) { /* ignore */ }
        }
      }

      const payload = {
        konten: plainText ? sanitizeHtml(editKonten) : null,
        link_url: editLink || null,
        image_url: imageUrl,
      };

      const { error } = await supabase
        .from('updates')
        .update(payload)
        .eq('id', editingId);
      if (error) throw error;

      closeEditModal();
      await loadAll();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Gagal menyimpan perubahan.');
    } finally {
      setEditSubmitting(false);
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
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: C.dark, margin: 0 }}>Updates</h1>
        <p style={{ fontSize: '0.85rem', color: C.grayLight, margin: '4px 0 0' }}>Kelola semua pengumuman dari guru & admin</p>
      </div>

      {errorMsg && (
        <div style={{ background: C.redBg, color: C.red, padding: '0.75rem 1rem', borderRadius: '10px', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          {errorMsg}
        </div>
      )}

      {/* ─── COMPOSER UPDATE ─── */}
      <div style={{ ...cardStyle, marginBottom: '1.5rem', padding: composerOpen ? '1.1rem' : '0.6rem 1.1rem' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: composerOpen ? 'flex-start' : 'center' }}>
          <Avatar name={adminName} />
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
                    style={{ minHeight: '90px', fontSize: '0.92rem', color: C.dark, lineHeight: 1.55, outline: 'none' }}
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

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem', marginTop: '1rem' }}>
                  <button onClick={handleBatal} style={buttonBatal}>Batal</button>
                  <button onClick={submitUpdate} disabled={submitting} style={{ ...buttonKirim, opacity: submitting ? 0.6 : 1 }}>
                    {submitting ? (uploadingImage ? 'Mengunggah gambar...' : 'Mempublikasikan...') : 'Publikasikan'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ─── FEED UPDATES + KOMENTAR ─── */}
      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 0.5rem 0', color: C.dark }}>Semua Aktivitas</h3>
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
              <div key={u.id} style={{ padding: '1.1rem 0', borderBottom: idx < updates.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                {/* ── Card Update ── */}
                <div style={{ display: 'flex', gap: '12px' }}>
                  <Avatar name={u.nama_pembuat} />
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

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '0.6rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.75rem', color: C.grayLight }}>{formatTanggalLengkap(u.created_at)}</span>

                      {confirmDeleteId === u.id ? (
                        <span style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', fontSize: '0.75rem' }}>
                          <span style={{ color: C.grayLight }}>Hapus?</span>
                          <button onClick={() => hapusUpdate(u.id)} disabled={deletingId === u.id} style={{ ...linkBtn, color: C.red, fontSize: '0.75rem' }}>
                            {deletingId === u.id ? '...' : 'Ya'}
                          </button>
                          <button onClick={() => setConfirmDeleteId(null)} style={{ ...linkBtn, color: C.grayLight, fontSize: '0.75rem' }}>Batal</button>
                        </span>
                      ) : (
                        <>
                          <button onClick={() => openEditModal(u)} style={{ ...linkBtn, fontSize: '0.75rem', color: C.gold }}>✎ Edit</button>
                          <button onClick={() => setConfirmDeleteId(u.id)} style={{ ...linkBtn, fontSize: '0.75rem', color: C.grayLight }}>· Hapus</button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* ─── BAGIAN KOMENTAR / BALASAN ─── */}
                <div style={{ marginTop: '1.2rem', paddingLeft: '52px' }}>
                  {rootComments.length === 0 && replies.length === 0 && (
                    <p style={{ fontSize: '0.85rem', color: C.grayLight, margin: 0 }}>Belum ada komentar.</p>
                  )}

                  {rootComments.map((root) => {
                    const childReplies = replies.filter(r => r.parent_comment_id === root.id);
                    const isReplying = replyTo[root.id] || false;
                    const isSubmitting = submittingReply[root.id] || false;

                    return (
                      <div key={root.id} style={{ marginBottom: '1rem' }}>
                        {/* ── Komentar induk ── */}
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                          <Avatar name={root.profiles?.full_name || 'Siswa'} size={28} />
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
                            {/* Tombol Balas (untuk admin) */}
                            <button
                              onClick={() => handleReplyToggle(root.id)}
                              style={{ ...linkBtn, fontSize: '0.75rem', marginTop: '4px' }}
                            >
                              {isReplying ? 'Batal' : 'Balas'}
                            </button>
                          </div>
                        </div>

                        {/* ── Form balasan ── */}
                        {isReplying && (
                          <div style={{ marginTop: '8px', marginLeft: '36px' }}>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                              <Avatar name={adminName} size={28} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <textarea
                                  value={replyTexts[root.id] || ''}
                                  onChange={(e) => setReplyTexts(prev => ({ ...prev, [root.id]: e.target.value }))}
                                  placeholder="Tulis balasan..."
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

                        {/* ── Tampilkan balasan dengan indentasi ── */}
                        {childReplies.length > 0 && (
                          <div style={{ marginLeft: '36px', marginTop: '8px', borderLeft: `2px solid ${C.border}`, paddingLeft: '12px' }}>
                            {childReplies.map((reply) => (
                              <div key={reply.id} style={{ display: 'flex', gap: '8px', padding: '4px 0', borderBottom: `1px solid ${C.border}` }}>
                                <Avatar name={reply.profiles?.full_name || 'Admin'} size={24} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>
                                    <span style={{ fontWeight: 600, color: C.dark, fontSize: '0.75rem' }}>
                                      {reply.profiles?.full_name || 'Admin'}
                                    </span>
                                    {/* Badge admin untuk balasan admin */}
                                    {reply.profile_id === profileId && <RoleBadge role="admin" />}
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

      {/* ─── MODAL EDIT ─── */}
      {editingId && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999,
          padding: '1rem',
        }}>
          <div style={{
            background: C.white,
            borderRadius: '16px',
            padding: '1.5rem',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
          }}>
            <h2 style={{ marginTop: 0, color: C.dark }}>Edit Update</h2>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '4px', fontSize: '0.85rem', color: C.gray }}>Konten</label>
              <div
                contentEditable
                suppressContentEditableWarning
                onInput={(e) => setEditKonten(e.currentTarget.innerHTML)}
                dangerouslySetInnerHTML={{ __html: editKonten }}
                style={{
                  minHeight: '80px',
                  border: `1px solid ${C.border}`,
                  borderRadius: '10px',
                  padding: '10px 12px',
                  fontSize: '0.9rem',
                  lineHeight: 1.55,
                  outline: 'none',
                  color: C.dark,
                }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '4px', fontSize: '0.85rem', color: C.gray }}>Link (opsional)</label>
              <input type="url" value={editLink} onChange={(e) => setEditLink(e.target.value)} placeholder="https://..." style={inputStyle} />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '4px', fontSize: '0.85rem', color: C.gray }}>Gambar</label>
              {(editImageExisting || editImagePreview) && (
                <div style={{ position: 'relative', display: 'inline-block', marginBottom: '0.5rem' }}>
                  <img src={editImagePreview || editImageExisting} alt="Preview" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', border: `1px solid ${C.border}` }} />
                  <button onClick={removeEditImage} style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer' }}>✕</button>
                </div>
              )}
              <input type="file" accept="image/*" onChange={handleEditImageChange} style={{ fontSize: '0.85rem' }} />
            </div>

            {errorMsg && <div style={{ color: C.red, fontSize: '0.85rem', marginBottom: '1rem' }}>{errorMsg}</div>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button onClick={closeEditModal} style={buttonBatal}>Batal</button>
              <button onClick={saveEdit} disabled={editSubmitting} style={{ ...buttonKirim, opacity: editSubmitting ? 0.6 : 1 }}>
                {editSubmitting ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUpdates;