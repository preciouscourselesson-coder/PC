import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';

// ─── Warna ───────────────────────────────────────────────────────────────────
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
const STORAGE_BUCKET = 'updates';

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

const ROLE_BADGE_LABELS = { admin: 'Admin', teacher: 'Guru' };
const RoleBadge = ({ role }) => {
  if (role !== 'admin' && role !== 'teacher') return null;
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
      {ROLE_BADGE_LABELS[role]}
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

const ToolbarButton = ({ onCommand, title, active, children }) => {
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= MOBILE_BREAKPOINT;
  const size = isMobile ? '40px' : '34px';
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onCommand(); }}
      style={{
        minWidth: size,
        height: size,
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
};

const ToolbarDivider = () => <div style={{ width: '1px', alignSelf: 'stretch', background: C.border, margin: '2px 4px' }} />;

// ─── Komponen Utama ──────────────────────────────────────────────────────────
// Satu komponen generik untuk admin, guru, dan siswa. Perilaku menyesuaikan
// otomatis berdasarkan role user yang sedang login (diambil dari tabel
// `profiles`). Guru & admin bisa mempublikasikan pengumuman; admin bisa
// mengedit/menghapus SEMUA update, guru hanya bisa menghapus update miliknya
// sendiri, siswa hanya bisa melihat & berkomentar. Semua role bisa menulis
// komentar, membalas (nested), dan menghapus komentar miliknya sendiri.
const Updates = () => {
  const isMobile = useIsMobile();

  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState(null);
  const [myRole, setMyRole] = useState(null); // 'admin' | 'teacher' | 'student'
  const [myName, setMyName] = useState('');
  const [updates, setUpdates] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');

  // ── Hak akses berdasarkan role ──────────────────────────────────────────
  const canPost = myRole === 'admin' || myRole === 'teacher';
  const canEditAnyUpdate = myRole === 'admin';
  const canDeleteUpdate = (u) => myRole === 'admin' || (myRole === 'teacher' && u.dibuat_oleh === profileId);
  const roleLabelForNotif = myRole === 'admin' ? 'Admin' : 'Guru';

  // ── State komentar (sama untuk semua role) ──────────────────────────────
  const [comments, setComments] = useState({}); // { updateId: [komentar] }
  const [commentTexts, setCommentTexts] = useState({}); // komentar akar baru, keyed by updateId
  const [submittingComment, setSubmittingComment] = useState({});
  const [replyTo, setReplyTo] = useState({}); // { commentId: true }
  const [replyTexts, setReplyTexts] = useState({});
  const [submittingReply, setSubmittingReply] = useState({});
  const commentRefs = useRef({});

  // ── State composer update (admin & guru) ────────────────────────────────
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

  // ── State edit update (khusus admin) ────────────────────────────────────
  const [editingId, setEditingId] = useState(null);
  const [editKonten, setEditKonten] = useState('');
  const [editLink, setEditLink] = useState('');
  const [editImageFile, setEditImageFile] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState(null);
  const [editImageExisting, setEditImageExisting] = useState(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  // ── State hapus update ───────────────────────────────────────────────────
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // ── Expand / overflow konten panjang ────────────────────────────────────
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [overflowIds, setOverflowIds] = useState(new Set());
  const contentRefs = useRef({});

  // ── Ambil data awal ──────────────────────────────────────────────────────
  const loadAll = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      const pid = userData?.user?.id;
      if (!pid) throw new Error('Tidak ada sesi login.');
      setProfileId(pid);

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', pid)
        .single();
      if (profileError) throw profileError;
      const role = profile?.role || 'student';
      setMyRole(role);

      let displayName = profile?.full_name || 'Pengguna';
      if (role === 'teacher') {
        const { data: guruData, error: guruError } = await supabase
          .from('guru')
          .select('nama')
          .eq('profile_id', pid)
          .single();
        if (!guruError && guruData?.nama) displayName = guruData.nama;
      }
      setMyName(displayName);

      // Ambil semua updates (terbaru di atas)
      const { data: updatesData, error: updatesError } = await supabase
        .from('updates')
        .select('*')
        .order('created_at', { ascending: false });
      if (updatesError) throw updatesError;
      setUpdates(updatesData || []);

      // Ambil semua komentar (termasuk parent_comment_id + role penulis)
      if (updatesData && updatesData.length > 0) {
        const updateIds = updatesData.map(u => u.id);
        const { data: commentsData, error: commentsError } = await supabase
          .from('komentar_updates')
          .select('*, profiles!profile_id(full_name, role)')
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Efek preview gambar composer ────────────────────────────────────────
  useEffect(() => () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
  }, [imagePreview]);

  useEffect(() => {
    if (composerOpen && editorRef.current) {
      editorRef.current.focus();
    }
  }, [composerOpen]);

  useLayoutEffect(() => {
    const recalcOverflow = () => {
      const ids = new Set();
      updates.forEach(u => {
        const el = contentRefs.current[u.id];
        if (el && el.scrollHeight > el.clientHeight + 2) {
          ids.add(u.id);
        }
      });
      setOverflowIds(ids);
    };

    recalcOverflow();

    // Ukur ulang setelah gambar di dalam konten (jika ada) selesai dimuat,
    // karena tinggi gambar yang belum load bisa membuat deteksi overflow salah.
    const imgs = Object.values(contentRefs.current)
      .filter(Boolean)
      .flatMap(el => Array.from(el.querySelectorAll('img')));
    imgs.forEach(img => {
      if (!img.complete) img.addEventListener('load', recalcOverflow);
    });

    // Ukur ulang jika font web baru selesai dimuat (bisa mengubah line-wrap).
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(recalcOverflow);
    }

    // Ukur ulang saat ukuran layar berubah (lebar container ikut berubah).
    window.addEventListener('resize', recalcOverflow);

    return () => {
      imgs.forEach(img => img.removeEventListener('load', recalcOverflow));
      window.removeEventListener('resize', recalcOverflow);
    };
  }, [updates, isMobile]);

  const toggleExpand = (id) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── Composer update ──────────────────────────────────────────────────────
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
    if (!canPost) return;
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
        const path = `${myRole}/${profileId}/${Date.now()}_${imageFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(path, imageFile);
        setUploadingImage(false);
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
        imageUrl = publicUrlData?.publicUrl || null;
      }

      const payload = {
        dibuat_oleh: profileId,
        nama_pembuat: myName,
        role_pembuat: myRole,
        konten: plainText ? sanitizeHtml(html) : null,
        link_url: linkTrim || null,
        image_url: imageUrl,
      };
      const { error } = await supabase.from('updates').insert(payload);
      if (error) throw error;

      // Notifikasi ke siswa (best-effort, tidak menggagalkan publish kalau error)
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
          const pesan = `${roleLabelForNotif} ${myName} mempublikasikan update baru: "${cuplikan}"`;
          const rows = siswaProfiles.map(s => ({ user_id: s.id, pesan, link: null }));
          await supabase.from('notifikasi').insert(rows);
        }
      } catch (notifErr) { /* ignore */ }

      handleBatal();
      await loadAll();
      window.dispatchEvent(new Event('notif-updated')); // 🔔 trigger badge di topbar
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Gagal mempublikasikan update.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Hapus update ─────────────────────────────────────────────────────────
  const hapusUpdate = async (id) => {
    const target = updates.find(u => u.id === id);
    if (!target || !canDeleteUpdate(target)) return;

    setDeletingId(id);
    setErrorMsg('');
    try {
      const { error } = await supabase.from('updates').delete().eq('id', id);
      if (error) throw error;

      if (target?.image_url) {
        try {
          const marker = `/object/public/${STORAGE_BUCKET}/`;
          const idx = target.image_url.indexOf(marker);
          if (idx !== -1) {
            const filePath = target.image_url.slice(idx + marker.length);
            await supabase.storage.from(STORAGE_BUCKET).remove([filePath]);
          }
        } catch (cleanupErr) { /* ignore */ }
      }

      setUpdates(list => list.filter(u => u.id !== id));
      setConfirmDeleteId(null);
      window.dispatchEvent(new Event('notif-updated')); // 🔔 trigger badge di topbar
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Gagal menghapus update.');
    } finally {
      setDeletingId(null);
    }
  };

  // ── Edit update (khusus admin) ──────────────────────────────────────────
  const openEditModal = (update) => {
    if (!canEditAnyUpdate) return;
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
        const path = `${myRole}-edit/${Date.now()}_${editImageFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(path, editImageFile);
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
        imageUrl = publicUrlData?.publicUrl || null;
        if (editImageExisting) {
          try {
            const marker = `/object/public/${STORAGE_BUCKET}/`;
            const idx = editImageExisting.indexOf(marker);
            if (idx !== -1) {
              const oldPath = editImageExisting.slice(idx + marker.length);
              await supabase.storage.from(STORAGE_BUCKET).remove([oldPath]);
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
      window.dispatchEvent(new Event('notif-updated')); // 🔔 trigger badge di topbar
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Gagal menyimpan perubahan.');
    } finally {
      setEditSubmitting(false);
    }
  };

  // ── Komentar akar (semua role bisa menulis) ─────────────────────────────
  const handleCommentSubmit = async (updateId) => {
    const text = (commentTexts[updateId] || '').trim();
    if (!text) {
      setErrorMsg('Komentar tidak boleh kosong.');
      return;
    }

    setSubmittingComment(prev => ({ ...prev, [updateId]: true }));
    setErrorMsg('');
    try {
      const { data, error } = await supabase
        .from('komentar_updates')
        .insert({
          update_id: updateId,
          profile_id: profileId,
          isi: text,
          parent_comment_id: null,
        })
        .select('*, profiles!profile_id(full_name, role)');
      if (error) throw error;

      const inserted = data && data[0] ? data[0] : null;
      if (inserted) {
        setComments(prev => ({
          ...prev,
          [updateId]: [...(prev[updateId] || []), inserted],
        }));
      }

      setCommentTexts(prev => ({ ...prev, [updateId]: '' }));
      setTimeout(() => {
        const ref = commentRefs.current[updateId];
        if (ref) ref.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Gagal mengirim komentar.');
    } finally {
      setSubmittingComment(prev => ({ ...prev, [updateId]: false }));
    }
  };

  // ── Balasan bertingkat (semua role bisa membalas) ───────────────────────
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
          parent_comment_id: parentCommentId,
        })
        .select('*, profiles!profile_id(full_name, role)');
      if (error) throw error;

      const inserted = data && data[0] ? data[0] : null;
      if (inserted) {
        setComments(prev => ({
          ...prev,
          [updateId]: [...(prev[updateId] || []), inserted],
        }));
      }

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

  // ── Hapus komentar (hanya milik sendiri) ────────────────────────────────
  const handleDeleteComment = async (commentId, updateId) => {
    if (!window.confirm('Hapus komentar ini?')) return;
    try {
      const { error } = await supabase
        .from('komentar_updates')
        .delete()
        .eq('id', commentId)
        .eq('profile_id', profileId); // RLS juga membatasi di sisi server
      if (error) throw error;
      setComments(prev => ({
        ...prev,
        [updateId]: (prev[updateId] || []).filter(c => c.id !== commentId),
      }));
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Gagal menghapus komentar.');
    }
  };

  // ── RENDER ────────────────────────────────────────────────────────────────
  const subtitle = myRole === 'student'
    ? 'Lihat pengumuman dari guru & admin, dan beri komentar'
    : myRole === 'admin'
      ? 'Kelola semua pengumuman dari guru & admin'
      : 'Publikasikan pengumuman untuk siswa';

  return (
    <div style={{ maxWidth: '760px', margin: '0 auto', padding: isMobile ? '0 0.75rem' : '0', boxSizing: 'border-box', fontFamily: 'inherit' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: isMobile ? '1.35rem' : '1.6rem', fontWeight: 700, color: C.dark, margin: 0 }}>Updates</h1>
        <p style={{ fontSize: '0.85rem', color: C.grayLight, margin: '4px 0 0' }}>{subtitle}</p>
      </div>

      {errorMsg && (
        <div style={{ background: C.redBg, color: C.red, padding: '0.75rem 1rem', borderRadius: '10px', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          {errorMsg}
        </div>
      )}

      {/* ─── COMPOSER UPDATE (hanya guru & admin) ─── */}
      {canPost && (
        <div style={{ ...cardStyle, marginBottom: '1.5rem', padding: isMobile ? (composerOpen ? '0.9rem' : '0.5rem 0.8rem') : (composerOpen ? '1.1rem' : '0.6rem 1.1rem') }}>
          <div style={{ display: 'flex', gap: isMobile ? '8px' : '12px', alignItems: composerOpen ? 'flex-start' : 'center' }}>
            <Avatar name={myName} size={isMobile ? 32 : 40} />
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '4px' : '2px', marginBottom: '0.6rem', paddingBottom: '0.6rem', borderBottom: `1px solid ${C.border}`, flexWrap: 'wrap' }}>
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
      )}

      {/* ─── FEED UPDATES + KOMENTAR ─── */}
      <div style={{ ...cardStyle, padding: isMobile ? '1rem' : '1.5rem' }}>
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
            const isSubmittingComment = submittingComment[u.id] || false;

            // Kelompokkan komentar: induk (parent null) dan balasan
            const rootComments = komentarList.filter(c => c.parent_comment_id === null);
            const replies = komentarList.filter(c => c.parent_comment_id !== null);

            return (
              <div key={u.id} style={{ padding: isMobile ? '0.9rem 0' : '1.1rem 0', borderBottom: idx < updates.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                {/* ── Card Update ── */}
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
                        {expanded ? '▴ Sembunyikan' : '▾ Lihat Semua'}
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
                          {canEditAnyUpdate && (
                            <button onClick={() => openEditModal(u)} style={{ ...linkBtn, fontSize: '0.75rem', color: C.gold, padding: '4px 2px' }}>✎ Edit</button>
                          )}
                          {canDeleteUpdate(u) && (
                            <button onClick={() => setConfirmDeleteId(u.id)} style={{ ...linkBtn, fontSize: '0.75rem', color: C.grayLight, padding: '4px 2px' }}>· Hapus</button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* ─── BAGIAN KOMENTAR / BALASAN ─── */}
                <div style={{ marginTop: '1.2rem', paddingLeft: isMobile ? '36px' : '52px' }}>
                  {/* Form komentar akar */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <Avatar name={myName} size={isMobile ? 24 : 28} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <textarea
                        value={commentTexts[u.id] || ''}
                        onChange={(e) => setCommentTexts(prev => ({ ...prev, [u.id]: e.target.value }))}
                        placeholder="Tulis komentar..."
                        rows={2}
                        style={{
                          ...inputStyle,
                          resize: 'vertical',
                          fontSize: isMobile ? '16px' : '0.85rem',
                          padding: '8px 10px',
                          width: '100%',
                        }}
                        disabled={isSubmittingComment}
                      />
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                        <button
                          onClick={() => handleCommentSubmit(u.id)}
                          disabled={isSubmittingComment || !(commentTexts[u.id] || '').trim()}
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
                            opacity: isSubmittingComment || !(commentTexts[u.id] || '').trim() ? 0.5 : 1,
                          }}
                        >
                          {isSubmittingComment ? 'Mengirim...' : 'Kirim'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {rootComments.length === 0 && replies.length === 0 ? (
                    <p style={{ fontSize: '0.85rem', color: C.grayLight, margin: '0.8rem 0 0' }}>Belum ada komentar.</p>
                  ) : (
                    <div style={{ marginTop: '0.8rem' }}>
                      {rootComments.map((root, rIdx) => {
                        const childReplies = replies.filter(r => r.parent_comment_id === root.id);
                        const isReplying = replyTo[root.id] || false;
                        const isSubmittingReply = submittingReply[root.id] || false;
                        const rootIsLast = rIdx === rootComments.length - 1 && childReplies.length === 0;

                        return (
                          <div
                            key={root.id}
                            ref={rootIsLast ? (el) => { commentRefs.current[u.id] = el; } : undefined}
                            style={{ marginBottom: '1rem' }}
                          >
                            {/* ── Komentar induk ── */}
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                              <Avatar name={root.profiles?.full_name || 'Pengguna'} size={isMobile ? 24 : 28} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>
                                  <span style={{ fontWeight: 600, color: C.dark, fontSize: '0.8rem' }}>
                                    {root.profiles?.full_name || 'Pengguna'}
                                  </span>
                                  <RoleBadge role={root.profiles?.role} />
                                  <span style={{ fontSize: '0.65rem', color: C.grayLight }}>
                                    {formatTanggalLengkap(root.created_at)}
                                  </span>
                                  {root.profile_id === profileId && (
                                    <button
                                      onClick={() => handleDeleteComment(root.id, u.id)}
                                      style={{ background: 'none', border: 'none', color: C.grayLight, fontSize: '0.7rem', cursor: 'pointer', padding: '4px', textDecoration: 'underline', fontFamily: 'inherit' }}
                                    >
                                      Hapus
                                    </button>
                                  )}
                                </div>
                                <div style={{ fontSize: '0.85rem', color: C.dark, marginTop: '2px', wordBreak: 'break-word' }}>
                                  {root.isi}
                                </div>
                                <button
                                  onClick={() => handleReplyToggle(root.id)}
                                  style={{ ...linkBtn, fontSize: '0.75rem', marginTop: '4px', padding: '4px 2px' }}
                                >
                                  {isReplying ? 'Batal' : 'Balas'}
                                </button>
                              </div>
                            </div>

                            {/* ── Form balasan ── */}
                            {isReplying && (
                              <div style={{ marginTop: '8px', marginLeft: isMobile ? '20px' : '36px' }}>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                  <Avatar name={myName} size={isMobile ? 24 : 28} />
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <textarea
                                      value={replyTexts[root.id] || ''}
                                      onChange={(e) => setReplyTexts(prev => ({ ...prev, [root.id]: e.target.value }))}
                                      placeholder="Tulis balasan..."
                                      rows={2}
                                      style={{
                                        ...inputStyle,
                                        resize: 'vertical',
                                        fontSize: isMobile ? '16px' : '0.85rem',
                                        padding: '8px 10px',
                                        width: '100%',
                                      }}
                                      disabled={isSubmittingReply}
                                    />
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                                      <button
                                        onClick={() => handleReplySubmit(u.id, root.id)}
                                        disabled={isSubmittingReply || !(replyTexts[root.id] || '').trim()}
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
                                          opacity: isSubmittingReply || !(replyTexts[root.id] || '').trim() ? 0.5 : 1,
                                        }}
                                      >
                                        {isSubmittingReply ? 'Mengirim...' : 'Kirim Balasan'}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* ── Balasan dengan indentasi ── */}
                            {childReplies.length > 0 && (
                              <div style={{ marginLeft: isMobile ? '20px' : '36px', marginTop: '8px', borderLeft: `2px solid ${C.border}`, paddingLeft: isMobile ? '8px' : '12px' }}>
                                {childReplies.map((reply, repIdx) => {
                                  const replyIsLast = rIdx === rootComments.length - 1 && repIdx === childReplies.length - 1;
                                  return (
                                    <div
                                      key={reply.id}
                                      ref={replyIsLast ? (el) => { commentRefs.current[u.id] = el; } : undefined}
                                      style={{ display: 'flex', gap: '8px', padding: '4px 0', borderBottom: `1px solid ${C.border}` }}
                                    >
                                      <Avatar name={reply.profiles?.full_name || 'Pengguna'} size={isMobile ? 20 : 24} />
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>
                                          <span style={{ fontWeight: 600, color: C.dark, fontSize: '0.75rem' }}>
                                            {reply.profiles?.full_name || 'Pengguna'}
                                          </span>
                                          <RoleBadge role={reply.profiles?.role} />
                                          <span style={{ fontSize: '0.6rem', color: C.grayLight }}>
                                            {formatTanggalLengkap(reply.created_at)}
                                          </span>
                                          {reply.profile_id === profileId && (
                                            <button
                                              onClick={() => handleDeleteComment(reply.id, u.id)}
                                              style={{ background: 'none', border: 'none', color: C.grayLight, fontSize: '0.65rem', cursor: 'pointer', padding: '4px', textDecoration: 'underline', fontFamily: 'inherit' }}
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
                                  );
                                })}
                              </div>
                            )}
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

      {/* ─── MODAL EDIT (khusus admin) ─── */}
      {editingId && canEditAnyUpdate && (
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

export default Updates;