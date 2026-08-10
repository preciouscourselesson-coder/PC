import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Toast, { useToast } from './Toast';
import { C } from './Theme';

const MOBILE_BREAKPOINT = 768;

// ─── Lampiran file ───────────────────────────────────────────────────────────
// Nama bucket Supabase Storage tempat file lampiran chat disimpan.
// Pastikan bucket ini sudah dibuat (public) di project Supabase.
const ATTACHMENT_BUCKET = 'chat-attachments';
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024; // 10MB

const ROLE_LABELS = {
  student: 'Siswa',
  teacher: 'Guru',
  admin: 'Admin',
};

const isImageType = (type) => !!type && type.startsWith('image/');

const formatFileSize = (bytes) => {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Ikon sederhana berbasis ekstensi file (tanpa dependency tambahan)
const fileIconFor = (name = '') => {
  const ext = name.split('.').pop().toLowerCase();
  if (['pdf'].includes(ext)) return '📄';
  if (['doc', 'docx'].includes(ext)) return '📝';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return '📊';
  if (['ppt', 'pptx'].includes(ext)) return '📽️';
  if (['zip', 'rar', '7z'].includes(ext)) return '🗜️';
  if (['mp4', 'mov', 'avi', 'webm'].includes(ext)) return '🎬';
  if (['mp3', 'wav', 'ogg'].includes(ext)) return '🎵';
  return '📎';
};

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

// Selalu urutkan pasangan id secara konsisten (string compare),
// supaya 1 pasangan pengguna cuma pernah punya 1 baris conversations
// tidak peduli siapa yang mulai duluan.
const buildPair = (a, b) => (a < b ? [a, b] : [b, a]);

const formatClock = (ts) => {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
};

const initialsOf = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?';
};

const Avatar = ({ name, size = 42 }) => (
  <div
    style={{
      width: size,
      height: size,
      minWidth: size,
      borderRadius: '50%',
      background: C.goldBg,
      color: C.gold,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 'bold',
      fontSize: size * 0.38,
    }}
  >
    {initialsOf(name)}
  </div>
);

const RoleTag = ({ role }) => (
  <span
    style={{
      fontSize: '0.68rem',
      color: C.gold,
      background: C.goldBg,
      borderRadius: '8px',
      padding: '1px 7px',
      fontWeight: 'bold',
      whiteSpace: 'nowrap',
    }}
  >
    {ROLE_LABELS[role] || 'Pengguna'}
  </span>
);

// ─── Komponen Utama ──────────────────────────────────────────────────────────
const ChatMessages = () => {
  const isMobile = useIsMobile();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState(null); // { id, full_name, email, role }
  const { toast, showToast } = useToast();

  const [sidebarTab, setSidebarTab] = useState('chats'); // 'chats' | 'contacts'
  const [conversations, setConversations] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [contactSearch, setContactSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('semua');

  const [activeConversation, setActiveConversation] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);

  // ─── Lampiran file yang sedang dipilih (belum terkirim) ────────────────
  const [selectedFile, setSelectedFile] = useState(null); // File object
  const [filePreviewUrl, setFilePreviewUrl] = useState(null); // object URL untuk preview gambar
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef(null);

  // ─── Hapus pesan ─────────────────────────────────────────────────────────
  const [hoveredMsgId, setHoveredMsgId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Di mobile: apakah sedang menampilkan panel chat (true) atau daftar (false)
  const [showThreadMobile, setShowThreadMobile] = useState(false);

  const messagesEndRef = useRef(null);
  const composerRef = useRef(null);

  // ── Auto-resize kotak ketik pesan (maksimal ~5 baris) agar nyaman untuk pesan panjang ──
  useEffect(() => {
    const el = composerRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [messageText]);

  // ─── Ambil identitas sendiri ───────────────────────────────────────────
  const fetchMe = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .eq('id', user.id)
      .single();
    if (error) console.error('Gagal memuat profil:', error);
    const meObj = {
      id: user.id,
      full_name: profile?.full_name || 'Saya',
      email: profile?.email || '',
      role: profile?.role || null,
    };
    setMe(meObj);
    return meObj;
  };

  // ─── Ambil daftar percakapan + peserta lawan bicara + jumlah belum dibaca ─
  const fetchConversations = useCallback(async (uid) => {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .or(`participant_one.eq.${uid},participant_two.eq.${uid}`);
    if (error) {
      console.error('Gagal memuat percakapan:', error);
      return;
    }

    const rows = data || [];
    const otherIds = [...new Set(rows.map((c) => (c.participant_one === uid ? c.participant_two : c.participant_one)))];

    let profileMap = new Map();
    if (otherIds.length > 0) {
      const { data: profs, error: profErr } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .in('id', otherIds);
      if (profErr) console.error('Gagal memuat profil lawan bicara:', profErr);
      profileMap = new Map((profs || []).map((p) => [p.id, p]));
    }

    let unreadMap = new Map();
    const convIds = rows.map((c) => c.id);
    if (convIds.length > 0) {
      const { data: unread, error: unreadErr } = await supabase
        .from('messages')
        .select('conversation_id')
        .in('conversation_id', convIds)
        .eq('is_read', false)
        .neq('sender_id', uid);
      if (unreadErr) console.error('Gagal memuat jumlah pesan belum dibaca:', unreadErr);
      (unread || []).forEach((m) => unreadMap.set(m.conversation_id, (unreadMap.get(m.conversation_id) || 0) + 1));
    }

    const enriched = rows
      .map((c) => {
        const otherId = c.participant_one === uid ? c.participant_two : c.participant_one;
        return {
          ...c,
          other: profileMap.get(otherId) || { id: otherId, full_name: 'Pengguna', role: null },
          unreadCount: unreadMap.get(c.id) || 0,
        };
      })
      .sort((a, b) => new Date(b.last_message_at || b.created_at) - new Date(a.last_message_at || a.created_at));

    setConversations(enriched);
  }, []);

  // ─── Ambil semua kontak (kecuali diri sendiri) ─────────────────────────
  const fetchContacts = useCallback(async (uid) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .neq('id', uid)
      .order('full_name', { ascending: true });
    if (error) {
      console.error('Gagal memuat daftar kontak:', error);
      return;
    }
    setContacts(data || []);
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const meObj = await fetchMe();
      if (meObj) {
        await fetchConversations(meObj.id);
        await fetchContacts(meObj.id);
      }
      setLoading(false);
    };
    init();
  }, [fetchConversations, fetchContacts]);

  // ─── Buka & muat pesan sebuah percakapan ───────────────────────────────
  const loadMessages = async (conversationId, uid) => {
    setLoadingThread(true);
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    setLoadingThread(false);
    if (error) {
      console.error('Gagal memuat pesan:', error);
      return;
    }
    setChatMessages(data || []);

    const unreadIds = (data || []).filter((m) => !m.is_read && m.sender_id !== uid).map((m) => m.id);
    if (unreadIds.length > 0) {
      const { error: readErr } = await supabase.from('messages').update({ is_read: true }).in('id', unreadIds);
      if (readErr) console.error('Gagal menandai pesan terbaca:', readErr);
      setConversations((prev) => prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c)));
    }
  };

  const openConversation = async (conv) => {
    setActiveConversation(conv);
    setShowThreadMobile(true);
    await loadMessages(conv.id, me.id);
  };

  // ─── Mulai percakapan baru dengan kontak yang dipilih ──────────────────
  const startConversation = async (contact) => {
    if (!me) return;
    const existing = conversations.find((c) => c.other.id === contact.id);
    if (existing) {
      await openConversation(existing);
      setSidebarTab('chats');
      return;
    }

    const [p1, p2] = buildPair(me.id, contact.id);
    const { data: found, error: findErr } = await supabase
      .from('conversations')
      .select('*')
      .eq('participant_one', p1)
      .eq('participant_two', p2)
      .maybeSingle();
    if (findErr) {
      console.error('Gagal mengecek percakapan:', findErr);
      return;
    }

    let convRow = found;
    if (!convRow) {
      const { data: created, error: createErr } = await supabase
        .from('conversations')
        .insert([{ participant_one: p1, participant_two: p2 }])
        .select()
        .single();
      if (createErr) {
        console.error('Gagal membuat percakapan:', createErr);
        showToast('error', 'Gagal memulai percakapan.');
        return;
      }
      convRow = created;
    }

    const enrichedConv = { ...convRow, other: contact, unreadCount: 0 };
    setConversations((prev) => (prev.find((c) => c.id === enrichedConv.id) ? prev : [enrichedConv, ...prev]));
    setSidebarTab('chats');
    await openConversation(enrichedConv);
  };

  // ─── Pilih file lampiran dari input ─────────────────────────────────────
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // supaya bisa pilih file yang sama lagi setelah dihapus
    if (!file) return;
    if (file.size > MAX_ATTACHMENT_SIZE) {
      showToast('warning', `Ukuran file maksimal ${formatFileSize(MAX_ATTACHMENT_SIZE)}.`);
      return;
    }
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    setSelectedFile(file);
    setFilePreviewUrl(isImageType(file.type) ? URL.createObjectURL(file) : null);
  };

  const removeSelectedFile = () => {
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    setSelectedFile(null);
    setFilePreviewUrl(null);
  };

  // ─── Unggah file ke Supabase Storage, kembalikan metadata lampiran ─────
  const uploadAttachment = async (file, conversationId) => {
    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const path = `${conversationId}/${Date.now()}-${safeName}`;
    const { error: uploadErr } = await supabase.storage
      .from(ATTACHMENT_BUCKET)
      .upload(path, file, { cacheControl: '3600', upsert: false });
    if (uploadErr) throw uploadErr;
    const { data: publicData } = supabase.storage.from(ATTACHMENT_BUCKET).getPublicUrl(path);
    return {
      attachment_url: publicData.publicUrl,
      attachment_name: file.name,
      attachment_type: file.type || 'application/octet-stream',
      attachment_size: file.size,
    };
  };

  // ─── Kirim pesan ────────────────────────────────────────────────────────
  const sendMessage = async () => {
    const trimmed = messageText.trim();
    if ((!trimmed && !selectedFile) || !activeConversation || !me || sending || uploadingFile) return;

    let attachmentFields = {};
    if (selectedFile) {
      setUploadingFile(true);
      try {
        attachmentFields = await uploadAttachment(selectedFile, activeConversation.id);
      } catch (uploadErr) {
        console.error('Gagal mengunggah lampiran:', uploadErr);
        setUploadingFile(false);
        showToast('error', 'Gagal mengunggah lampiran.');
        return;
      }
      setUploadingFile(false);
    }

    const content = trimmed;
    setSending(true);
    const { data, error } = await supabase
      .from('messages')
      .insert([{
        conversation_id: activeConversation.id,
        sender_id: me.id,
        content,
        is_read: false,
        ...attachmentFields,
      }])
      .select()
      .single();
    setSending(false);
    if (error) {
      console.error('Gagal mengirim pesan:', error);
      showToast('error', 'Gagal mengirim pesan.');
      return;
    }
    setChatMessages((prev) => [...prev, data]);
    setMessageText('');
    removeSelectedFile();

    const lastMessagePreview = content || (attachmentFields.attachment_url
      ? `📎 ${isImageType(attachmentFields.attachment_type) ? 'Gambar' : attachmentFields.attachment_name}`
      : content);

    const nowIso = new Date().toISOString();
    const { error: updErr } = await supabase
      .from('conversations')
      .update({ last_message: lastMessagePreview, last_message_at: nowIso })
      .eq('id', activeConversation.id);
    if (updErr) console.error('Gagal memperbarui ringkasan percakapan:', updErr);

    setConversations((prev) =>
      prev
        .map((c) => (c.id === activeConversation.id ? { ...c, last_message: lastMessagePreview, last_message_at: nowIso } : c))
        .sort((a, b) => new Date(b.last_message_at || b.created_at) - new Date(a.last_message_at || a.created_at))
    );
  };

  const handleComposerKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ─── Hapus pesan untuk semua ────────────────────────────────────────────
  // Pesan tidak dihapus fisik dari DB, tapi ditandai is_deleted supaya
  // kedua sisi (pengirim & penerima) melihat "Pesan ini telah dihapus".
  const canDeleteMessage = (m) => !!me && !m.is_deleted && (m.sender_id === me.id || me.role === 'admin');

  const deleteMessage = async (m) => {
    if (!canDeleteMessage(m) || deletingId) return;
    const ok = window.confirm('Hapus pesan ini untuk semua orang?');
    if (!ok) return;

    setDeletingId(m.id);

    // Hapus file lampiran dari storage juga, kalau ada (best-effort).
    if (m.attachment_url) {
      try {
        const marker = `/${ATTACHMENT_BUCKET}/`;
        const idx = m.attachment_url.indexOf(marker);
        if (idx !== -1) {
          const storagePath = decodeURIComponent(m.attachment_url.slice(idx + marker.length));
          await supabase.storage.from(ATTACHMENT_BUCKET).remove([storagePath]);
        }
      } catch (storageErr) {
        console.error('Gagal menghapus file lampiran:', storageErr);
      }
    }

    const { error } = await supabase
      .from('messages')
      .update({
        is_deleted: true,
        content: '',
        attachment_url: null,
        attachment_name: null,
        attachment_type: null,
        attachment_size: null,
      })
      .eq('id', m.id);

    setDeletingId(null);

    if (error) {
      console.error('Gagal menghapus pesan:', error);
      showToast('error', 'Gagal menghapus pesan.');
      return;
    }

    setChatMessages((prev) =>
      prev.map((msg) => (msg.id === m.id
        ? { ...msg, is_deleted: true, content: '', attachment_url: null, attachment_name: null, attachment_type: null, attachment_size: null }
        : msg))
    );

    // Kalau pesan yang dihapus adalah pesan terakhir, perbarui juga
    // ringkasan percakapan di sidebar supaya konsisten.
    setConversations((prev) => {
      const isLatestInThread = chatMessages.length > 0 && chatMessages[chatMessages.length - 1].id === m.id;
      if (!isLatestInThread || !activeConversation) return prev;
      const newPreview = 'Pesan telah dihapus';
      supabase.from('conversations').update({ last_message: newPreview }).eq('id', activeConversation.id).then(() => {});
      return prev.map((c) => (c.id === activeConversation.id ? { ...c, last_message: newPreview } : c));
    });
  };

  // ─── Deep-link: buka otomatis percakapan dari ?contactId=... ──────────
  // (dipakai mis. tombol "Kirim Pesan" di daftar siswa guru, atau tombol
  // "Hubungi Guru" di halaman siswa, yang mengarahkan ke sini.)
  useEffect(() => {
    if (loading) return;
    const params = new URLSearchParams(location.search);
    const contactId = params.get('contactId');
    if (!contactId) return;
    const target = contacts.find((c) => c.id === contactId);
    if (target) {
      startConversation(target);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, contacts, loading]);

  // ─── Realtime: pesan baru masuk di percakapan yang sedang dibuka ───────
  useEffect(() => {
    if (!activeConversation || !me) return;
    const channel = supabase
      .channel(`messages-${activeConversation.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeConversation.id}` },
        (payload) => {
          const newMsg = payload.new;
          if (newMsg.sender_id === me.id) return; // sudah ditambahkan optimis di sendMessage
          setChatMessages((prev) => (prev.find((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]));
          supabase.from('messages').update({ is_read: true }).eq('id', newMsg.id).then(() => {});
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeConversation.id}` },
        (payload) => {
          const updated = payload.new;
          setChatMessages((prev) => prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConversation, me]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const filteredContacts = contacts.filter((c) => {
    const matchesRole = roleFilter === 'semua' || c.role === roleFilter;
    const matchesSearch = !contactSearch.trim() || (c.full_name || '').toLowerCase().includes(contactSearch.toLowerCase());
    return matchesRole && matchesSearch;
  });

  // ─── Sub-render: daftar percakapan ──────────────────────────────────────
  const renderConversationList = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      {conversations.length === 0 ? (
        <div style={{ padding: '2rem 1rem', textAlign: 'center', color: C.grayLight, fontSize: '0.88rem' }}>
          Belum ada percakapan. Pilih kontak untuk mulai chat.
        </div>
      ) : (
        conversations.map((c) => (
          <div
            key={c.id}
            onClick={() => openConversation(c)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 14px',
              cursor: 'pointer',
              background: activeConversation?.id === c.id ? C.goldBg : 'transparent',
              borderBottom: `1px solid ${C.border}`,
            }}
          >
            <Avatar name={c.other.full_name} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontWeight: '700', color: C.dark, fontSize: '0.92rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.other.full_name}
                </span>
                <span style={{ fontSize: '0.72rem', color: C.grayLight, whiteSpace: 'nowrap' }}>
                  {formatClock(c.last_message_at || c.created_at)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                <span style={{ fontSize: '0.8rem', color: C.gray, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.last_message || 'Belum ada pesan'}
                </span>
                {c.unreadCount > 0 && (
                  <span
                    style={{
                      background: C.gold, color: 'white', borderRadius: '999px', fontSize: '0.68rem',
                      fontWeight: 'bold', minWidth: '18px', height: '18px', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', padding: '0 5px',
                    }}
                  >
                    {c.unreadCount}
                  </span>
                )}
              </div>
              <div style={{ marginTop: '2px' }}>
                <RoleTag role={c.other.role} />
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  // ─── Sub-render: pencarian kontak ───────────────────────────────────────
  const renderContactPicker = () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '12px 14px', borderBottom: `1px solid ${C.border}` }}>
        <input
          type="text"
          value={contactSearch}
          onChange={(e) => setContactSearch(e.target.value)}
          placeholder="Cari nama..."
          style={{
            width: '100%', padding: '8px 12px', borderRadius: '10px', border: `1.5px solid ${C.border}`,
            fontSize: '16px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
          }}
        />
        <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
          {['semua', 'student', 'teacher', 'admin'].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              style={{
                padding: '5px 12px', borderRadius: '40px', fontSize: '0.78rem',
                fontWeight: roleFilter === r ? 'bold' : 'normal', cursor: 'pointer', fontFamily: 'inherit',
                border: `1.5px solid ${roleFilter === r ? C.gold : C.border}`,
                background: roleFilter === r ? C.gold : C.white,
                color: roleFilter === r ? C.white : C.gray,
              }}
            >
              {r === 'semua' ? 'Semua' : ROLE_LABELS[r]}
            </button>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filteredContacts.length === 0 ? (
          <div style={{ padding: '2rem 1rem', textAlign: 'center', color: C.grayLight, fontSize: '0.88rem' }}>
            Tidak ada kontak yang cocok.
          </div>
        ) : (
          filteredContacts.map((c) => (
            <div
              key={c.id}
              onClick={() => startConversation(c)}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px',
                cursor: 'pointer', borderBottom: `1px solid ${C.border}`,
              }}
            >
              <Avatar name={c.full_name} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: '700', color: C.dark, fontSize: '0.92rem' }}>{c.full_name}</div>
                <div style={{ marginTop: '2px' }}>
                  <RoleTag role={c.role} />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  // ─── Sub-render: jendela chat ───────────────────────────────────────────
  const renderThread = () => {
    if (!activeConversation) {
      return (
        <div
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: C.grayLight, fontSize: '0.92rem', flexDirection: 'column', gap: '8px',
          }}
        >
          <div style={{ fontSize: '2.5rem' }}>💬</div>
          <div>Pilih percakapan atau kontak untuk mulai chat</div>
        </div>
      );
    }
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Header thread */}
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px',
            borderBottom: `1px solid ${C.border}`, background: C.white,
          }}
        >
          {isMobile && (
            <button
              onClick={() => setShowThreadMobile(false)}
              style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: C.gray, padding: '6px', margin: '-6px 2px -6px -6px' }}
            >
              ←
            </button>
          )}
          <Avatar name={activeConversation.other.full_name} size={36} />
          <div>
            <div style={{ fontWeight: '700', color: C.dark, fontSize: '0.95rem' }}>{activeConversation.other.full_name}</div>
            <RoleTag role={activeConversation.other.role} />
          </div>
        </div>

        {/* Isi pesan */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', background: C.cream }}>
          {loadingThread ? (
            <div style={{ textAlign: 'center', color: C.grayLight, fontSize: '0.88rem' }}>Memuat pesan...</div>
          ) : chatMessages.length === 0 ? (
            <div style={{ textAlign: 'center', color: C.grayLight, fontSize: '0.88rem' }}>Belum ada pesan. Mulai percakapan!</div>
          ) : (
            chatMessages.map((m) => {
              const mine = m.sender_id === me.id;
              const showDelete = hoveredMsgId === m.id && canDeleteMessage(m);
              return (
                <div
                  key={m.id}
                  onMouseEnter={() => setHoveredMsgId(m.id)}
                  onMouseLeave={() => setHoveredMsgId((id) => (id === m.id ? null : id))}
                  onClick={() => canDeleteMessage(m) && setHoveredMsgId((id) => (id === m.id ? null : m.id))}
                  style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', alignItems: 'center', gap: '6px' }}
                >
                  {mine && showDelete && (
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteMessage(m); }}
                      disabled={deletingId === m.id}
                      title="Hapus pesan untuk semua"
                      style={{
                        background: 'none', border: 'none', color: C.grayLight, fontSize: '1rem',
                        cursor: deletingId === m.id ? 'not-allowed' : 'pointer', padding: '8px', order: -1,
                      }}
                    >
                      🗑️
                    </button>
                  )}
                  <div
                    style={{
                      maxWidth: '75%',
                      background: mine ? C.gold : C.white,
                      color: mine ? 'white' : C.dark,
                      padding: '9px 14px',
                      borderRadius: mine ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                      fontSize: '0.9rem',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                    }}
                  >
                    {m.is_deleted ? (
                      <span style={{ fontStyle: 'italic', opacity: 0.75 }}>🚫 Pesan ini telah dihapus</span>
                    ) : (
                      <>
                        {m.attachment_url && isImageType(m.attachment_type) && (
                          <a href={m.attachment_url} target="_blank" rel="noopener noreferrer">
                            <img
                              src={m.attachment_url}
                              alt={m.attachment_name || 'Lampiran gambar'}
                              style={{
                                display: 'block',
                                maxWidth: '100%',
                                maxHeight: '260px',
                                borderRadius: '10px',
                                marginBottom: m.content ? '6px' : 0,
                                objectFit: 'cover',
                              }}
                            />
                          </a>
                        )}
                        {m.attachment_url && !isImageType(m.attachment_type) && (
                          <a
                            href={m.attachment_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '8px 10px',
                              borderRadius: '10px',
                              background: mine ? 'rgba(255,255,255,0.18)' : C.goldLight,
                              textDecoration: 'none',
                              color: 'inherit',
                              marginBottom: m.content ? '6px' : 0,
                            }}
                          >
                            <span style={{ fontSize: '1.3rem' }}>{fileIconFor(m.attachment_name)}</span>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: '0.85rem', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {m.attachment_name || 'File'}
                              </div>
                              {!!m.attachment_size && (
                                <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>{formatFileSize(m.attachment_size)}</div>
                              )}
                            </div>
                          </a>
                        )}
                        {m.content}
                      </>
                    )}
                    <div
                      style={{
                        fontSize: '0.65rem',
                        marginTop: '4px',
                        opacity: 0.75,
                        textAlign: 'right',
                      }}
                    >
                      {formatClock(m.created_at)}
                    </div>
                  </div>
                  {!mine && showDelete && (
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteMessage(m); }}
                      disabled={deletingId === m.id}
                      title="Hapus pesan untuk semua"
                      style={{
                        background: 'none', border: 'none', color: C.grayLight, fontSize: '1rem',
                        cursor: deletingId === m.id ? 'not-allowed' : 'pointer', padding: '8px',
                      }}
                    >
                      🗑️
                    </button>
                  )}
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Preview lampiran yang dipilih */}
        {selectedFile && (
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px',
              borderTop: `1px solid ${C.border}`, background: C.goldLight,
            }}
          >
            {filePreviewUrl ? (
              <img
                src={filePreviewUrl}
                alt="Preview"
                style={{ width: 42, height: 42, borderRadius: '8px', objectFit: 'cover' }}
              />
            ) : (
              <div style={{ fontSize: '1.4rem' }}>{fileIconFor(selectedFile.name)}</div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: '600', color: C.dark, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedFile.name}
              </div>
              <div style={{ fontSize: '0.72rem', color: C.grayLight }}>
                {uploadingFile ? 'Mengunggah...' : formatFileSize(selectedFile.size)}
              </div>
            </div>
            <button
              onClick={removeSelectedFile}
              disabled={uploadingFile}
              style={{
                background: 'none', border: 'none', color: C.gray, fontSize: '1.1rem',
                cursor: uploadingFile ? 'not-allowed' : 'pointer', padding: '4px',
              }}
              aria-label="Hapus lampiran"
            >
              ✕
            </button>
          </div>
        )}

        {/* Composer */}
        <div
          style={{
            display: 'flex', gap: '8px', padding: '12px 16px', borderTop: `1px solid ${C.border}`, background: C.white,
            alignItems: 'flex-end', paddingBottom: isMobile ? 'max(12px, env(safe-area-inset-bottom))' : '12px',
          }}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={sending || uploadingFile}
            title="Lampirkan file"
            style={{
              background: 'transparent', border: `1.5px solid ${C.border}`, color: C.gray,
              width: '44px', height: '44px', minWidth: '44px', borderRadius: '50%',
              cursor: sending || uploadingFile ? 'not-allowed' : 'pointer', fontSize: '1.15rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            📎
          </button>
          <textarea
            ref={composerRef}
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={handleComposerKeyDown}
            placeholder="Tulis pesan..."
            rows={1}
            style={{
              flex: 1, padding: '11px 14px', borderRadius: '20px', border: `1.5px solid ${C.border}`,
              fontSize: '16px', fontFamily: 'inherit', outline: 'none', resize: 'none', boxSizing: 'border-box',
              maxHeight: '120px', overflowY: 'auto', lineHeight: 1.4,
            }}
          />
          <button
            onClick={sendMessage}
            disabled={sending || uploadingFile || (!messageText.trim() && !selectedFile)}
            style={{
              background: C.gold, border: 'none', color: 'white', padding: '0 20px', borderRadius: '999px',
              fontWeight: 'bold', height: '44px',
              cursor: sending || uploadingFile || (!messageText.trim() && !selectedFile) ? 'not-allowed' : 'pointer',
              opacity: sending || uploadingFile || (!messageText.trim() && !selectedFile) ? 0.6 : 1,
              fontFamily: 'inherit', fontSize: '0.9rem',
            }}
          >
            {uploadingFile ? '...' : 'Kirim'}
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.gray }}>
        ⏳ Memuat pesan...
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: C.cream, padding: isMobile ? '0' : '1.5rem 5%', boxSizing: 'border-box' }}>
      <Toast toast={toast} style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 400, width: 'auto', maxWidth: '320px' }} />
      {!isMobile && (
        <h1 style={{ fontSize: '1.8rem', color: C.dark, marginBottom: '1rem' }}>💬 Pesan</h1>
      )}
      <div
        style={{
          display: 'flex',
          background: C.white,
          borderRadius: isMobile ? 0 : '20px',
          border: isMobile ? 'none' : `1.5px solid ${C.border}`,
          overflow: 'hidden',
          height: isMobile ? '100dvh' : 'calc(100vh - 140px)',
          boxShadow: isMobile ? 'none' : '0 4px 16px rgba(0,0,0,0.06)',
        }}
      >
        {/* Sidebar */}
        {(!isMobile || !showThreadMobile) && (
          <div
            style={{
              width: isMobile ? '100%' : '320px',
              minWidth: isMobile ? undefined : '320px',
              borderRight: isMobile ? 'none' : `1.5px solid ${C.border}`,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}` }}>
              <button
                onClick={() => setSidebarTab('chats')}
                style={{
                  flex: 1, padding: '12px', border: 'none', background: 'transparent',
                  fontWeight: sidebarTab === 'chats' ? 'bold' : 'normal',
                  color: sidebarTab === 'chats' ? C.gold : C.gray,
                  borderBottom: sidebarTab === 'chats' ? `3px solid ${C.gold}` : '3px solid transparent',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Percakapan
              </button>
              <button
                onClick={() => setSidebarTab('contacts')}
                style={{
                  flex: 1, padding: '12px', border: 'none', background: 'transparent',
                  fontWeight: sidebarTab === 'contacts' ? 'bold' : 'normal',
                  color: sidebarTab === 'contacts' ? C.gold : C.gray,
                  borderBottom: sidebarTab === 'contacts' ? `3px solid ${C.gold}` : '3px solid transparent',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Kontak Baru
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {sidebarTab === 'chats' ? renderConversationList() : renderContactPicker()}
            </div>
          </div>
        )}

        {/* Thread */}
        {(!isMobile || showThreadMobile) && renderThread()}
      </div>
    </div>
  );
};

export default ChatMessages;