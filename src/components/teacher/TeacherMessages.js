import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

// ─── Warna ───────────────────────────────────────────────────────────────────
const C = {
  gold:    '#b4964b',
  green:   '#2d6a4f',
  dark:    '#171411',
  gray:    '#444242',
  cream:   '#f7f6f0',
  white:   '#ffffff',
  border:  '#e0ddd6',
  goldBg:  'rgba(180,150,75,0.08)',
  red:     '#e74c3c',
  lightRed: '#fff0f0',
};

// ─── Komponen Kecil ──────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const colors = {
    unread: { bg: '#ffebee', text: '#c62828' },
    read:   { bg: '#e8f5e9', text: '#2e7d32' },
  };
  const style = colors[status] || colors.unread;
  return (
    <span
      style={{
        background: style.bg,
        color: style.text,
        padding: '4px 12px',
        borderRadius: '40px',
        fontSize: '0.8rem',
        fontWeight: 'bold',
        display: 'inline-block',
      }}
    >
      {status === 'unread' ? 'Belum dibaca' : 'Sudah dibaca'}
    </span>
  );
};

const FilterChip = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    style={{
      padding: '6px 16px',
      borderRadius: '40px',
      fontSize: '0.85rem',
      fontWeight: active ? 'bold' : 'normal',
      cursor: 'pointer',
      fontFamily: 'inherit',
      border: `1.5px solid ${active ? C.gold : C.border}`,
      background: active ? C.gold : C.white,
      color: active ? C.white : C.gray,
      transition: 'all 0.2s',
    }}
  >
    {label}
  </button>
);

const TabButton = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    style={{
      padding: '10px 24px',
      border: 'none',
      background: 'transparent',
      fontWeight: active ? 'bold' : 'normal',
      color: active ? C.gold : C.gray,
      borderBottom: active ? `3px solid ${C.gold}` : '3px solid transparent',
      cursor: 'pointer',
      fontFamily: 'inherit',
      fontSize: '1rem',
      transition: 'all 0.2s',
    }}
  >
    {label}
  </button>
);

// ─── Komponen Utama ──────────────────────────────────────────────────────────
const TeacherMessages = () => {
  // ─── State ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('inbox');
  const [loading, setLoading] = useState(true);

  // State inbox
  const [messages, setMessages] = useState([]);
  const [filteredMessages, setFilteredMessages] = useState([]);
  const [filterStatus, setFilterStatus] = useState('semua');
  const [searchInbox, setSearchInbox] = useState('');

  // State modal
  const [showDetail, setShowDetail] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [updating, setUpdating] = useState(false);

  // State untuk form pesan baru
  const [newSubject, setNewSubject] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  // Identitas guru
  const [teacherId, setTeacherId] = useState(null);
  const [teacherName, setTeacherName] = useState('');
  const [teacherEmail, setTeacherEmail] = useState('');

  // ─── Ambil data ──────────────────────────────────────────────────────────
  const fetchMessages = async (uid) => {
    if (!uid) return;
    const { data, error } = await supabase
      .from('teacher_messages')
      .select('*')
      .eq('teacher_id', uid)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching messages:', error);
      alert('Gagal memuat pesan.');
    } else {
      setMessages(data || []);
      setFilteredMessages(data || []);
    }
  };

  const fetchProfile = async (uid) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', uid)
      .single();
    if (error) {
      console.error('Error fetching profile:', error);
    } else if (data) {
      setTeacherName(data.full_name || 'Guru');
      setTeacherEmail(data.email || '');
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id;
      if (!uid) {
        setLoading(false);
        return;
      }
      setTeacherId(uid);
      await fetchProfile(uid);
      await fetchMessages(uid);
      setLoading(false);
    };
    init();
  }, []);

  // ─── Filter inbox ──────────────────────────────────────────────────────
  useEffect(() => {
    let filtered = messages;
    if (filterStatus !== 'semua') {
      filtered = filtered.filter(item => item.status === filterStatus);
    }
    if (searchInbox.trim() !== '') {
      const term = searchInbox.toLowerCase();
      filtered = filtered.filter(item =>
        item.subject?.toLowerCase().includes(term) ||
        item.teacher_name?.toLowerCase().includes(term) ||
        (item.admin_reply && item.admin_reply.toLowerCase().includes(term))
      );
    }
    setFilteredMessages(filtered);
  }, [filterStatus, searchInbox, messages]);

  // ─── Buka detail ──────────────────────────────────────────────────────────
  const openDetail = (item) => {
    setSelectedMessage(item);
    setReplyText('');
    setShowDetail(true);
  };

  const closeDetail = () => {
    setShowDetail(false);
    setSelectedMessage(null);
    setReplyText('');
  };

  // ─── Tandai Dibaca ──────────────────────────────────────────────────────
  const markAsRead = async () => {
    if (!selectedMessage || selectedMessage.status === 'read') return;
    setUpdating(true);
    const { error } = await supabase
      .from('teacher_messages')
      .update({ status: 'read' })
      .eq('id', selectedMessage.id);
    setUpdating(false);
    if (error) {
      console.error('Error updating status:', error);
      alert('Gagal memperbarui status.');
      return;
    }
    const updated = messages.map(item =>
      item.id === selectedMessage.id ? { ...item, status: 'read' } : item
    );
    setMessages(updated);
    setFilteredMessages(prev =>
      prev.map(item => (item.id === selectedMessage.id ? { ...item, status: 'read' } : item))
    );
    setSelectedMessage(prev => ({ ...prev, status: 'read' }));
    alert('Pesan ditandai telah dibaca.');
  };

  // ─── Kirim Balasan (guru → admin) ──────────────────────────────────────
  const sendReply = async () => {
    if (!selectedMessage) return;
    if (!replyText.trim()) {
      alert('Silakan tulis balasan.');
      return;
    }
    setUpdating(true);
    const { error } = await supabase
      .from('teacher_messages')
      .insert([{
        teacher_id: teacherId,
        teacher_name: teacherName,
        teacher_email: teacherEmail,
        subject: `Re: ${selectedMessage.subject}`,
        message: replyText.trim(),
        is_from_admin: false, // pesan dari guru ke admin
        status: 'read',
      }]);
    setUpdating(false);
    if (error) {
      console.error('Error sending reply:', error);
      alert('Gagal mengirim balasan.');
      return;
    }
    await fetchMessages(teacherId);
    setReplyText('');
    closeDetail();
    alert('Balasan berhasil dikirim ke admin!');
  };

  // ─── Kirim Pesan Baru (guru → admin) ──────────────────────────────────
  const sendNewMessage = async () => {
    if (!newSubject.trim() || !newMessage.trim()) {
      alert('Subjek dan isi pesan harus diisi.');
      return;
    }
    setSending(true);
    const { error } = await supabase
      .from('teacher_messages')
      .insert([{
        teacher_id: teacherId,
        teacher_name: teacherName,
        teacher_email: teacherEmail,
        subject: newSubject.trim(),
        message: newMessage.trim(),
        is_from_admin: false,
        status: 'read',
      }]);
    setSending(false);
    if (error) {
      console.error('Error sending message:', error);
      alert('Gagal mengirim pesan.');
      return;
    }
    setNewSubject('');
    setNewMessage('');
    alert('Pesan berhasil dikirim ke admin!');
    await fetchMessages(teacherId);
    setActiveTab('inbox');
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: C.cream, padding: '1.5rem 5%' }}>
      <h1 style={{ fontSize: '1.8rem', color: C.dark, marginBottom: '1rem' }}>💬 Pesan & Komunikasi</h1>

      <div style={{ borderBottom: `1px solid ${C.border}`, marginBottom: '1.5rem' }}>
        <TabButton label="📨 Pesan Masuk" active={activeTab === 'inbox'} onClick={() => setActiveTab('inbox')} />
        <TabButton label="✏️ Kirim Pesan" active={activeTab === 'new'} onClick={() => setActiveTab('new')} />
      </div>

      {/* ─── Tab: Pesan Masuk ───────────────────────────────────────────── */}
      {activeTab === 'inbox' && (
        <>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <input
              type="text"
              placeholder="Cari berdasarkan subjek atau pengirim..."
              value={searchInbox}
              onChange={e => setSearchInbox(e.target.value)}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '10px',
                border: `1.5px solid ${C.border}`,
                fontSize: '0.92rem',
                outline: 'none',
                fontFamily: 'inherit',
                minWidth: '200px',
                background: C.white,
              }}
            />
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <FilterChip label="Semua" active={filterStatus === 'semua'} onClick={() => setFilterStatus('semua')} />
              <FilterChip label="Belum dibaca" active={filterStatus === 'unread'} onClick={() => setFilterStatus('unread')} />
              <FilterChip label="Sudah dibaca" active={filterStatus === 'read'} onClick={() => setFilterStatus('read')} />
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: C.gray }}>⏳ Memuat data...</div>
          ) : filteredMessages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: C.gray, background: C.white, borderRadius: '24px' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
              <p>Tidak ada pesan.</p>
            </div>
          ) : (
            <div style={{ background: C.white, borderRadius: '24px', overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead style={{ background: C.cream, borderBottom: `1px solid ${C.border}` }}>
                    <tr>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 'bold', color: C.gray }}>Pengirim</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 'bold', color: C.gray }}>Subjek</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 'bold', color: C.gray }}>Status</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 'bold', color: C.gray }}>Tanggal</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 'bold', color: C.gray }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMessages.map(item => {
                      const isFromAdmin = item.is_from_admin;
                      const sender = isFromAdmin ? 'Admin' : 'Saya';
                      return (
                        <tr key={item.id} style={{ borderBottom: `1px solid ${C.border}`, transition: 'background 0.2s' }}
                          onMouseEnter={e => e.currentTarget.style.background = C.goldBg}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <td style={{ padding: '12px 16px', fontWeight: 'bold', color: isFromAdmin ? C.gold : C.gray }}>
                            {sender}
                          </td>
                          <td style={{ padding: '12px 16px', color: C.dark }}>{item.subject}</td>
                          <td style={{ padding: '12px 16px' }}><StatusBadge status={item.status || 'unread'} /></td>
                          <td style={{ padding: '12px 16px', color: C.gray, fontSize: '0.8rem' }}>
                            {item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID') : '-'}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            <button
                              onClick={() => openDetail(item)}
                              style={{
                                background: C.gold,
                                border: 'none',
                                color: 'white',
                                padding: '6px 14px',
                                borderRadius: '40px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                                fontFamily: 'inherit',
                              }}
                            >
                              Detail
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── Tab: Kirim Pesan ───────────────────────────────────────────── */}
      {activeTab === 'new' && (
        <div style={{ background: C.white, borderRadius: '24px', padding: '2rem', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
          <h2 style={{ marginTop: 0, color: C.dark }}>Kirim Pesan ke Admin</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px', color: C.dark }}>Subjek</label>
              <input
                type="text"
                value={newSubject}
                onChange={e => setNewSubject(e.target.value)}
                placeholder="Masukkan subjek..."
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: `1.5px solid ${C.border}`,
                  fontSize: '0.92rem',
                  fontFamily: 'inherit',
                  background: C.white,
                  outline: 'none',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px', color: C.dark }}>Isi Pesan</label>
              <textarea
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                rows={5}
                placeholder="Tulis pesan untuk admin..."
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: `1.5px solid ${C.border}`,
                  fontSize: '0.92rem',
                  fontFamily: 'inherit',
                  background: C.white,
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
            </div>
            <div>
              <button
                onClick={sendNewMessage}
                disabled={sending}
                style={{
                  background: C.gold,
                  border: 'none',
                  color: 'white',
                  padding: '10px 24px',
                  borderRadius: '40px',
                  fontWeight: 'bold',
                  cursor: sending ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                  fontSize: '0.95rem',
                  opacity: sending ? 0.6 : 1,
                }}
              >
                {sending ? '⏳ Mengirim...' : 'Kirim Pesan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal Detail ────────────────────────────────────────────────── */}
      {showDetail && selectedMessage && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={closeDetail}
        >
          <div
            style={{
              background: C.white,
              borderRadius: '24px',
              maxWidth: '700px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '2rem',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              position: 'relative',
            }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={closeDetail}
              style={{
                position: 'absolute',
                top: '12px',
                right: '16px',
                background: 'none',
                border: 'none',
                fontSize: '1.8rem',
                cursor: 'pointer',
                color: C.gray,
              }}
            >
              ✕
            </button>

            <h2 style={{ marginTop: 0, color: C.dark, borderBottom: `2px solid ${C.gold}`, paddingBottom: '0.5rem' }}>
              Detail Pesan
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
              <div><strong>Subjek:</strong> {selectedMessage.subject}</div>
              <div><strong>Pengirim:</strong> {selectedMessage.is_from_admin ? 'Admin' : 'Saya'}</div>
              <div><strong>Status:</strong> <StatusBadge status={selectedMessage.status || 'unread'} /></div>
              <div><strong>Tanggal:</strong> {selectedMessage.created_at ? new Date(selectedMessage.created_at).toLocaleString('id-ID') : '-'}</div>
              {selectedMessage.message && (
                <>
                  <div><strong>Pesan:</strong></div>
                  <div
                    style={{
                      background: C.cream,
                      padding: '12px 16px',
                      borderRadius: '12px',
                      whiteSpace: 'pre-wrap',
                      fontSize: '0.92rem',
                      color: C.dark,
                    }}
                  >
                    {selectedMessage.message}
                  </div>
                </>
              )}
              {selectedMessage.admin_reply && (
                <>
                  <div><strong>Balasan Admin:</strong></div>
                  <div
                    style={{
                      background: C.goldBg,
                      padding: '12px 16px',
                      borderRadius: '12px',
                      whiteSpace: 'pre-wrap',
                      fontSize: '0.92rem',
                      color: C.dark,
                      border: `1px solid ${C.gold}`,
                    }}
                  >
                    {selectedMessage.admin_reply}
                  </div>
                </>
              )}
            </div>

            <hr style={{ border: `1px solid ${C.border}`, margin: '1rem 0' }} />

            {selectedMessage.status === 'unread' && (
              <div style={{ marginBottom: '1rem' }}>
                <button
                  onClick={markAsRead}
                  disabled={updating}
                  style={{
                    background: C.green,
                    border: 'none',
                    color: 'white',
                    padding: '8px 18px',
                    borderRadius: '40px',
                    fontWeight: 'bold',
                    cursor: updating ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  ✓ Tandai Dibaca
                </button>
              </div>
            )}

            {selectedMessage.is_from_admin && (
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px', color: C.dark }}>Balas ke Admin</label>
                <textarea
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  rows={3}
                  placeholder="Tulis balasan untuk admin..."
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: `1.5px solid ${C.border}`,
                    fontSize: '0.92rem',
                    fontFamily: 'inherit',
                    background: C.white,
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
                <button
                  onClick={sendReply}
                  disabled={updating}
                  style={{
                    marginTop: '8px',
                    background: C.gold,
                    border: 'none',
                    color: 'white',
                    padding: '8px 20px',
                    borderRadius: '40px',
                    fontWeight: 'bold',
                    cursor: updating ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {updating ? '⏳ Mengirim...' : 'Kirim Balasan'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherMessages;