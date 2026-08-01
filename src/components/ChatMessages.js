import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';

// ─── Warna ───────────────────────────────────────────────────────────────────
const C = {
  gold: '#b4964b',
  green: '#2d6a4f',
  dark: '#171411',
  gray: '#444242',
  grayLight: '#8a8782',
  cream: '#f7f6f0',
  white: '#ffffff',
  border: '#e0ddd6',
  goldBg: 'rgba(180,150,75,0.10)',
  goldLight: 'rgba(180,150,75,0.06)',
};

const MOBILE_BREAKPOINT = 768;

const ROLE_LABELS = {
  student: 'Siswa',
  teacher: 'Guru',
  admin: 'Admin',
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

  // Di mobile: apakah sedang menampilkan panel chat (true) atau daftar (false)
  const [showThreadMobile, setShowThreadMobile] = useState(false);

  const messagesEndRef = useRef(null);

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
        alert('Gagal memulai percakapan.');
        return;
      }
      convRow = created;
    }

    const enrichedConv = { ...convRow, other: contact, unreadCount: 0 };
    setConversations((prev) => (prev.find((c) => c.id === enrichedConv.id) ? prev : [enrichedConv, ...prev]));
    setSidebarTab('chats');
    await openConversation(enrichedConv);
  };

  // ─── Kirim pesan ────────────────────────────────────────────────────────
  const sendMessage = async () => {
    if (!messageText.trim() || !activeConversation || !me || sending) return;
    const content = messageText.trim();
    setSending(true);
    const { data, error } = await supabase
      .from('messages')
      .insert([{ conversation_id: activeConversation.id, sender_id: me.id, content, is_read: false }])
      .select()
      .single();
    setSending(false);
    if (error) {
      console.error('Gagal mengirim pesan:', error);
      alert('Gagal mengirim pesan.');
      return;
    }
    setChatMessages((prev) => [...prev, data]);
    setMessageText('');

    const nowIso = new Date().toISOString();
    const { error: updErr } = await supabase
      .from('conversations')
      .update({ last_message: content, last_message_at: nowIso })
      .eq('id', activeConversation.id);
    if (updErr) console.error('Gagal memperbarui ringkasan percakapan:', updErr);

    setConversations((prev) =>
      prev
        .map((c) => (c.id === activeConversation.id ? { ...c, last_message: content, last_message_at: nowIso } : c))
        .sort((a, b) => new Date(b.last_message_at || b.created_at) - new Date(a.last_message_at || a.created_at))
    );
  };

  const handleComposerKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
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
              style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: C.gray, padding: 0 }}
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
              return (
                <div key={m.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
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
                    {m.content}
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
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Composer */}
        <div style={{ display: 'flex', gap: '8px', padding: '12px 16px', borderTop: `1px solid ${C.border}`, background: C.white }}>
          <textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={handleComposerKeyDown}
            placeholder="Tulis pesan..."
            rows={1}
            style={{
              flex: 1, padding: '10px 14px', borderRadius: '20px', border: `1.5px solid ${C.border}`,
              fontSize: '16px', fontFamily: 'inherit', outline: 'none', resize: 'none', boxSizing: 'border-box',
            }}
          />
          <button
            onClick={sendMessage}
            disabled={sending || !messageText.trim()}
            style={{
              background: C.gold, border: 'none', color: 'white', padding: '0 20px', borderRadius: '999px',
              fontWeight: 'bold', cursor: sending || !messageText.trim() ? 'not-allowed' : 'pointer',
              opacity: sending || !messageText.trim() ? 0.6 : 1, fontFamily: 'inherit', fontSize: '0.9rem',
            }}
          >
            Kirim
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
          height: isMobile ? '100vh' : 'calc(100vh - 140px)',
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